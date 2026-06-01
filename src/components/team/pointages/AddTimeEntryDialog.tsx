/**
 * AddTimeEntryDialog — création manuelle d'un pointage complet par un manager.
 *
 * Cas d'usage : l'employé a oublié de pointer. Le manager saisit le bloc
 * d'entrée + sortie + motif obligatoire (audit légal). Endpoint cible :
 * `POST /planning/employees/{id}/time-entries` (à confirmer côté backend —
 * cf. docs/personnel-backend-gaps.md).
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { planningTimeEntriesApi } from "@/services/welloApi";
import type { AttendanceSource, Employee } from "@/types/planning";

interface AddTimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  /** Présélection éventuelle (filtre actif sur la page). */
  defaultEmployeeId?: string | null;
  /** Settings.attendance_source — quand "planning", l'API refuse la création. */
  settingsAttendanceSource: AttendanceSource | null;
}

/** Pre-fill a datetime-local input with `new Date()` (yyyy-MM-ddTHH:mm). */
function nowLocalInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoFromLocal(input: string): string {
  if (!input) return new Date().toISOString();
  return new Date(input).toISOString();
}

export function AddTimeEntryDialog({
  open,
  onOpenChange,
  employees,
  defaultEmployeeId,
  settingsAttendanceSource,
}: AddTimeEntryDialogProps) {
  const qc = useQueryClient();
  const settingsAllowManual = settingsAttendanceSource === "pointage";

  const [employeeId, setEmployeeId] = useState<string>("");
  const [clockIn, setClockIn] = useState<string>("");
  const [clockOut, setClockOut] = useState<string>("");
  const [clockInNote, setClockInNote] = useState<string>("");
  const [clockOutNote, setClockOutNote] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  // Reset à chaque ouverture.
  useEffect(() => {
    if (!open) return;
    setEmployeeId(defaultEmployeeId ?? "");
    const now = nowLocalInput();
    setClockIn(now);
    setClockOut(now);
    setClockInNote("");
    setClockOutNote("");
    setReason("");
  }, [open, defaultEmployeeId]);

  const sortedEmployees = useMemo(
    () =>
      [...employees].sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`),
      ),
    [employees],
  );

  const createMut = useMutation({
    mutationFn: () => {
      if (!employeeId) throw new Error("Choisis un employé.");
      if (!clockIn || !clockOut) throw new Error("Heure d'entrée et de sortie obligatoires.");
      const isoIn = toIsoFromLocal(clockIn);
      const isoOut = toIsoFromLocal(clockOut);
      if (isoOut <= isoIn) {
        throw new Error("L'heure de sortie doit être postérieure à l'heure d'entrée.");
      }
      const trimmedReason = reason.trim();
      if (!trimmedReason) throw new Error("Le motif est obligatoire.");
      return planningTimeEntriesApi.create(employeeId, {
        clock_in_at: isoIn,
        clock_out_at: isoOut,
        clock_in_note: clockInNote.trim() || null,
        clock_out_note: clockOutNote.trim() || null,
        modification_reason: trimmedReason,
      });
    },
    onSuccess: () => {
      toast.success("Pointage créé.");
      qc.invalidateQueries({ queryKey: qk.planningEmployees.timeEntries(employeeId) });
      qc.invalidateQueries({ queryKey: qk.planningEmployees.currentTimeEntry(employeeId) });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message ?? "Impossible de créer le pointage."),
  });

  const canSubmit =
    settingsAllowManual &&
    !!employeeId &&
    !!clockIn &&
    !!clockOut &&
    reason.trim().length > 0 &&
    !createMut.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!createMut.isPending) onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un pointage</DialogTitle>
          <DialogDescription>
            Création manuelle d'un pointage (ex : l'employé a oublié de pointer). Le motif
            est obligatoire et sera journalisé.
          </DialogDescription>
        </DialogHeader>

        {!settingsAllowManual && (
          <div className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            La création manuelle est désactivée : le paramètre planning{" "}
            <span className="font-mono">attendance_source</span> vaut{" "}
            <span className="font-mono">{settingsAttendanceSource ?? "?"}</span>. L'API
            refuserait la requête.
          </div>
        )}

        <div className="space-y-3 py-2">
          <FieldBlock label="Employé *">
            <Select
              value={employeeId}
              onValueChange={setEmployeeId}
              disabled={createMut.isPending}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Choisir un employé" />
              </SelectTrigger>
              <SelectContent>
                {sortedEmployees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.first_name} {e.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldBlock>

          <div className="grid grid-cols-2 gap-2">
            <FieldBlock label="Entrée *">
              <Input
                type="datetime-local"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                disabled={createMut.isPending}
                className="h-9"
              />
            </FieldBlock>
            <FieldBlock label="Sortie *">
              <Input
                type="datetime-local"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                disabled={createMut.isPending}
                className="h-9"
              />
            </FieldBlock>
          </div>

          <FieldBlock label="Note d'entrée">
            <Textarea
              value={clockInNote}
              onChange={(e) => setClockInNote(e.target.value)}
              rows={2}
              disabled={createMut.isPending}
              placeholder="Optionnelle"
            />
          </FieldBlock>

          <FieldBlock label="Note de sortie">
            <Textarea
              value={clockOutNote}
              onChange={(e) => setClockOutNote(e.target.value)}
              rows={2}
              disabled={createMut.isPending}
              placeholder="Optionnelle"
            />
          </FieldBlock>

          <FieldBlock label="Motif *" hint="Obligatoire — journalisé côté serveur.">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              required
              disabled={createMut.isPending}
              placeholder="Ex : oubli de pointage le matin"
            />
          </FieldBlock>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={createMut.isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => createMut.mutate()}
          >
            Créer le pointage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldBlock({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
