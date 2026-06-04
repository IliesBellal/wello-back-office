import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, Calendar, CheckCircle2, Trash2, User, XCircle } from "lucide-react";
import { toast } from "sonner";

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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { qk } from "@/lib/queryKeys";
import { getHttpErrorStatus, getPlanningBusinessStatus, getPlanningMutationMessage } from "@/lib/planningApiErrors";
import { planningLeaveApi, planningShiftsApi } from "@/services/welloApi";
import type {
  Employee,
  LeaveType,
  PlanningLeaveRequest,
  PlanningShift,
} from "@/types/planning";

import { LEAVE_TYPE_OPTIONS } from "./statusOptions";
import { LeaveTypeBadge, StatusBadge } from "./statusBadges";

type Mode = "view" | "create";

interface LeaveRequestSheetProps {
  open: boolean;
  mode: Mode;
  request: PlanningLeaveRequest | null;
  employees: Employee[];
  onOpenChange: (open: boolean) => void;
}

export function LeaveRequestSheet({
  open,
  mode,
  request,
  employees,
  onOpenChange,
}: LeaveRequestSheetProps) {
  const qc = useQueryClient();
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const employee = request ? employeeById.get(request.employee_id) ?? null : null;

  // ── Form state (create + edit dates/type/reason ; manager_note via approve/reject)
  const [employeeId, setEmployeeId] = useState<string>("");
  const [leaveType, setLeaveType] = useState<LeaveType>("paid");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [managerNote, setManagerNote] = useState<string>("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsEditMode(false);
    setApproveConfirmOpen(false);
    if (mode === "create") {
      setEmployeeId(employees[0]?.id ?? "");
      setLeaveType("paid");
      const today = format(new Date(), "yyyy-MM-dd");
      setStartDate(today);
      setEndDate(today);
      setReason("");
      setManagerNote("");
    } else if (request) {
      setEmployeeId(request.employee_id);
      setLeaveType(request.leave_type);
      setStartDate(request.start_date);
      setEndDate(request.end_date);
      setReason(request.reason ?? "");
      setManagerNote(request.manager_note ?? "");
    }
  }, [open, mode, request, employees]);

  const pending = request?.status === "pending";
  const conflictQuery = useQuery({
    queryKey: ["planning", "leave-requests", request?.id, "conflicting-shifts"],
    queryFn: () => planningLeaveApi.getConflictingShifts(request!.id),
    enabled: open && mode === "view" && !!request && pending,
  });
  const conflictingShifts = conflictQuery.data ?? [];
  const conflictingCount = conflictingShifts.length;
  const conflictingCountLabel = `${conflictingCount} shift${conflictingCount > 1 ? "s" : ""}`;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.planningLeave.all });
  };

  const createMut = useMutation({
    mutationFn: () =>
      planningLeaveApi.create({
        employee_id: employeeId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Demande de congé créée.");
      invalidate();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message ?? "Création impossible."),
  });

  const editMut = useMutation({
    mutationFn: () => {
      if (!request) throw new Error("Demande introuvable.");
      return planningLeaveApi.update(request.id, {
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Demande mise à jour.");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message ?? "Mise à jour impossible."),
  });

  const approveMut = useMutation({
    mutationFn: async () => {
      if (!request) throw new Error("Demande introuvable.");

      const latestConflicts = await planningLeaveApi.getConflictingShifts(request.id);
      const dedupedConflicts: PlanningShift[] = Array.from(
        new Map(latestConflicts.map((shift) => [shift.id, shift])).values(),
      );

      for (const shift of dedupedConflicts) {
        await planningShiftsApi.update(shift.id, { employee_id: null });
      }

      const updatedLeave = await planningLeaveApi.update(request.id, {
        status: "approved",
        manager_note: managerNote.trim() || null,
      });

      return {
        updatedLeave,
        releasedShifts: dedupedConflicts,
      };
    },
    onSuccess: ({ updatedLeave, releasedShifts }) => {
      toast.success("Demande approuvée.");

      const touchedWeekIds = new Set(
        releasedShifts
          .map((shift) => shift.week_id)
          .filter((weekId): weekId is string => typeof weekId === "string" && weekId.length > 0),
      );

      invalidate();
      qc.invalidateQueries({ queryKey: qk.planningLeave.detail(updatedLeave.id) });
      qc.invalidateQueries({ queryKey: ["planning", "leave-requests", updatedLeave.id, "conflicting-shifts"] });
      for (const weekId of touchedWeekIds) {
        qc.invalidateQueries({ queryKey: qk.planningWeeks.shifts(weekId) });
      }
      for (const shift of releasedShifts) {
        qc.invalidateQueries({ queryKey: qk.planningShifts.detail(shift.id) });
      }

      onOpenChange(false);
    },
    onError: async (err: Error) => {
      const message = getPlanningMutationMessage(
        err,
        err.message ?? "Approbation refusée.",
        {
          planning_leave_shift_conflict:
            "Le congé chevauche encore des shifts assignés. Les conflits ont été rechargés.",
        },
      );

      toast.error(message, { duration: 8000 });

      if (
        getHttpErrorStatus(err) === 409 &&
        getPlanningBusinessStatus(err)?.toLowerCase() === "planning_leave_shift_conflict"
      ) {
        await conflictQuery.refetch();
      }
    },
  });

  const rejectMut = useMutation({
    mutationFn: () => {
      if (!request) throw new Error("Demande introuvable.");
      return planningLeaveApi.update(request.id, {
        status: "rejected",
        manager_note: managerNote.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Demande rejetée.");
      invalidate();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message ?? "Rejet impossible."),
  });

  const deleteMut = useMutation({
    mutationFn: () => {
      if (!request) throw new Error("Demande introuvable.");
      return planningLeaveApi.delete(request.id);
    },
    onSuccess: () => {
      toast.success("Demande annulée.");
      invalidate();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message ?? "Suppression impossible."),
  });

  const canEditRequest = mode === "view" && pending;
  const fieldsEditable = mode === "create" || (canEditRequest && isEditMode);
  const managerNoteEditable = canEditRequest && isEditMode;
  const leaveTypeLabel = LEAVE_TYPE_OPTIONS.find((o) => o.value === leaveType)?.label ?? leaveType;
  const anyMut =
    createMut.isPending ||
    editMut.isPending ||
    approveMut.isPending ||
    rejectMut.isPending ||
    deleteMut.isPending;
  const approvalButtonLabel =
    conflictingCount > 0 ? `Approuver et libérer ${conflictingCountLabel}` : "Approuver";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "create" ? "Nouvelle demande de congé" : "Demande de congé"}
          </SheetTitle>
          <SheetDescription>
            {mode === "view" && employee
              ? `${employee.first_name} ${employee.last_name}`
              : "Renseignez les détails ci-dessous."}
          </SheetDescription>
        </SheetHeader>

        {/* ── Status banner (view mode) ─────────────────────────────── */}
        {mode === "view" && request && (
          <div className="mt-4 flex items-center gap-2">
            <StatusBadge value={request.status} />
            <LeaveTypeBadge value={request.leave_type} />
          </div>
        )}

        {/* ── Conflict info on approve ──────────────────────────────── */}
        {mode === "view" && pending && (
          <div className="mt-3 rounded-md border border-amber-300/60 bg-amber-50 p-2 text-[11px] text-amber-900">
            {conflictQuery.isLoading ? (
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>Chargement des shifts en conflit...</div>
              </div>
            ) : conflictingCount > 0 ? (
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div>
                    Cet employé a {conflictingCountLabel} pendant ce congé. Approuver le congé passera ces shifts en non-assignés.
                  </div>
                </div>
                <ul className="list-disc space-y-0.5 pl-5">
                  {conflictingShifts.map((shift) => (
                    <li key={shift.id}>
                      {formatDateForDisplay(shift.shift_date)} - {formatTimeForDisplay(shift.start_time)}-{formatTimeForDisplay(shift.end_time)} - {shift.position ?? "Poste non precise"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>Aucun shift assigne en conflit pour ce congé.</div>
              </div>
            )}
          </div>
        )}

        {/* ── Form ──────────────────────────────────────────────────── */}
        <section className="mt-4 space-y-3 rounded-md border bg-card p-3 text-sm">
          <Field label="Employé" icon={User}>
            {mode === "create" ? (
              <Select
                value={employeeId}
                onValueChange={setEmployeeId}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Sélectionner un employé" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <ReadOnlyValue>
                {employee ? `${employee.first_name} ${employee.last_name}` : "-"}
              </ReadOnlyValue>
            )}
          </Field>

          <Field label="Type">
            {fieldsEditable ? (
              <Select
                value={leaveType}
                onValueChange={(v) => setLeaveType(v as LeaveType)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <ReadOnlyValue>{leaveTypeLabel}</ReadOnlyValue>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Début" icon={Calendar}>
              {fieldsEditable ? (
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-sm"
                />
              ) : (
                <ReadOnlyValue>{formatDateForDisplay(startDate)}</ReadOnlyValue>
              )}
            </Field>
            <Field label="Fin" icon={Calendar}>
              {fieldsEditable ? (
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-sm"
                />
              ) : (
                <ReadOnlyValue>{formatDateForDisplay(endDate)}</ReadOnlyValue>
              )}
            </Field>
          </div>

          <Field label="Motif">
            {fieldsEditable ? (
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Optionnel"
                className="text-sm"
              />
            ) : (
              <ReadOnlyValue className="min-h-16 whitespace-pre-wrap">{reason.trim() || "Aucun motif"}</ReadOnlyValue>
            )}
          </Field>
        </section>

        {/* ── Manager note + actions (view + pending) ────────────────── */}
        {mode === "view" && request && (
          <section className="mt-4 space-y-2 rounded-md border bg-card p-3 text-sm">
            <Field label="Note manager">
              {managerNoteEditable ? (
                <Textarea
                  value={managerNote}
                  onChange={(e) => setManagerNote(e.target.value)}
                  rows={2}
                  placeholder="Justifier l'approbation ou le rejet"
                  className="text-sm"
                />
              ) : (
                <ReadOnlyValue className="min-h-16 whitespace-pre-wrap">{managerNote.trim() || "Aucune note"}</ReadOnlyValue>
              )}
            </Field>
            {request.processed_at && (
              <div className="text-[11px] text-muted-foreground">
                Traitée le {format(parseISO(request.processed_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                {request.processed_by_user_id && <> par {request.processed_by_user_id}</>}
              </div>
            )}
          </section>
        )}

        <SheetFooter className="mt-6 flex-col gap-2 sm:flex-col">
          {mode === "create" ? (
            <Button onClick={() => createMut.mutate()} disabled={anyMut || !employeeId} className="w-full">
              Créer la demande
            </Button>
          ) : (
            <>
              {pending && !isEditMode && (
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button
                    variant="default"
                    onClick={() => {
                      if (conflictingCount > 0) {
                        setApproveConfirmOpen(true);
                        return;
                      }
                      approveMut.mutate();
                    }}
                    disabled={anyMut || conflictQuery.isLoading}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {approvalButtonLabel}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => rejectMut.mutate()}
                    disabled={anyMut}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rejeter
                  </Button>
                </div>
              )}
              {canEditRequest && !isEditMode && (
                <Button variant="outline" onClick={() => setIsEditMode(true)} disabled={anyMut} className="w-full">
                  Modifier
                </Button>
              )}
              {canEditRequest && isEditMode && (
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!request) return;
                      setLeaveType(request.leave_type);
                      setStartDate(request.start_date);
                      setEndDate(request.end_date);
                      setReason(request.reason ?? "");
                      setManagerNote(request.manager_note ?? "");
                      setIsEditMode(false);
                    }}
                    disabled={anyMut}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => {
                      editMut.mutate();
                      setIsEditMode(false);
                    }}
                    disabled={anyMut}
                  >
                    Modifier
                  </Button>
                </div>
              )}
              {request && request.status !== "cancelled" && !isEditMode && (
                <Button
                  variant="ghost"
                  onClick={() => deleteMut.mutate()}
                  disabled={anyMut}
                  className="w-full text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Annuler la demande
                </Button>
              )}
            </>
          )}
        </SheetFooter>

        <AlertDialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer l'approbation et la libération des shifts</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action va désassigner tous les shifts en conflit renvoyés par le backend, puis approuver la demande de congé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={anyMut}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                disabled={anyMut}
                onClick={(event) => {
                  event.preventDefault();
                  setApproveConfirmOpen(false);
                  approveMut.mutate();
                }}
              >
                Approuver et libérer {conflictingCountLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

interface FieldProps {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

function Field({ label, icon: Icon, children }: FieldProps) {
  return (
    <div>
      <label className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

interface ReadOnlyValueProps {
  children: React.ReactNode;
  className?: string;
}

function ReadOnlyValue({ children, className = "" }: ReadOnlyValueProps) {
  return (
    <div className={`rounded-md border bg-muted/40 px-3 py-2 text-sm ${className}`}>
      {children}
    </div>
  );
}

function formatDateForDisplay(value: string): string {
  if (!value) return "-";
  try {
    return format(parseISO(value), "dd/MM/yyyy", { locale: fr });
  } catch {
    return value;
  }
}

function formatTimeForDisplay(value: string): string {
  if (!value) return "--:--";
  return value.slice(0, 5);
}
