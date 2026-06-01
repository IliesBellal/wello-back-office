/**
 * Pointages — page de consultation des time-entries.
 *
 * NB API (cf. docs/api/PLANNING_AND_USERS_INTEGRATION_GUIDE.md §Time entries) :
 *   - aucun endpoint global ne liste tous les time-entries d'un merchant ;
 *   - on agrège donc en parallèle GET /planning/employees/{id}/time-entries
 *     pour chaque employee actif, avec un garde-fou de volume.
 *   - TODO (§8) : remplacer par GET /planning/time-entries dès qu'il existe.
 */

import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { endOfDay, format, parseISO, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Filter, History, Plus, RefreshCw } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageContainer } from "@/components/shared";
import { AdvancedDatePicker } from "@/components/shared/AdvancedDatePicker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { usePermissions } from "@/hooks/usePermissions";
import { qk } from "@/lib/queryKeys";
import {
  planningEmployeesApi,
  planningSettingsApi,
  planningTimeEntriesApi,
} from "@/services/welloApi";
import type { Employee, PlanningTimeEntry } from "@/types/planning";

import {
  SourceBadge,
  TimeEntryDetailSheet,
} from "@/components/team/pointages/TimeEntryDetailSheet";
import { AddTimeEntryDialog } from "@/components/team/pointages/AddTimeEntryDialog";
import { formatTimeEntryDuration } from "@/components/team/pointages/timeEntryUtils";

// Cap how many employees we fan-out queries for in one shot. Above this we
// truncate and warn the user via the banner.
const MAX_PARALLEL_EMPLOYEES = 50;

type SortField =
  | "employee"
  | "date"
  | "clock_in"
  | "clock_out"
  | "duration"
  | "source";
type SortDir = "asc" | "desc";

function durationMs(e: PlanningTimeEntry): number {
  if (!e.clock_out_at) return Number.POSITIVE_INFINITY; // en cours => trie en haut quand desc
  return new Date(e.clock_out_at).getTime() - new Date(e.clock_in_at).getTime();
}

export default function Pointages() {
  const { canManagePlannings } = usePermissions();
  if (!canManagePlannings) return <Navigate to="/" replace />;
  return <PointagesContent />;
}

function PointagesContent() {
  // ── Filters ──────────────────────────────────────────────────────────────
  const [range, setRange] = useState<{ from: Date; to: Date }>(() => {
    const today = new Date();
    return { from: today, to: today };
  });
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");

  // ── Selection ────────────────────────────────────────────────────────────
  const [selectedEntry, setSelectedEntry] = useState<PlanningTimeEntry | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);  const [addOpen, setAddOpen] = useState(false);
  // ── Sort ─────────────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const handleSort = (f: SortField) => {
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(f);
      setSortDir("asc");
    }
  };

  // ── Settings (needed by the sheet to gate manual actions) ───────────────
  const settingsQ = useQuery({
    queryKey: qk.planningSettings.all,
    queryFn: () => planningSettingsApi.get(),
  });

  // ── Employees ────────────────────────────────────────────────────────────
  const employeesQ = useQuery({
    queryKey: qk.planningEmployees.list({ active: true }),
    queryFn: () => planningEmployeesApi.list({ active: true }),
  });

  const allEmployees: Employee[] = useMemo(
    () => employeesQ.data?.items ?? [],
    [employeesQ.data?.items],
  );
  const truncated = allEmployees.length > MAX_PARALLEL_EMPLOYEES;
  const employees = useMemo(
    () => (truncated ? allEmployees.slice(0, MAX_PARALLEL_EMPLOYEES) : allEmployees),
    [allEmployees, truncated],
  );

  // ── Fan-out: time-entries per active employee ───────────────────────────
  const fetchTargets = useMemo(() => {
    if (employeeFilter !== "all") {
      return employees.filter((e) => e.id === employeeFilter);
    }
    return employees;
  }, [employees, employeeFilter]);

  const entriesQueries = useQueries({
    queries: fetchTargets.map((emp) => ({
      queryKey: qk.planningEmployees.timeEntries(emp.id),
      queryFn: () => planningTimeEntriesApi.list(emp.id),
      enabled: !employeesQ.isLoading,
      staleTime: 30_000,
    })),
  });

  const isAggregating =
    employeesQ.isLoading || entriesQueries.some((q) => q.isLoading);
  const hasError =
    employeesQ.isError || entriesQueries.some((q) => q.isError);

  // ── Aggregation + client-side filter on the date range ──────────────────
  const rangeFromMs = useMemo(() => startOfDay(range.from).getTime(), [range.from]);
  const rangeToMs = useMemo(() => endOfDay(range.to).getTime(), [range.to]);

  const employeeById = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const e of employees) map.set(e.id, e);
    return map;
  }, [employees]);

  const rows = useMemo(() => {
    const flat: PlanningTimeEntry[] = [];
    for (const q of entriesQueries) {
      if (q.data) flat.push(...q.data);
    }
    const filtered = flat.filter((e) => {
      const t = new Date(e.clock_in_at).getTime();
      return t >= rangeFromMs && t <= rangeToMs;
    });
    const dirMul = sortDir === "asc" ? 1 : -1;
    const cmp = (a: PlanningTimeEntry, b: PlanningTimeEntry): number => {
      switch (sortField) {
        case "employee": {
          const ea = employeeById.get(a.employee_id);
          const eb = employeeById.get(b.employee_id);
          const na = ea ? `${ea.last_name} ${ea.first_name}`.toLowerCase() : a.employee_id;
          const nb = eb ? `${eb.last_name} ${eb.first_name}`.toLowerCase() : b.employee_id;
          return na.localeCompare(nb);
        }
        case "date":
        case "clock_in":
          return a.clock_in_at < b.clock_in_at ? -1 : a.clock_in_at > b.clock_in_at ? 1 : 0;
        case "clock_out": {
          // ouverts (null) en bas en asc, en haut en desc
          if (!a.clock_out_at && !b.clock_out_at) return 0;
          if (!a.clock_out_at) return 1;
          if (!b.clock_out_at) return -1;
          return a.clock_out_at < b.clock_out_at ? -1 : a.clock_out_at > b.clock_out_at ? 1 : 0;
        }
        case "duration":
          return durationMs(a) - durationMs(b);
        case "source":
          return (a.attendance_source ?? "").localeCompare(b.attendance_source ?? "");
      }
    };
    return filtered.sort((a, b) => cmp(a, b) * dirMul);
  }, [entriesQueries, rangeFromMs, rangeToMs, sortField, sortDir, employeeById]);

  function handleRowClick(entry: PlanningTimeEntry) {
    setSelectedEntry(entry);
    setSheetOpen(true);
  }

  function handleRefresh() {
    employeesQ.refetch();
    entriesQueries.forEach((q) => q.refetch());
  }

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Pointages</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Historique des entrées et sorties de vos équipes.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isAggregating}>
              <RefreshCw className={"h-4 w-4 mr-2 " + (isAggregating ? "animate-spin" : "")} />
              Actualiser
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un pointage
            </Button>
          </div>
        }
      >
        {/* ── Toolbar ─────────────────────────────────────────────────── */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <AdvancedDatePicker value={range} onChange={setRange} />
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="h-9 w-[220px]">
                <SelectValue placeholder="Tous les employés" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les employés</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.first_name} {e.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            {rows.length} pointage{rows.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* ── Volume guard banner ─────────────────────────────────────── */}
        {truncated && (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              Plus de {MAX_PARALLEL_EMPLOYEES} employés actifs détectés : pour limiter le
              nombre de requêtes parallèles, seuls les {MAX_PARALLEL_EMPLOYEES} premiers sont
              chargés. Filtrez par employé pour cibler les autres.
            </div>
          </div>
        )}

        {/* ── Table ───────────────────────────────────────────────────── */}
        {isAggregating ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : hasError ? (
          <div className="py-12 text-center">
            <p className="mb-3 text-sm text-destructive">
              Erreur lors du chargement des pointages.
            </p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Réessayer
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-md border bg-muted/20 py-12 text-center text-sm text-muted-foreground">
            Aucun pointage sur la période sélectionnée.
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  <SortableHead field="employee" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Employé</SortableHead>
                  <SortableHead field="date" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Date</SortableHead>
                  <SortableHead field="clock_in" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Entrée</SortableHead>
                  <SortableHead field="clock_out" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Sortie</SortableHead>
                  <SortableHead field="duration" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Durée</SortableHead>
                  <SortableHead field="source" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Source</SortableHead>
                  <TableHead className="font-semibold">Shift</TableHead>
                  <TableHead className="font-semibold">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => {
                  const emp = employeeById.get(e.employee_id);
                  const note = e.clock_out_note ?? e.clock_in_note ?? "";
                  return (
                    <TableRow
                      key={e.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(e)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>
                            {emp ? `${emp.first_name} ${emp.last_name}` : <span className="font-mono text-xs">{e.employee_id}</span>}
                          </span>
                          {e.modified_by && (
                            <Badge
                              variant="outline"
                              className="gap-1 border-amber-300 bg-amber-50 text-[10px] text-amber-900"
                              title={
                                e.modification_reason
                                  ? `Corrigé par ${e.modified_by} — ${e.modification_reason}`
                                  : `Corrigé par ${e.modified_by}`
                              }
                            >
                              <History className="h-3 w-3" /> Corrigé
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">
                        {format(parseISO(e.clock_in_at), "EEE d MMM", { locale: fr })}
                      </TableCell>
                      <TableCell>{format(parseISO(e.clock_in_at), "HH:mm")}</TableCell>
                      <TableCell>
                        {e.clock_out_at ? (
                          format(parseISO(e.clock_out_at), "HH:mm")
                        ) : (
                          <span className="italic text-muted-foreground">en cours</span>
                        )}
                      </TableCell>
                      <TableCell>{formatTimeEntryDuration(e)}</TableCell>
                      <TableCell>
                        <SourceBadge value={e.attendance_source} />
                      </TableCell>
                      <TableCell>
                        {e.shift_id ? (
                          <span className="font-mono text-xs text-muted-foreground">{e.shift_id}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                        {note || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </div>
        )}
      </PageContainer>

      <TimeEntryDetailSheet
        open={sheetOpen}
        entry={selectedEntry}
        employee={selectedEntry ? employeeById.get(selectedEntry.employee_id) ?? null : null}
        settingsAttendanceSource={settingsQ.data?.attendance_source ?? null}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setSelectedEntry(null);
        }}
      />

      <AddTimeEntryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        employees={employees}
        defaultEmployeeId={employeeFilter !== "all" ? employeeFilter : null}
        settingsAttendanceSource={settingsQ.data?.attendance_source ?? null}
      />
    </DashboardLayout>
  );
}

// ─── Sortable header helper ──────────────────────────────────────────────────

function SortableHead({
  field,
  sortField,
  sortDir,
  onSort,
  children,
}: {
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
  children: React.ReactNode;
}) {
  const active = sortField === field;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className="cursor-pointer hover:bg-muted font-semibold">
      <button
        type="button"
        onClick={() => onSort(field)}
        className="flex items-center gap-2 hover:text-primary transition-colors"
      >
        {children}
        <Icon className="h-4 w-4" />
      </button>
    </TableHead>
  );
}
