import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeftRight, CheckCircle2, Info, Trash2, XCircle } from "lucide-react";
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
import { planningSwapApi } from "@/services/welloApi";
import type {
  Employee,
  PlanningShiftSwapRequest,
  ShiftSwapApprovalMode,
} from "@/types/planning";

import { StatusBadge } from "./statusBadges";

type Mode = "view" | "create";

interface ShiftSwapSheetProps {
  open: boolean;
  mode: Mode;
  request: PlanningShiftSwapRequest | null;
  employees: Employee[];
  approvalMode: ShiftSwapApprovalMode | null;
  onOpenChange: (open: boolean) => void;
}

export function ShiftSwapSheet({
  open,
  mode,
  request,
  employees,
  approvalMode,
  onOpenChange,
}: ShiftSwapSheetProps) {
  const qc = useQueryClient();
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const requester = request ? employeeById.get(request.requester_employee_id) ?? null : null;
  const target = request ? employeeById.get(request.target_employee_id) ?? null : null;

  // ── Form state ─────────────────────────────────────────────────────────
  const [requesterEmployeeId, setRequesterEmployeeId] = useState<string>("");
  const [requesterShiftId, setRequesterShiftId] = useState<string>("");
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>("");
  const [targetShiftId, setTargetShiftId] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [managerNote, setManagerNote] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      setRequesterEmployeeId(employees[0]?.id ?? "");
      setRequesterShiftId("");
      setTargetEmployeeId(employees[1]?.id ?? "");
      setTargetShiftId("");
      setReason("");
      setManagerNote("");
    } else if (request) {
      setRequesterEmployeeId(request.requester_employee_id);
      setRequesterShiftId(request.requester_shift_id);
      setTargetEmployeeId(request.target_employee_id);
      setTargetShiftId(request.target_shift_id);
      setReason(request.reason ?? "");
      setManagerNote(request.manager_note ?? "");
    }
  }, [open, mode, request, employees]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.planningSwaps.all });
    // Also invalidate week shifts (approval reassigns both shifts).
    qc.invalidateQueries({ queryKey: ["planning", "weeks"] });
  };

  const createMut = useMutation({
    mutationFn: () =>
      planningSwapApi.create({
        requester_employee_id: requesterEmployeeId,
        requester_shift_id: requesterShiftId.trim(),
        target_employee_id: targetEmployeeId,
        target_shift_id: targetShiftId.trim(),
        reason: reason.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Demande d'échange créée.");
      invalidate();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message ?? "Création impossible."),
  });

  const approveMut = useMutation({
    mutationFn: () => {
      if (!request) throw new Error("Demande introuvable.");
      return planningSwapApi.update(request.id, {
        status: "approved",
        manager_note: managerNote.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Échange approuvé. Les deux shifts ont été réaffectés.");
      invalidate();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message ?? "Approbation impossible."),
  });

  const rejectMut = useMutation({
    mutationFn: () => {
      if (!request) throw new Error("Demande introuvable.");
      return planningSwapApi.update(request.id, {
        status: "rejected",
        manager_note: managerNote.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Échange rejeté.");
      invalidate();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message ?? "Rejet impossible."),
  });

  const deleteMut = useMutation({
    mutationFn: () => {
      if (!request) throw new Error("Demande introuvable.");
      return planningSwapApi.delete(request.id);
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
    approveMut.isPending ||
    rejectMut.isPending ||
    deleteMut.isPending;

  // Approval visibility depends on settings.shift_swap_approval_mode.
  const isManagerMode = approvalMode === "manager_required";
  const isTargetMode = approvalMode === "target_employee_required";
  const canManagerApprove = pending && isManagerMode;
  const targetApprovalNotice = pending && isTargetMode;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "create" ? "Nouvelle demande d'échange" : "Demande d'échange"}
          </SheetTitle>
          <SheetDescription>
            {mode === "view" && requester && target
              ? `${requester.first_name} ${requester.last_name} ↔ ${target.first_name} ${target.last_name}`
              : "Échange de shifts entre deux employés."}
          </SheetDescription>
        </SheetHeader>

        {/* ── Status + approval mode ──────────────────────────────────── */}
        {mode === "view" && request && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge value={request.status} />
            {approvalMode && (
              <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Mode : {isManagerMode ? "Manager" : "Employé cible"}
              </span>
            )}
          </div>
        )}

        {targetApprovalNotice && (
          <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 p-2 text-[11px] text-amber-900">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              Le paramètre <span className="font-mono">shift_swap_approval_mode</span> vaut
              <span className="font-medium"> target_employee_required</span> : seul l'employé
              cible peut approuver cet échange. Vous pouvez toutefois le rejeter en tant que
              manager.
            </div>
          </div>
        )}

        {/* ── Form ──────────────────────────────────────────────────── */}
        <section className="mt-4 space-y-3 rounded-md border bg-card p-3 text-sm">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Demandeur
          </div>
          <Field label="Employé">
            <Select
              value={requesterEmployeeId}
              onValueChange={setRequesterEmployeeId}
              disabled={mode !== "create"}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Sélectionner" />
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
          <Field label="Shift">
            <Input
              value={requesterShiftId}
              onChange={(e) => setRequesterShiftId(e.target.value)}
              placeholder="sh-..."
              disabled={mode !== "create"}
              className="h-8 text-sm font-mono"
            />
          </Field>

          <div className="mt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Cible
          </div>
          <Field label="Employé">
            <Select
              value={targetEmployeeId}
              onValueChange={setTargetEmployeeId}
              disabled={mode !== "create"}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Sélectionner" />
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
          <Field label="Shift">
            <Input
              value={targetShiftId}
              onChange={(e) => setTargetShiftId(e.target.value)}
              placeholder="sh-..."
              disabled={mode !== "create"}
              className="h-8 text-sm font-mono"
            />
          </Field>

          <Field label="Motif">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Optionnel"
              disabled={mode !== "create"}
              className="text-sm"
            />
          </Field>
        </section>

        {/* ── Manager note + processed-at ─────────────────────────────── */}
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
            <Button
              onClick={() => createMut.mutate()}
              disabled={anyMut || !requesterEmployeeId || !targetEmployeeId || !requesterShiftId.trim() || !targetShiftId.trim()}
              className="w-full"
            >
              Créer la demande
            </Button>
          ) : (
            <>
              {pending && (
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button
                    variant="default"
                    onClick={() => approveMut.mutate()}
                    disabled={anyMut || !canManagerApprove}
                    title={
                      isTargetMode
                        ? "Seul l'employé cible peut approuver cet échange."
                        : undefined
                    }
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
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <div>
      <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
