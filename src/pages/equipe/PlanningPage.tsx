import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { addDays, addMonths, format, startOfMonth, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageContainer } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { usePermissions } from "@/hooks/usePermissions";
import { qk } from "@/lib/queryKeys";
import {
  holidaysApi,
  planningEmployeesApi,
  planningLeaveApi,
  planningPositionsApi,
  planningShiftsApi,
  planningWeeksApi,
} from "@/services/welloApi";
import type { PlanningLeaveRequest, PlanningShift, PlanningWeek } from "@/types/planning";

import { PlanningHeader, type PlanningViewMode } from "@/components/team/planning/PlanningHeader";
import { PlanningDateToolbar } from "@/components/team/planning/PlanningDateToolbar";
import { PlanningGrid } from "@/components/team/planning/PlanningGrid";
import { ShiftSheet, type ShiftSheetMode } from "@/components/team/planning/ShiftSheet";
import { PositionsModal } from "@/components/team/planning/PositionsModal";
import { ShiftTemplatesDialog } from "@/components/team/planning/ShiftTemplatesDialog";
import { WeekTemplatesDialog } from "@/components/team/planning/WeekTemplatesDialog";
import { HolidaysModal } from "@/components/team/planning/HolidaysModal";
import { PlanningSettingsModal } from "@/components/team/planning/PlanningSettingsModal";
import { PerformanceSheet } from "@/components/team/planning/PerformanceSheet";
import { BulkAssignDialog } from "@/components/team/planning/BulkAssignDialog";
import { WeekTemplateService } from "@/services/weekTemplateService";
import { fromKey } from "@/lib/planningUnassigned";
import {
  partitionForBulkAssign,
  shiftsOfRowInRange,
} from "@/lib/planningOverlap";
import { getHttpErrorStatus, getPlanningShiftMutationMessage } from "@/lib/planningApiErrors";

// ─── Helpers ───────────────────────────────────────────────────────────────

function isoDay(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function visibleRange(view: PlanningViewMode, anchor: Date): { from: Date; to: Date } {
  if (view === "day") return { from: anchor, to: anchor };
  if (view === "month") {
    const start = startOfMonth(anchor);
    return { from: start, to: addDays(addMonths(start, 1), -1) };
  }
  // week (Monday-anchored)
  const from = startOfWeek(anchor, { weekStartsOn: 1 });
  return { from, to: addDays(from, 6) };
}

function isPlanningWeekAlreadyExistsConflict(error: unknown): boolean {
  if (getHttpErrorStatus(error) !== 409) return false;

  if (typeof error === "object" && error !== null) {
    const responseBody = (error as { responseBody?: unknown }).responseBody;
    if (typeof responseBody === "object" && responseBody !== null) {
      const status = (responseBody as Record<string, unknown>).status;
      const errorCode = (responseBody as Record<string, unknown>).error;
      const message = (responseBody as Record<string, unknown>).message;
      return [status, errorCode, message].some(
        (value) =>
          typeof value === "string" &&
          value.toLowerCase().includes("planning_week_already_exists"),
      );
    }
  }

  if (error instanceof Error) {
    return error.message.toLowerCase().includes("planning_week_already_exists");
  }

  return false;
}

/** Find or auto-create the week containing `date`. */
async function ensureWeekFor(
  date: Date,
  weeks: PlanningWeek[],
): Promise<PlanningWeek> {
  const normalizeIsoDate = (value: string): string => value.slice(0, 10);

  const monday = startOfWeek(date, { weekStartsOn: 1 });
  const startDate = isoDay(monday);
  const existingWeek = weeks.find((w) => normalizeIsoDate(w.start_date) === startDate);
  if (existingWeek) return existingWeek;

  const sunday = addDays(monday, 6);
  try {
    return await planningWeeksApi.create({
      label: `Semaine du ${format(monday, "d MMM yyyy", { locale: fr })}`,
      start_date: startDate,
      end_date: isoDay(sunday),
    });
  } catch (error) {
    // Handle GET/POST race on unique start_date.
    if (isPlanningWeekAlreadyExistsConflict(error)) {
      const refreshedWeeks = await planningWeeksApi.list();
      const recoveredWeek = refreshedWeeks.find((w) => normalizeIsoDate(w.start_date) === startDate);
      if (recoveredWeek) return recoveredWeek;
    }
    throw error;
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const { canManagePlannings } = usePermissions();
  if (!canManagePlannings) return <Navigate to="/" replace />;
  return <PlanningPageContent />;
}

function PlanningPageContent() {
  const qc = useQueryClient();

  // ── Local UI state ───────────────────────────────────────────────────────
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<PlanningViewMode>("week");

  const [sheetMode, setSheetMode] = useState<ShiftSheetMode | null>(null);
  const [editingShift, setEditingShift] = useState<PlanningShift | null>(null);
  const [createDefaults, setCreateDefaults] = useState<{
    employee_id?: string | null;
    shift_date?: string;
  } | null>(null);

  const [positionsOpen, setPositionsOpen] = useState(false);
  const [shiftTemplatesOpen, setShiftTemplatesOpen] = useState(false);
  const [weekTemplatesOpen, setWeekTemplatesOpen] = useState(false);
  const [holidaysOpen, setHolidaysOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [performanceOpen, setPerformanceOpen] = useState(false);

  // Bulk-assign (menu "3 points" sur une ligne).
  // `sourceEmployeeId === null` ⇒ ligne "Non assigné".
  const [bulkSource, setBulkSource] = useState<{
    employeeId: string | null;
    label: string;
    count: number;
  } | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Mode "sélection multiple" pour suppression de masse.
  // Dans ce mode, le clic sur une `ShiftCard` toggle la sélection au lieu
  // d'ouvrir la ShiftSheet, et le DnD est désactivé.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Confirmation publication de semaine.
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);

  // Sauvegarde de la semaine courante en tant que modèle de semaine type.
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false);
  const [saveAsTemplateLabel, setSaveAsTemplateLabel] = useState("");
  const [saveAsTemplateSubmitting, setSaveAsTemplateSubmitting] = useState(false);

  // ── Visible range ────────────────────────────────────────────────────────
  const range = useMemo(() => visibleRange(viewMode, anchorDate), [viewMode, anchorDate]);
  const rangeKey = useMemo(() => `${isoDay(range.from)}_${isoDay(range.to)}`, [range]);
  const weekForAnchorQueryKey = useMemo(
    () => ["planning", "weeks", "for-anchor", isoDay(anchorDate)] as const,
    [anchorDate],
  );

  // ── Queries ──────────────────────────────────────────────────────────────
  const weeksQuery = useQuery({
    queryKey: qk.planningWeeks.all,
    queryFn: () => planningWeeksApi.list(),
  });

  // Resolve "current" week for the anchor date (auto-create if missing)
  const weekForAnchorQuery = useQuery({
    queryKey: weekForAnchorQueryKey,
    enabled: weeksQuery.isSuccess,
    queryFn: () => ensureWeekFor(anchorDate, weeksQuery.data ?? []),
    retry: (failureCount, error) => {
      const status = getHttpErrorStatus(error);
      if (typeof status === "number" && status >= 400 && status < 500) return false;
      return failureCount < 3;
    },
  });

  const currentWeek = weekForAnchorQuery.data ?? null;

  const shiftsQuery = useQuery({
    queryKey: currentWeek ? qk.planningWeeks.shifts(currentWeek.id) : ["planning", "shifts", "noop"],
    enabled: !!currentWeek && viewMode !== "month",
    queryFn: () => planningWeeksApi.getShifts(currentWeek!.id),
  });


  // Month mode: load all shifts for the full visible range via the range endpoint.
  const shiftsQueryMonth = useQuery({
    queryKey: qk.planningShifts.range(isoDay(range.from), isoDay(range.to)),
    enabled: viewMode === "month",
    queryFn: () => planningWeeksApi.getShiftsByRange(isoDay(range.from), isoDay(range.to)),
  });


  const employeesQuery = useQuery({
    queryKey: qk.planningEmployees.list({ active: true }),
    queryFn: () => planningEmployeesApi.list({ active: true, page_size: 100 }),
  });

  const positionsQuery = useQuery({
    queryKey: qk.planningPositions.all,
    queryFn: () => planningPositionsApi.list(),
  });

  const holidaysQuery = useQuery({
    queryKey: qk.planningHolidays.range(isoDay(range.from), isoDay(range.to)),
    queryFn: () => holidaysApi.list({ start_date: isoDay(range.from), end_date: isoDay(range.to) }),
  });

  const approvedLeavesQuery = useQuery({
    queryKey: qk.planningLeave.list({ status: "approved", page_size: 500 }),
    queryFn: () => planningLeaveApi.list({ status: "approved", page_size: 500 }),
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const createShift = useMutation({
    mutationFn: (payload: Parameters<typeof planningWeeksApi.createShift>[1]) => {
      if (!currentWeek) throw new Error("Aucune semaine sélectionnée");
      return planningWeeksApi.createShift(currentWeek.id, payload);
    },
    onSuccess: () => {
      toast.success("Shift créé");
      if (currentWeek) qc.invalidateQueries({ queryKey: qk.planningWeeks.shifts(currentWeek.id) });
    },
    onError: (err: Error) =>
      toast.error(getPlanningShiftMutationMessage(err, err.message ?? "Erreur lors de la création")),
  });

  const updateShift = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof planningShiftsApi.update>[1] }) =>
      planningShiftsApi.update(id, payload),
    onSuccess: () => {
      toast.success("Shift mis à jour");
      if (currentWeek) qc.invalidateQueries({ queryKey: qk.planningWeeks.shifts(currentWeek.id) });
    },
    onError: (err: Error) =>
      toast.error(getPlanningShiftMutationMessage(err, err.message ?? "Erreur lors de la mise à jour")),
  });

  const deleteShift = useMutation({
    mutationFn: (id: string) => planningShiftsApi.delete(id),
    onSuccess: () => {
      toast.success("Shift supprimé");
      if (currentWeek) qc.invalidateQueries({ queryKey: qk.planningWeeks.shifts(currentWeek.id) });
    },
    onError: (err: Error) => toast.error(err.message ?? "Erreur lors de la suppression"),
  });

  const duplicateShift = useMutation({
    mutationFn: async ({ sourceShift, targetEmployeeId, targetDate }: {
      sourceShift: PlanningShift;
      targetEmployeeId: string | null;
      targetDate: string;
    }) => {
      const targetWeek = await ensureWeekFor(new Date(`${targetDate}T00:00:00`), weeksQuery.data ?? []);
      return planningWeeksApi.createShift(targetWeek.id, {
        employee_id: targetEmployeeId,
        shift_date: targetDate,
        start_time: sourceShift.start_time,
        end_time: sourceShift.end_time,
        break_minutes: sourceShift.break_minutes,
        position_id: sourceShift.position_id ?? null,
        title: sourceShift.title ?? null,
        location: sourceShift.location ?? null,
        notes: sourceShift.notes ?? null,
        status: sourceShift.status,
      });
    },
    onError: (err: Error) =>
      toast.error(getPlanningShiftMutationMessage(err, err.message ?? "Erreur lors de la duplication")),
  });

  const publishWeekMutation = useMutation({
    mutationFn: (weekId: string) => planningWeeksApi.publishWeek(weekId),
    onSuccess: (updatedWeek) => {
      toast.success("Semaine publiée");
      // Mise à jour immédiate du badge via setQueryData (évite un refetch async)
      qc.setQueryData(weekForAnchorQueryKey, updatedWeek);
      qc.invalidateQueries({ queryKey: qk.planningWeeks.all });
    },
    onError: (err: Error) => toast.error(err.message ?? "Erreur lors de la publication"),
  });

  const unpublishWeekMutation = useMutation({
    mutationFn: (weekId: string) => planningWeeksApi.unpublishWeek(weekId),
    onSuccess: (updatedWeek) => {
      toast.success("Semaine dépubliée");
      // Mise à jour immédiate du badge via setQueryData
      qc.setQueryData(weekForAnchorQueryKey, updatedWeek);
      qc.invalidateQueries({ queryKey: qk.planningWeeks.all });
    },
    onError: (err: Error) => toast.error(err.message ?? "Erreur lors de la dépublication"),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handlePrev = () => {
    if (viewMode === "day") setAnchorDate((d) => addDays(d, -1));
    else if (viewMode === "month") setAnchorDate((d) => addMonths(d, -1));
    else setAnchorDate((d) => addDays(d, -7));
  };
  const handleNext = () => {
    if (viewMode === "day") setAnchorDate((d) => addDays(d, 1));
    else if (viewMode === "month") setAnchorDate((d) => addMonths(d, 1));
    else setAnchorDate((d) => addDays(d, 7));
  };
  const handleToday = () => setAnchorDate(new Date());

  const handlePublishWeek = () => {
    if (!currentWeek) return;
    setConfirmPublishOpen(true);
  };

  const handleUnpublishWeek = async () => {
    if (!currentWeek) return;
    await unpublishWeekMutation.mutateAsync(currentWeek.id);
  };

  const handleCreateClick = () => {
    setEditingShift(null);
    setCreateDefaults({ shift_date: isoDay(anchorDate) });
    setSheetMode("create");
  };

  const handleShiftClick = (shift: PlanningShift) => {
    if (selectionMode) {
      setSelectedShiftIds((prev) => {
        const next = new Set(prev);
        if (next.has(shift.id)) next.delete(shift.id);
        else next.add(shift.id);
        return next;
      });
      return;
    }
    setEditingShift(shift);
    setCreateDefaults(null);
    setSheetMode("edit");
  };

  const handleEmptyCellClick = (employeeId: string | null, dateIso: string) => {
    setEditingShift(null);
    setCreateDefaults({ employee_id: employeeId, shift_date: dateIso });
    setSheetMode("create");
  };

  /**
   * Ouvre la modale d'assignation en masse pour une ligne donnée.
   * Le `count` reçu est celui calculé par la grille sur la fenêtre visible —
   * on s'en sert pour le wording. Le périmètre réel (filtrage des shifts à
   * PATCHer) est recalculé au moment du submit pour rester synchro avec
   * l'état de cache courant.
   */
  const handleBulkAssignRow = (
    sourceEmployeeId: string | null,
    sourceLabel: string,
    count: number,
  ) => {
    if (count <= 0) return;
    setBulkSource({ employeeId: sourceEmployeeId, label: sourceLabel, count });
  };

  /**
   * Exécute le batch d'assignation en masse :
   *   1. recalcule le périmètre (shifts source × fenêtre visible) sur l'état frais ;
   *   2. partitionne assignable / conflicting via `findOverlap` côté UI ;
   *   3. PATCH en parallèle (allSettled) — chaque échec ne bloque pas le reste ;
   *   4. invalide les queries puis affiche un toast récapitulatif Skello-style.
   */
  const handleBulkConfirm = async (targetEmployeeId: string) => {
    if (!bulkSource) return;
    const allShifts = shiftsQuery.data ?? [];
    const toMove = shiftsOfRowInRange(
      allShifts,
      bulkSource.employeeId,
      isoDay(range.from),
      isoDay(range.to),
    );
    if (toMove.length === 0) {
      setBulkSource(null);
      toast.info("Aucun shift à déplacer sur la semaine.");
      return;
    }
    const { assignable, conflicting } = partitionForBulkAssign(
      toMove,
      allShifts,
      targetEmployeeId,
    );

    const targetEmp = employeesQuery.data?.items.find((e) => e.id === targetEmployeeId);
    const targetName = targetEmp ? `${targetEmp.first_name} ${targetEmp.last_name}` : "l'employé cible";

    if (assignable.length === 0) {
      // 100% conflit : avertissement explicite, on ne ferme pas la modale pour
      // que l'utilisateur puisse changer de cible.
      toast.warning(
        `Aucun shift assignable : les ${conflicting.length} shift${
          conflicting.length > 1 ? "s" : ""
        } chevauchent un shift existant de ${targetName}.`,
      );
      return;
    }

    setBulkSubmitting(true);
    try {
      // PATCH en parallèle, isolé par shift : un échec HTTP (backend rejet
      // employee_id null par exemple) remonte en toast d'erreur sans casser
      // le reste du batch ni l'UI.
      const results = await Promise.allSettled(
        assignable.map((s) =>
          planningShiftsApi.update(s.id, { employee_id: targetEmployeeId }),
        ),
      );
      const okCount = results.filter((r) => r.status === "fulfilled").length;
      const errCount = results.length - okCount;

      for (const r of results) {
        if (r.status === "rejected") {
          const msg = r.reason instanceof Error ? r.reason.message : "Échec d'un PATCH";
          toast.error(msg);
        }
      }

      if (currentWeek) {
        qc.invalidateQueries({ queryKey: qk.planningWeeks.shifts(currentWeek.id) });
      }

      if (okCount > 0 && conflicting.length === 0 && errCount === 0) {
        toast.success(
          `${okCount} shift${okCount > 1 ? "s" : ""} ${
            okCount > 1 ? "assignés" : "assigné"
          } à ${targetName}.`,
        );
      } else if (okCount > 0) {
        const parts: string[] = [
          `${okCount} shift${okCount > 1 ? "s assignés" : " assigné"} à ${targetName}`,
        ];
        if (conflicting.length > 0) {
          parts.push(
            `${conflicting.length} ignoré${conflicting.length > 1 ? "s" : ""} (conflit horaire)`,
          );
        }
        if (errCount > 0) {
          parts.push(`${errCount} en erreur`);
        }
        toast.success(parts.join(", ") + ".");
      }
      setBulkSource(null);
    } finally {
      setBulkSubmitting(false);
    }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const shifts = (viewMode === "month" ? shiftsQueryMonth.data : shiftsQuery.data) ?? [];
  const approvedLeaves = useMemo(() => {
    const data = approvedLeavesQuery.data as
      | { items?: PlanningLeaveRequest[]; leave_requests?: PlanningLeaveRequest[] }
      | undefined;
    return data?.items ?? data?.leave_requests ?? [];
  }, [approvedLeavesQuery.data]);

  const approvedLeaveLookup = useMemo(() => {
    const s = new Set<string>();
    for (const leave of approvedLeaves) {
      if (!leave.employee_id) continue;
      if (leave.status !== "approved") continue;
      let d = new Date(`${leave.start_date}T00:00:00`);
      const end = new Date(`${leave.end_date}T00:00:00`);
      while (d <= end) {
        s.add(`${leave.employee_id}:${isoDay(d)}`);
        d = addDays(d, 1);
      }
    }
    return s;
  }, [approvedLeaves]);

  const invalidatePlanningGridQueries = () => {
    if (currentWeek) {
      qc.invalidateQueries({ queryKey: qk.planningWeeks.shifts(currentWeek.id) });
    }
    qc.invalidateQueries({ queryKey: qk.planningShifts.range(isoDay(range.from), isoDay(range.to)) });
    qc.invalidateQueries({ queryKey: qk.planningWeeks.all });
  };

  const warnIfApprovedLeave = (employeeId: string | null, isoDate: string) => {
    if (!employeeId) return;
    const onLeave = approvedLeaves.some(
      (leave) =>
        leave.employee_id === employeeId &&
        leave.status === "approved" &&
        leave.start_date <= isoDate &&
        leave.end_date >= isoDate,
    );
    if (onLeave) {
      toast.warning("Attention : l'employe cible est en conge approuve ce jour-la.");
    }
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const shiftId = String(e.active.id);
    const targetId = e.over?.id ? String(e.over.id) : null;
    if (!targetId || !targetId.startsWith("cell:")) return;
    // cell:<move|dup>:<employeeId|UNASSIGNED_KEY>:<isoDate>
    const [, action, targetKey, isoDate] = targetId.split(":");
    if (!action || !targetKey || !isoDate) return;
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return;
    const targetEmployeeId = fromKey(targetKey); // null si UNASSIGNED_KEY

    warnIfApprovedLeave(targetEmployeeId, isoDate);

    if (action === "move") {
      // No-op si on droppe sur la même cellule (même assignation + même date).
      if (shift.employee_id === targetEmployeeId && shift.shift_date === isoDate) return;
      try {
        await updateShift.mutateAsync({
          id: shiftId,
          payload: { employee_id: targetEmployeeId, shift_date: isoDate },
        });
        invalidatePlanningGridQueries();
      } catch {
        // Error feedback is handled by mutation onError.
      }
      return;
    }

    if (action === "dup") {
      try {
        await duplicateShift.mutateAsync({
          sourceShift: shift,
          targetEmployeeId,
          targetDate: isoDate,
        });
        toast.success("Shift duplique");
        invalidatePlanningGridQueries();
      } catch {
        // Error feedback is handled by mutation onError.
      }
    }
  };

  const loading =
    weeksQuery.isLoading ||
    weekForAnchorQuery.isLoading ||
    (viewMode === "month" ? shiftsQueryMonth.isLoading : shiftsQuery.isLoading) ||
    employeesQuery.isLoading;

  const employees = employeesQuery.data?.items ?? [];
  const holidays = holidaysQuery.data ?? [];
  const positions = positionsQuery.data ?? [];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <PageContainer
        header={
          <PlanningHeader
            viewMode={viewMode}
            onChangeView={setViewMode}
            onCreate={handleCreateClick}
            onOpenPositions={() => setPositionsOpen(true)}
            onOpenShiftTemplates={() => setShiftTemplatesOpen(true)}
            onOpenWeekTemplates={() => setWeekTemplatesOpen(true)}
            onOpenHolidays={() => setHolidaysOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenPerformance={() => setPerformanceOpen(true)}
            onEnterSelectionMode={() => {
              setSelectionMode(true);
              setSelectedShiftIds(new Set());
            }}
          />
        }
      >
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !currentWeek ? (
          <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
            Aucune semaine disponible.
            <div className="mt-4">
              <Button size="sm" variant="outline" onClick={() => weekForAnchorQuery.refetch()}>
                Réessayer
              </Button>
            </div>
          </div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <PlanningDateToolbar
              anchorDate={anchorDate}
              viewMode={viewMode}
              currentWeek={currentWeek}
              onPrev={handlePrev}
              onNext={handleNext}
              onToday={handleToday}
              onPickDate={(d) => setAnchorDate(d)}
              onPublishWeek={handlePublishWeek}
              onUnpublishWeek={handleUnpublishWeek}
              publishPending={publishWeekMutation.isPending}
              unpublishPending={unpublishWeekMutation.isPending}
              onSaveAsWeekTemplate={() => {
                setSaveAsTemplateLabel(
                  currentWeek
                    ? `Mod\u00e8le \u2014 ${format(new Date(currentWeek.start_date + "T00:00:00"), "d MMM yyyy", { locale: fr })}`
                    : "",
                );
                setSaveAsTemplateOpen(true);
              }}
              saveDisabled={shifts.length === 0 || saveAsTemplateSubmitting}
            />
            {selectionMode && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                <div className="text-sm font-medium text-foreground">
                  Supprimer des shifts —{" "}
                  <span className="text-muted-foreground">
                    {selectedShiftIds.size} shift{selectedShiftIds.size > 1 ? "s" : ""} sélectionné{selectedShiftIds.size > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectionMode(false);
                      setSelectedShiftIds(new Set());
                    }}
                    disabled={bulkDeleting}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={selectedShiftIds.size === 0 || bulkDeleting}
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            )}
            <PlanningGrid
              key={rangeKey}
              viewMode={viewMode}
              range={range}
              week={currentWeek}
              employees={employees}
              shifts={shifts}
              holidays={holidays}
              approvedLeaveLookup={approvedLeaveLookup}
              positions={positions}
              onShiftClick={handleShiftClick}
              onEmptyCellClick={handleEmptyCellClick}
              onBulkAssignRow={handleBulkAssignRow}
              selectionMode={selectionMode}
              selectedShiftIds={selectedShiftIds}
            />
          </DndContext>
        )}
      </PageContainer>

      <ShiftSheet
        open={sheetMode !== null}
        mode={sheetMode ?? "create"}
        shift={editingShift}
        defaults={createDefaults}
        employees={employees}
        week={currentWeek}
        onOpenChange={(open) => {
          if (!open) {
            setSheetMode(null);
            setEditingShift(null);
            setCreateDefaults(null);
          }
        }}
        onCreate={async (payload) => {
          await createShift.mutateAsync(payload);
          setSheetMode(null);
        }}
        onUpdate={async (id, payload) => {
          await updateShift.mutateAsync({ id, payload });
          setSheetMode(null);
        }}
        onDelete={async (id) => {
          await deleteShift.mutateAsync(id);
          setSheetMode(null);
        }}
      />

      <PositionsModal open={positionsOpen} onOpenChange={setPositionsOpen} />
      <ShiftTemplatesDialog open={shiftTemplatesOpen} onOpenChange={setShiftTemplatesOpen} />
      <WeekTemplatesDialog
        open={weekTemplatesOpen}
        onOpenChange={setWeekTemplatesOpen}
        currentWeek={currentWeek}
        currentWeekShifts={shifts}
        employees={employees}
      />
      <HolidaysModal
        open={holidaysOpen}
        onOpenChange={setHolidaysOpen}
        from={isoDay(range.from)}
        to={isoDay(range.to)}
      />
      <PlanningSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <PerformanceSheet
        open={performanceOpen}
        onOpenChange={setPerformanceOpen}
        from={isoDay(range.from)}
        to={isoDay(range.to)}
        granularity={viewMode === "month" ? "week" : "day"}
      />

      <BulkAssignDialog
        open={bulkSource !== null}
        onOpenChange={(open) => {
          if (!open && !bulkSubmitting) setBulkSource(null);
        }}
        sourceEmployeeId={bulkSource?.employeeId ?? null}
        sourceLabel={bulkSource?.label ?? ""}
        employees={employees}
        shiftsCount={bulkSource?.count ?? 0}
        isSubmitting={bulkSubmitting}
        onConfirm={handleBulkConfirm}
      />

      <AlertDialog
        open={confirmPublishOpen}
        onOpenChange={(o) => {
          if (!publishWeekMutation.isPending) setConfirmPublishOpen(o);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publier cette semaine ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les employés pourront la consulter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publishWeekMutation.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={publishWeekMutation.isPending}
              onClick={async (e) => {
                e.preventDefault();
                if (!currentWeek) return;
                await publishWeekMutation.mutateAsync(currentWeek.id);
                setConfirmPublishOpen(false);
              }}
            >
              Publier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmDeleteOpen}
        onOpenChange={(o) => {
          if (!bulkDeleting) setConfirmDeleteOpen(o);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Voulez-vous supprimer ces {selectedShiftIds.size} shift
              {selectedShiftIds.size > 1 ? "s" : ""} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Non</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkDeleting}
              onClick={async (e) => {
                e.preventDefault();
                const ids = Array.from(selectedShiftIds);
                if (ids.length === 0) return;
                setBulkDeleting(true);
                try {
                  const results = await Promise.allSettled(
                    ids.map((id) => planningShiftsApi.delete(id)),
                  );
                  const okCount = results.filter((r) => r.status === "fulfilled").length;
                  const errCount = results.length - okCount;
                  for (const r of results) {
                    if (r.status === "rejected") {
                      const msg = r.reason instanceof Error ? r.reason.message : "Échec d'une suppression";
                      toast.error(msg);
                    }
                  }
                  if (currentWeek) {
                    qc.invalidateQueries({ queryKey: qk.planningWeeks.shifts(currentWeek.id) });
                  }
                  if (okCount > 0 && errCount === 0) {
                    toast.success(`${okCount} shift${okCount > 1 ? "s supprimés" : " supprimé"}.`);
                  } else if (okCount > 0) {
                    toast.success(
                      `${okCount} supprimé${okCount > 1 ? "s" : ""}, ${errCount} en erreur.`,
                    );
                  }
                  setSelectionMode(false);
                  setSelectedShiftIds(new Set());
                  setConfirmDeleteOpen(false);
                } finally {
                  setBulkDeleting(false);
                }
              }}
            >
              Oui, supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={saveAsTemplateOpen}
        onOpenChange={(o) => {
          if (!saveAsTemplateSubmitting) setSaveAsTemplateOpen(o);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sauvegarder comme semaine type</DialogTitle>
            <DialogDescription>
              Crée un nouveau modèle réutilisable à partir des shifts de la semaine
              affichée. L&apos;assignation nominative et les postes sont préservés.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!currentWeek) return;
              const trimmed = saveAsTemplateLabel.trim();
              if (!trimmed) {
                toast.error("Le libellé est obligatoire.");
                return;
              }
              setSaveAsTemplateSubmitting(true);
              try {
                await WeekTemplateService.createFromWeek(
                  { week_id: currentWeek.id, label: trimmed },
                  shifts,
                  positions,
                );
                toast.success("Semaine type créée");
                qc.invalidateQueries({ queryKey: qk.planningWeekTemplates.all });
                setSaveAsTemplateOpen(false);
              } catch (err) {
                const msg = err instanceof Error ? err.message : "Échec de la sauvegarde";
                toast.error(msg);
              } finally {
                setSaveAsTemplateSubmitting(false);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="save-tpl-label">Libellé du modèle</Label>
              <Input
                id="save-tpl-label"
                value={saveAsTemplateLabel}
                onChange={(e) => setSaveAsTemplateLabel(e.target.value)}
                placeholder="Semaine type été, Service midi seul…"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSaveAsTemplateOpen(false)}
                disabled={saveAsTemplateSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={!saveAsTemplateLabel.trim() || saveAsTemplateSubmitting}
              >
                Sauvegarder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
