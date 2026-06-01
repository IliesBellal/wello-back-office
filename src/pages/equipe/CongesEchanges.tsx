/**
 * Congés & Échanges — gestion des leave-requests et shift-swap-requests.
 *
 * Voir docs/api/PLANNING_AND_USERS_INTEGRATION_GUIDE.md :
 *   - GET/POST/PATCH/DELETE /planning/leave-requests
 *   - GET/POST/PATCH/DELETE /planning/shift-swap-requests
 *
 * Règles clés :
 *   - Approve leave : l'API refuse s'il reste des shifts affectés à l'employé sur la période.
 *   - Approve swap : transaction qui réaffecte les deux shifts (échange).
 *   - PlanningSettings.shift_swap_approval_mode pilote le bouton d'approbation :
 *       * manager_required → manager peut approuver/rejeter ;
 *       * target_employee_required → seul l'employé cible peut approuver.
 */

import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, RefreshCw } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageContainer } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  planningLeaveApi,
  planningSettingsApi,
  planningSwapApi,
} from "@/services/welloApi";
import type {
  Employee,
  LeaveStatus,
  PlanningLeaveRequest,
  PlanningShiftSwapRequest,
  ShiftSwapStatus,
} from "@/types/planning";

import { LeaveRequestSheet } from "@/components/team/conges/LeaveRequestSheet";
import { ShiftSwapSheet } from "@/components/team/conges/ShiftSwapSheet";
import {
  LeaveTypeBadge,
  StatusBadge,
} from "@/components/team/conges/statusBadges";
import { STATUS_OPTIONS } from "@/components/team/conges/statusOptions";

export default function CongesEchanges() {
  const { canManagePlannings } = usePermissions();
  if (!canManagePlannings) return <Navigate to="/" replace />;
  return <CongesEchangesContent />;
}

function CongesEchangesContent() {
  const [tab, setTab] = useState<"conges" | "echanges">("conges");

  // Common queries
  const settingsQ = useQuery({
    queryKey: qk.planningSettings.all,
    queryFn: () => planningSettingsApi.get(),
  });
  const employeesQ = useQuery({
    queryKey: qk.planningEmployees.list({ active: true }),
    queryFn: () => planningEmployeesApi.list({ active: true }),
  });
  const employees: Employee[] = employeesQ.data?.items ?? [];

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Congés &amp; échanges</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gérez les demandes de congés et les échanges de shifts de vos équipes.
            </p>
          </div>
        }
      >
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="conges">Congés</TabsTrigger>
            <TabsTrigger value="echanges">Échanges</TabsTrigger>
          </TabsList>

          <TabsContent value="conges" className="mt-4">
            <LeavesTab employees={employees} />
          </TabsContent>

          <TabsContent value="echanges" className="mt-4">
            <SwapsTab
              employees={employees}
              approvalMode={settingsQ.data?.shift_swap_approval_mode ?? null}
            />
          </TabsContent>
        </Tabs>
      </PageContainer>
    </DashboardLayout>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab : Congés
// ══════════════════════════════════════════════════════════════════════════════

function LeavesTab({ employees }: { employees: Employee[] }) {
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "all">("all");
  const [selected, setSelected] = useState<PlanningLeaveRequest | null>(null);
  const [sheetMode, setSheetMode] = useState<"view" | "create">("view");
  const [sheetOpen, setSheetOpen] = useState(false);

  type LeaveSortField = "employee" | "type" | "period" | "status";
  const [sortField, setSortField] = useState<LeaveSortField>("period");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const handleSort = (f: LeaveSortField) => {
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(f); setSortDir("asc"); }
  };

  const filters = useMemo(
    () => (statusFilter === "all" ? {} : { status: statusFilter }),
    [statusFilter],
  );

  const listQ = useQuery({
    queryKey: qk.planningLeave.list(filters),
    queryFn: () => planningLeaveApi.list(filters),
  });

  const employeeById = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees],
  );

  const rows = useMemo(() => {
    const list = listQ.data?.items ?? [];
    const dirMul = sortDir === "asc" ? 1 : -1;
    const cmp = (a: PlanningLeaveRequest, b: PlanningLeaveRequest): number => {
      switch (sortField) {
        case "employee": {
          const ea = employeeById.get(a.employee_id);
          const eb = employeeById.get(b.employee_id);
          const na = ea ? `${ea.last_name} ${ea.first_name}`.toLowerCase() : a.employee_id;
          const nb = eb ? `${eb.last_name} ${eb.first_name}`.toLowerCase() : b.employee_id;
          return na.localeCompare(nb);
        }
        case "type":
          return (a.leave_type ?? "").localeCompare(b.leave_type ?? "");
        case "period":
          return a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0;
        case "status":
          return a.status.localeCompare(b.status);
      }
    };
    return [...list].sort((a, b) => cmp(a, b) * dirMul);
  }, [listQ.data?.items, sortField, sortDir, employeeById]);

  function openCreate() {
    setSelected(null);
    setSheetMode("create");
    setSheetOpen(true);
  }
  function openView(req: PlanningLeaveRequest) {
    setSelected(req);
    setSheetMode("view");
    setSheetOpen(true);
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as LeaveStatus | "all")}
          >
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => listQ.refetch()}
            disabled={listQ.isFetching}
          >
            <RefreshCw className={"mr-2 h-4 w-4 " + (listQ.isFetching ? "animate-spin" : "")} />
            Actualiser
          </Button>
        </div>
        <Button size="sm" onClick={openCreate} disabled={employees.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle demande
        </Button>
      </div>

      {listQ.isLoading ? (
        <SkeletonRows />
      ) : listQ.isError ? (
        <ErrorState onRetry={() => listQ.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState label="Aucune demande de congé." />
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                <SortableHead field="employee" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Employé</SortableHead>
                <SortableHead field="type" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Type</SortableHead>
                <SortableHead field="period" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Période</SortableHead>
                <SortableHead field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Statut</SortableHead>
                <TableHead className="font-semibold">Motif</TableHead>
                <TableHead className="font-semibold">Traité par</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const emp = employeeById.get(r.employee_id);
                return (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => openView(r)}
                  >
                    <TableCell className="font-medium">
                      {emp ? `${emp.first_name} ${emp.last_name}` : (
                        <span className="font-mono text-xs">{r.employee_id}</span>
                      )}
                    </TableCell>
                    <TableCell><LeaveTypeBadge value={r.leave_type} /></TableCell>
                    <TableCell className="text-xs">
                      <span className="capitalize">
                        {format(parseISO(r.start_date), "d MMM", { locale: fr })}
                      </span>
                      {" → "}
                      <span className="capitalize">
                        {format(parseISO(r.end_date), "d MMM yyyy", { locale: fr })}
                      </span>
                    </TableCell>
                    <TableCell><StatusBadge value={r.status} /></TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                      {r.reason || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.processed_by_user_id ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      <LeaveRequestSheet
        open={sheetOpen}
        mode={sheetMode}
        request={selected}
        employees={employees}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setSelected(null);
        }}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab : Échanges
// ══════════════════════════════════════════════════════════════════════════════

function SwapsTab({
  employees,
  approvalMode,
}: {
  employees: Employee[];
  approvalMode: import("@/types/planning").ShiftSwapApprovalMode | null;
}) {
  const [statusFilter, setStatusFilter] = useState<ShiftSwapStatus | "all">("all");
  const [selected, setSelected] = useState<PlanningShiftSwapRequest | null>(null);
  const [sheetMode, setSheetMode] = useState<"view" | "create">("view");
  const [sheetOpen, setSheetOpen] = useState(false);

  type SwapSortField = "requester" | "target" | "status";
  const [sortField, setSortField] = useState<SwapSortField>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const handleSort = (f: SwapSortField) => {
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(f); setSortDir("asc"); }
  };

  const filters = useMemo(
    () => (statusFilter === "all" ? {} : { status: statusFilter }),
    [statusFilter],
  );

  const listQ = useQuery({
    queryKey: qk.planningSwaps.list(filters),
    queryFn: () => planningSwapApi.list(filters),
  });

  const employeeById = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees],
  );

  const rows = useMemo(() => {
    const list = listQ.data?.items ?? [];
    const dirMul = sortDir === "asc" ? 1 : -1;
    const nameOf = (id: string) => {
      const e = employeeById.get(id);
      return e ? `${e.last_name} ${e.first_name}`.toLowerCase() : id;
    };
    const cmp = (a: PlanningShiftSwapRequest, b: PlanningShiftSwapRequest): number => {
      switch (sortField) {
        case "requester":
          return nameOf(a.requester_employee_id).localeCompare(nameOf(b.requester_employee_id));
        case "target":
          return nameOf(a.target_employee_id).localeCompare(nameOf(b.target_employee_id));
        case "status":
          return a.status.localeCompare(b.status);
      }
    };
    return [...list].sort((a, b) => cmp(a, b) * dirMul);
  }, [listQ.data?.items, sortField, sortDir, employeeById]);

  function openCreate() {
    setSelected(null);
    setSheetMode("create");
    setSheetOpen(true);
  }
  function openView(req: PlanningShiftSwapRequest) {
    setSelected(req);
    setSheetMode("view");
    setSheetOpen(true);
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as ShiftSwapStatus | "all")}
          >
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {approvalMode && (
            <span className="inline-flex items-center rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">
              Approbation :{" "}
              {approvalMode === "manager_required" ? "Manager" : "Employé cible"}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => listQ.refetch()}
            disabled={listQ.isFetching}
          >
            <RefreshCw className={"mr-2 h-4 w-4 " + (listQ.isFetching ? "animate-spin" : "")} />
            Actualiser
          </Button>
        </div>
        <Button size="sm" onClick={openCreate} disabled={employees.length < 2}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle demande
        </Button>
      </div>

      {listQ.isLoading ? (
        <SkeletonRows />
      ) : listQ.isError ? (
        <ErrorState onRetry={() => listQ.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState label="Aucune demande d'échange." />
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                <SortableHead field="requester" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Demandeur</SortableHead>
                <TableHead className="font-semibold">Shift demandeur</TableHead>
                <SortableHead field="target" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Cible</SortableHead>
                <TableHead className="font-semibold">Shift cible</TableHead>
                <SortableHead field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Statut</SortableHead>
                <TableHead className="font-semibold">Motif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const requester = employeeById.get(r.requester_employee_id);
                const target = employeeById.get(r.target_employee_id);
                return (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => openView(r)}
                  >
                    <TableCell className="font-medium">
                      {requester ? `${requester.first_name} ${requester.last_name}` : (
                        <span className="font-mono text-xs">{r.requester_employee_id}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{r.requester_shift_id}</span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {target ? `${target.first_name} ${target.last_name}` : (
                        <span className="font-mono text-xs">{r.target_employee_id}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{r.target_shift_id}</span>
                    </TableCell>
                    <TableCell><StatusBadge value={r.status} /></TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                      {r.reason || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      <ShiftSwapSheet
        open={sheetOpen}
        mode={sheetMode}
        request={selected}
        employees={employees}
        approvalMode={approvalMode}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setSelected(null);
        }}
      />
    </>
  );
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────

type SortDir = "asc" | "desc";

function SortableHead<F extends string>({
  field,
  sortField,
  sortDir,
  onSort,
  children,
}: {
  field: F;
  sortField: F;
  sortDir: SortDir;
  onSort: (f: F) => void;
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

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border bg-muted/20 py-12 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="py-12 text-center">
      <p className="mb-3 text-sm text-destructive">Erreur lors du chargement.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}
