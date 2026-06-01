import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, Calendar, CheckCircle2, Trash2, User, XCircle } from "lucide-react";
import { toast } from "sonner";

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
import { planningLeaveApi } from "@/services/welloApi";
import type {
  Employee,
  LeaveType,
  PlanningLeaveRequest,
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

  useEffect(() => {
    if (!open) return;
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
    mutationFn: () => {
      if (!request) throw new Error("Demande introuvable.");
      return planningLeaveApi.update(request.id, {
        status: "approved",
        manager_note: managerNote.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Demande approuvée.");
      invalidate();
      onOpenChange(false);
    },
    onError: (err: Error) =>
      // The API rejects approval when shifts remain in the period.
      toast.error(err.message ?? "Approbation refusée par l'API (conflit possible).", {
        duration: 8000,
      }),
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

  const pending = request?.status === "pending";
  const anyMut =
    createMut.isPending ||
    editMut.isPending ||
    approveMut.isPending ||
    rejectMut.isPending ||
    deleteMut.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
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
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 p-2 text-[11px] text-amber-900">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              À l'approbation, l'API <span className="font-medium">refuse</span> la demande si
              des shifts restent affectés à l'employé sur la période. Réaffectez ou supprimez
              ces shifts au préalable.
            </div>
          </div>
        )}

        {/* ── Form ──────────────────────────────────────────────────── */}
        <section className="mt-4 space-y-3 rounded-md border bg-card p-3 text-sm">
          <Field label="Employé" icon={User}>
            <Select
              value={employeeId}
              onValueChange={setEmployeeId}
              disabled={mode !== "create"}
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
          </Field>

          <Field label="Type">
            <Select
              value={leaveType}
              onValueChange={(v) => setLeaveType(v as LeaveType)}
              disabled={mode === "view" && !pending}
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
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Début" icon={Calendar}>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={mode === "view" && !pending}
                className="h-8 text-sm"
              />
            </Field>
            <Field label="Fin" icon={Calendar}>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={mode === "view" && !pending}
                className="h-8 text-sm"
              />
            </Field>
          </div>

          <Field label="Motif">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Optionnel"
              disabled={mode === "view" && !pending}
              className="text-sm"
            />
          </Field>
        </section>

        {/* ── Manager note + actions (view + pending) ────────────────── */}
        {mode === "view" && request && (
          <section className="mt-4 space-y-2 rounded-md border bg-card p-3 text-sm">
            <Field label="Note manager">
              <Textarea
                value={managerNote}
                onChange={(e) => setManagerNote(e.target.value)}
                rows={2}
                placeholder="Justifier l'approbation ou le rejet"
                disabled={!pending}
                className="text-sm"
              />
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
              {pending && (
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button
                    variant="default"
                    onClick={() => approveMut.mutate()}
                    disabled={anyMut}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approuver
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
              {pending && (
                <Button
                  variant="outline"
                  onClick={() => editMut.mutate()}
                  disabled={anyMut}
                  className="w-full"
                >
                  Enregistrer les modifications
                </Button>
              )}
              {request && request.status !== "cancelled" && (
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
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                Fermer
              </Button>
            </>
          )}
        </SheetFooter>
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
