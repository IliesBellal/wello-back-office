import { useEffect, useMemo, useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { qk } from "@/lib/queryKeys";
import {
  holidaysApi,
  planningDayCommentsApi,
  planningEmployeesApi,
  planningLeaveApi,
  planningPositionsApi,
  planningSettingsApi,
  planningShiftsApi,
  planningWeeksApi,
} from "@/services/welloApi";
import type {
  Employee,
  PlanningLeaveRequest,
  PlanningPublishNotificationMode,
  PlanningShift,
  PlanningWeek,
} from "@/types/planning";

import {
  PlanningToolbar,
  type PlanningDensity,
  type PlanningViewMode,
} from "@/components/team/planning/PlanningToolbar";
import { PlanningGrid } from "@/components/team/planning/PlanningGrid";
import { ShiftSheet, type ShiftSheetMode } from "@/components/team/planning/ShiftSheet";
import { PositionsModal } from "@/components/team/planning/PositionsModal";
import { CreateEmployeeDialog } from "@/components/team/planning/CreateEmployeeDialog";
import { EmployeesModal } from "@/components/team/EmployeesModal";
import { ShiftTemplatesDialog } from "@/components/team/planning/ShiftTemplatesDialog";
import { WeekTemplatesDialog } from "@/components/team/planning/WeekTemplatesDialog";
import { HolidaysModal } from "@/components/team/planning/HolidaysModal";
import { PlanningSettingsModal } from "@/components/team/planning/PlanningSettingsModal";
import { PerformanceGridHeaderRows, PerformanceSheet } from "@/components/team/planning/PerformanceSheet";
import { BulkAssignDialog } from "@/components/team/planning/BulkAssignDialog";
import { WeekTemplateService } from "@/services/weekTemplateService";
import { PerformanceService } from "@/services/performanceService";
import { fromKey } from "@/lib/planningUnassigned";
import {
  partitionForBulkAssign,
  shiftsOfRowInRange,
} from "@/lib/planningOverlap";
import { getHttpErrorStatus, getPlanningShiftMutationMessage } from "@/lib/planningApiErrors";

// ─── Helpers ───────────────────────────────────────────────────────────────

const DENSITY_STORAGE_KEY = "wello.planning.density";
const EMPLOYEE_COLUMN_COLLAPSED_STORAGE_KEY = "wello.planning.employeeColumnCollapsed";

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

function getFullscreenShortcutTip(): string {
  if (typeof navigator === "undefined") {
    return "Appuyez sur F11 pour afficher votre navigateur en plein écran.";
  }

  const platform = `${navigator.platform ?? ""} ${navigator.userAgent ?? ""}`;
  const isMac = /mac/i.test(platform);

  return isMac
    ? "Appuyez sur Ctrl + Cmd + F pour afficher votre navigateur en plein écran."
    : "Appuyez sur F11 pour afficher votre navigateur en plein écran.";
}

function getDefaultNotificationMode(week: PlanningWeek): PlanningPublishNotificationMode {
  return week.published_at ? "changes_only" : "all";
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
  const [employeeCreateOpen, setEmployeeCreateOpen] = useState(false);
  const [employeesOpen, setEmployeesOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [shiftTemplatesOpen, setShiftTemplatesOpen] = useState(false);
  const [weekTemplatesOpen, setWeekTemplatesOpen] = useState(false);
  const [holidaysOpen, setHolidaysOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [performanceOpen, setPerformanceOpen] = useState(false);
  const [performanceCompare, setPerformanceCompare] = useState(false);

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
  const [publishNotificationMode, setPublishNotificationMode] =
    useState<PlanningPublishNotificationMode>("changes_only");

  // Sauvegarde de la semaine courante en tant que modèle de semaine type.
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false);
  const [saveAsTemplateLabel, setSaveAsTemplateLabel] = useState("");
  const [saveAsTemplateSubmitting, setSaveAsTemplateSubmitting] = useState(false);

  // Confort d'affichage : plein écran (overlay au-dessus de la sidebar) et
  // densité de la grille (persistée localement).
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [density, setDensity] = useState<PlanningDensity>(() =>
    localStorage.getItem(DENSITY_STORAGE_KEY) === "compact" ? "compact" : "comfortable",
  );

  const handleToggleDensity = () => {
    setDensity((d) => {
      const next: PlanningDensity = d === "compact" ? "comfortable" : "compact";
      localStorage.setItem(DENSITY_STORAGE_KEY, next);
      return next;
    });
  };

  // Contraction de la colonne titre (nom/poste/heures des employés) en un
  // chip compact (initiales, heures, 1re lettre du poste). Lifté ici (plutôt
  // que local à PlanningGrid) car la grille remonte via `key={rangeKey}` à
  // chaque changement de plage — un state local y serait réinitialisé.
  const [employeeColumnCollapsed, setEmployeeColumnCollapsed] = useState<boolean>(
    () => localStorage.getItem(EMPLOYEE_COLUMN_COLLAPSED_STORAGE_KEY) === "1",
  );

  const handleToggleEmployeeColumnCollapsed = () => {
    setEmployeeColumnCollapsed((collapsed) => {
      const next = !collapsed;
      localStorage.setItem(EMPLOYEE_COLUMN_COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen((current) => {
      const next = !current;
      if (next) {
        toast.info("Astuce plein écran", {
          description: getFullscreenShortcutTip(),
          duration: 6000,
        });
      }
      return next;
    });
  };

  // Échap quitte le plein écran — sauf quand une modale/sheet est ouverte :
  // Radix ferme déjà l'overlay avec Échap, sans ce garde-fou le même appui
  // sortirait aussi du plein écran.
  const overlayOpen =
    sheetMode !== null ||
    positionsOpen ||
    employeeCreateOpen ||
    shiftTemplatesOpen ||
    weekTemplatesOpen ||
    holidaysOpen ||
    settingsOpen ||
    bulkSource !== null ||
    confirmPublishOpen ||
    confirmDeleteOpen ||
    saveAsTemplateOpen;

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !overlayOpen) setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen, overlayOpen]);

  // ── Visible range ────────────────────────────────────────────────────────
  const range = useMemo(() => visibleRange(viewMode, anchorDate), [viewMode, anchorDate]);
  const rangeKey = useMemo(() => `${isoDay(range.from)}_${isoDay(range.to)}`, [range]);
  const visibleDates = useMemo(() => {
    const out: Date[] = [];
    let current = range.from;
    while (current <= range.to) {
      out.push(current);
      current = addDays(current, 1);
    }
    return out;
  }, [range]);
  const weekForAnchorQueryKey = useMemo(
    () => ["planning", "weeks", "for-anchor", isoDay(anchorDate)] as const,
    [anchorDate],
  );

  // ── Queries ──────────────────────────────────────────────────────────────
  const weeksQuery = useQuery({
    queryKey: qk.planningWeeks.all,
    queryFn: () => planningWeeksApi.list(),
  });

  const planningSettingsQuery = useQuery({
    queryKey: qk.planningSettings.all,
    queryFn: () => planningSettingsApi.get(),
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

  const dayCommentsQuery = useQuery({
    queryKey: qk.planningDayComments.range(isoDay(range.from), isoDay(range.to)),
    queryFn: () => planningDayCommentsApi.list(isoDay(range.from), isoDay(range.to)),
  });

  const approvedLeavesQuery = useQuery({
    queryKey: qk.planningLeave.list({ status: "approved", page_size: 500 }),
    queryFn: () => planningLeaveApi.list({ status: "approved", page_size: 500 }),
  });

  const performanceQuery = useQuery({
    queryKey: ["planning", "performance", isoDay(range.from), isoDay(range.to), "day", performanceCompare],
    queryFn: () =>
      PerformanceService.getForRange({
        from: isoDay(range.from),
        to: isoDay(range.to),
        granularity: "day",
        compare: performanceCompare ? "previous" : undefined,
      }),
    enabled: performanceOpen,
  });

  const invalidatePlanningGridQueries = () => {
    if (currentWeek) {
      qc.invalidateQueries({ queryKey: qk.planningWeeks.shifts(currentWeek.id) });
    }
    qc.invalidateQueries({ queryKey: qk.planningShifts.range(isoDay(range.from), isoDay(range.to)) });
    qc.invalidateQueries({ queryKey: qk.planningWeeks.all });
    if (performanceOpen) {
      qc.invalidateQueries({
        queryKey: ["planning", "performance", isoDay(range.from), isoDay(range.to), "day", performanceCompare],
        exact: true,
      });
    }
  };

  // ── Mutations ────────────────────────────────────────────────────────────
  const createShift = useMutation({
    mutationFn: (payload: Parameters<typeof planningWeeksApi.createShift>[1]) => {
      if (!currentWeek) throw new Error("Aucune semaine sélectionnée");
      return planningWeeksApi.createShift(currentWeek.id, payload);
    },
    onSuccess: () => {
      toast.success("Shift créé");
      invalidatePlanningGridQueries();
    },
    onError: (err: Error) =>
      toast.error(getPlanningShiftMutationMessage(err, err.message ?? "Erreur lors de la création")),
  });

  const updateShift = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof planningShiftsApi.update>[1] }) =>
      planningShiftsApi.update(id, payload),
    onSuccess: () => {
      toast.success("Shift mis à jour");
      invalidatePlanningGridQueries();
    },
    onError: (err: Error) =>
      toast.error(getPlanningShiftMutationMessage(err, err.message ?? "Erreur lors de la mise à jour")),
  });

  const deleteShift = useMutation({
    mutationFn: (id: string) => planningShiftsApi.delete(id),
    onSuccess: () => {
      toast.success("Shift supprimé");
      invalidatePlanningGridQueries();
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
    mutationFn: ({
      weekId,
      notificationMode,
    }: {
      weekId: string;
      notificationMode: PlanningPublishNotificationMode;
    }) => planningWeeksApi.publishWeek(weekId, notificationMode),
    onSuccess: (updatedWeek) => {
      // Immediate update for the badge
      qc.setQueryData(weekForAnchorQueryKey, updatedWeek);
      // Invalidate only the exact weeks list (do not invalidate sub-keys)
      qc.invalidateQueries({ queryKey: qk.planningWeeks.all, exact: true });
      toast.success("Semaine publiée");
    },
    onError: (err: Error) => toast.error(err.message ?? "Erreur lors de la publication"),
  });

  const unpublishWeekMutation = useMutation({
    mutationFn: (weekId: string) => planningWeeksApi.unpublishWeek(weekId),
    onSuccess: (updatedWeek) => {
      // Immediate update for the badge
      qc.setQueryData(weekForAnchorQueryKey, updatedWeek);
      // Invalidate only the exact weeks list (do not invalidate sub-keys)
      qc.invalidateQueries({ queryKey: qk.planningWeeks.all, exact: true });
      toast.success("Semaine dépubliée");
    },
    onError: (err: Error) => toast.error(err.message ?? "Erreur lors de la dépublication"),
  });

  const dayCommentsRangeKey = qk.planningDayComments.range(isoDay(range.from), isoDay(range.to));

  const saveDayCommentMutation = useMutation({
    mutationFn: ({ date, comment }: { date: string; comment: string }) =>
      planningDayCommentsApi.upsert(date, { comment }),
    onSuccess: () => {
      toast.success("Commentaire enregistré");
      qc.invalidateQueries({ queryKey: dayCommentsRangeKey });
    },
    onError: (err: Error) => toast.error(err.message ?? "Erreur lors de l'enregistrement du commentaire"),
  });

  const deleteDayCommentMutation = useMutation({
    mutationFn: (date: string) => planningDayCommentsApi.delete(date),
    onSuccess: () => {
      toast.success("Commentaire supprimé");
      qc.invalidateQueries({ queryKey: dayCommentsRangeKey });
    },
    onError: (err: Error) => toast.error(err.message ?? "Erreur lors de la suppression du commentaire"),
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
    setPublishNotificationMode(getDefaultNotificationMode(currentWeek));
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
  const smsNotificationsEnabled =
    planningSettingsQuery.data?.planning_sms_notifications_enabled ?? false;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      {/* En plein écran, la page passe en overlay fixe au-dessus de la sidebar. */}
      <div className={cn("h-full", isFullscreen && "fixed inset-0 z-50 bg-background")}>
        <PageContainer
          variant="workspace"
          header={
            <PlanningToolbar
              viewMode={viewMode}
              onChangeView={setViewMode}
              anchorDate={anchorDate}
              currentWeek={currentWeek}
              onPrev={handlePrev}
              onNext={handleNext}
              onToday={handleToday}
              onPickDate={(d) => setAnchorDate(d)}
              onCreate={handleCreateClick}
              onPublishWeek={handlePublishWeek}
              onUnpublishWeek={handleUnpublishWeek}
              publishPending={publishWeekMutation.isPending}
              unpublishPending={unpublishWeekMutation.isPending}
              onOpenPositions={() => setPositionsOpen(true)}
              onCreateEmployee={() => setEmployeeCreateOpen(true)}
              onOpenEmployees={() => setEmployeesOpen(true)}
              onOpenShiftTemplates={() => setShiftTemplatesOpen(true)}
              onOpenWeekTemplates={() => setWeekTemplatesOpen(true)}
              onOpenHolidays={() => setHolidaysOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenPerformance={() => setPerformanceOpen((open) => !open)}
              onEnterSelectionMode={() => {
                setSelectionMode(true);
                setSelectedShiftIds(new Set());
              }}
              onSaveAsWeekTemplate={() => {
                setSaveAsTemplateLabel(
                  currentWeek
                    ? `Modèle — ${format(new Date(currentWeek.start_date + "T00:00:00"), "d MMM yyyy", { locale: fr })}`
                    : "",
                );
                setSaveAsTemplateOpen(true);
              }}
              saveDisabled={shifts.length === 0 || saveAsTemplateSubmitting}
              density={density}
              onToggleDensity={handleToggleDensity}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
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
            {selectionMode && (
              <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
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
            {/* La grille scrolle en interne (sticky headers) dans la hauteur restante. */}
            <div className="min-h-0 flex-1">
              <PerformanceSheet
                open={performanceOpen}
                onOpenChange={setPerformanceOpen}
                from={isoDay(range.from)}
                to={isoDay(range.to)}
                compare={performanceCompare}
                onCompareChange={setPerformanceCompare}
                data={performanceQuery.data}
                isLoading={performanceQuery.isLoading}
                error={(performanceQuery.error as Error | null) ?? null}
              />

              <PlanningGrid
                key={rangeKey}
                viewMode={viewMode}
                range={range}
                week={currentWeek}
                headerRows={
                  <PerformanceGridHeaderRows
                    open={performanceOpen}
                    dates={visibleDates}
                    data={performanceQuery.data}
                    isLoading={performanceQuery.isLoading}
                    error={(performanceQuery.error as Error | null) ?? null}
                    compare={performanceCompare}
                  />
                }
                employees={employees}
                shifts={shifts}
                holidays={holidays}
                dayComments={dayCommentsQuery.data ?? []}
                onSaveDayComment={async (date, comment) => {
                  await saveDayCommentMutation.mutateAsync({ date, comment });
                }}
                onDeleteDayComment={async (date) => {
                  await deleteDayCommentMutation.mutateAsync(date);
                }}
                approvedLeaveLookup={approvedLeaveLookup}
                positions={positions}
                onShiftClick={handleShiftClick}
                onEmptyCellClick={handleEmptyCellClick}
                onBulkAssignRow={handleBulkAssignRow}
                selectionMode={selectionMode}
                selectedShiftIds={selectedShiftIds}
                density={density}
                onCreateEmployee={() => setEmployeeCreateOpen(true)}
                onEditEmployee={setEditEmployee}
                collapsed={employeeColumnCollapsed}
                onToggleCollapsed={handleToggleEmployeeColumnCollapsed}
              />
            </div>
          </DndContext>
        )}
        </PageContainer>
      </div>

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
      <CreateEmployeeDialog open={employeeCreateOpen} onOpenChange={setEmployeeCreateOpen} />
      <EmployeesModal
        open={employeesOpen || !!editEmployee}
        onOpenChange={(open) => {
          if (!open) {
            setEmployeesOpen(false);
            setEditEmployee(null);
          }
        }}
        initialEmployee={editEmployee}
      />
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

          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Mode de notification
            </Label>
            <RadioGroup
              value={publishNotificationMode}
              onValueChange={(value) =>
                setPublishNotificationMode(value as PlanningPublishNotificationMode)
              }
              className="space-y-1.5"
            >
              <label className="flex cursor-pointer items-start gap-3 rounded-md border p-2.5 hover:bg-muted/50">
                <RadioGroupItem value="all" className="mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Notifier tout le monde</div>
                  <p className="text-xs text-muted-foreground">
                    Envoi vers tous les employés concernés par la semaine publiée.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-md border p-2.5 hover:bg-muted/50">
                <RadioGroupItem value="changes_only" className="mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Notifier uniquement les changements</div>
                  <p className="text-xs text-muted-foreground">
                    N'envoie des notifications qu'aux employés impactés par des modifications.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-md border p-2.5 hover:bg-muted/50">
                <RadioGroupItem value="none" className="mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Ne notifier personne</div>
                  <p className="text-xs text-muted-foreground">
                    Publie la semaine sans envoyer de notification.
                  </p>
                </div>
              </label>
            </RadioGroup>

            {!smsNotificationsEnabled && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                Les notifications SMS sont désactivées dans les paramètres planning. Seules les notifications email peuvent être envoyées.
              </p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={publishWeekMutation.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={publishWeekMutation.isPending}
              onClick={async (e) => {
                e.preventDefault();
                if (!currentWeek) return;
                await publishWeekMutation.mutateAsync({
                  weekId: currentWeek.id,
                  notificationMode: publishNotificationMode,
                });
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
                  invalidatePlanningGridQueries();
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
