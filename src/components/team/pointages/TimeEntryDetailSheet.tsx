import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertCircle,
  Calendar,
  Clock,
  History,
  Info,
  LogIn,
  LogOut,
  Pencil,
  StickyNote,
  Trash2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { qk } from "@/lib/queryKeys";
import { planningTimeEntriesApi } from "@/services/welloApi";
import type { AttendanceSource, Employee, PlanningTimeEntry } from "@/types/planning";

import { formatTimeEntryDuration } from "./timeEntryUtils";

interface TimeEntryDetailSheetProps {
  open: boolean;
  entry: PlanningTimeEntry | null;
  employee: Employee | null;
  /** Settings.attendance_source — when "planning", manual actions are refused by the API. */
  settingsAttendanceSource: AttendanceSource | null;
  onOpenChange: (open: boolean) => void;
}

/** Build an ISO timestamp from an `<input type="datetime-local">` value (local TZ). */
function toIsoFromLocal(input: string): string {
  if (!input) return new Date().toISOString();
  // datetime-local has no TZ; treat as local and convert to UTC ISO
  const d = new Date(input);
  return d.toISOString();
}

/** Pre-fill a datetime-local input with `new Date()` (yyyy-MM-ddTHH:mm). */
function nowLocalInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert an ISO timestamp to a datetime-local value (yyyy-MM-ddTHH:mm) in local TZ. */
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TimeEntryDetailSheet({
  open,
  entry,
  employee,
  settingsAttendanceSource,
  onOpenChange,
}: TimeEntryDetailSheetProps) {
  const qc = useQueryClient();

  const employeeId = employee?.id ?? null;
  const settingsAllowManual = settingsAttendanceSource === "pointage";

  // ── Current open entry (independent of the selected row) ───────────────
  const currentQ = useQuery({
    queryKey: employeeId ? qk.planningEmployees.currentTimeEntry(employeeId) : ["noop"],
    queryFn: () => planningTimeEntriesApi.current(employeeId!),
    enabled: open && !!employeeId,
  });
  const currentOpen = currentQ.data ?? null;

  // ── Local form state ─────────────────────────────────────────────────────
  const [startAt, setStartAt] = useState<string>(nowLocalInput());
  const [startNote, setStartNote] = useState<string>("");
  const [startShiftId, setStartShiftId] = useState<string>(entry?.shift_id ?? "");

  const [stopAt, setStopAt] = useState<string>(nowLocalInput());
  const [stopNote, setStopNote] = useState<string>("");

  // ── Edit selected entry state ────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [editClockIn, setEditClockIn] = useState<string>("");
  const [editClockOut, setEditClockOut] = useState<string>("");
  const [editClockInNote, setEditClockInNote] = useState<string>("");
  const [editClockOutNote, setEditClockOutNote] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");

  // ── Delete confirmation state ────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState<string>("");

  // Reset form when the sheet opens / the selected entry changes.
  useEffect(() => {
    if (!open) return;
    setStartAt(nowLocalInput());
    setStartNote("");
    setStartShiftId(entry?.shift_id ?? "");
    setStopAt(nowLocalInput());
    setStopNote("");
    setEditMode(false);
    setEditClockIn(isoToLocalInput(entry?.clock_in_at));
    setEditClockOut(isoToLocalInput(entry?.clock_out_at ?? null));
    setEditClockInNote(entry?.clock_in_note ?? "");
    setEditClockOutNote(entry?.clock_out_note ?? "");
    setEditReason("");
    setDeleteOpen(false);
    setDeleteReason("");
  }, [open, entry?.id, entry?.shift_id, entry?.clock_in_at, entry?.clock_out_at, entry?.clock_in_note, entry?.clock_out_note]);

  // ── Mutations ───────────────────────────────────────────────────────────
  const invalidate = () => {
    if (!employeeId) return;
    qc.invalidateQueries({ queryKey: qk.planningEmployees.timeEntries(employeeId) });
    qc.invalidateQueries({ queryKey: qk.planningEmployees.currentTimeEntry(employeeId) });
    // Also bust the page-level aggregated key so the table refreshes.
    qc.invalidateQueries({ queryKey: ["planning", "pointages"] });
  };

  const startMut = useMutation({
    mutationFn: () => {
      if (!employeeId) throw new Error("Employé manquant.");
      return planningTimeEntriesApi.start(employeeId, {
        shift_id: startShiftId.trim() || null,
        clock_in_at: toIsoFromLocal(startAt),
        clock_in_note: startNote.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Pointage démarré.");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message ?? "Impossible de démarrer le pointage."),
  });

  const stopMut = useMutation({
    mutationFn: () => {
      if (!employeeId) throw new Error("Employé manquant.");
      if (!currentOpen) throw new Error("Aucun pointage ouvert à arrêter.");
      const clockOut = toIsoFromLocal(stopAt);
      if (clockOut <= currentOpen.clock_in_at) {
        throw new Error("L'heure de sortie doit être postérieure à l'heure d'entrée.");
      }
      return planningTimeEntriesApi.stop(employeeId, {
        entry_id: currentOpen.id,
        clock_out_at: clockOut,
        clock_out_note: stopNote.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Pointage arrêté.");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message ?? "Impossible d'arrêter le pointage."),
  });

  // ── Update (correction manager) ─────────────────────────────────────────
  const updateMut = useMutation({
    mutationFn: () => {
      if (!employeeId || !entry) throw new Error("Pointage manquant.");
      const nextIn = toIsoFromLocal(editClockIn);
      const nextOut = editClockOut ? toIsoFromLocal(editClockOut) : null;
      if (nextOut && nextOut <= nextIn) {
        throw new Error("L'heure de sortie doit être postérieure à l'heure d'entrée.");
      }
      const reason = editReason.trim();
      if (!reason) throw new Error("Le motif de la correction est obligatoire.");
      return planningTimeEntriesApi.update(employeeId, entry.id, {
        clock_in_at: nextIn,
        clock_out_at: nextOut,
        clock_in_note: editClockInNote.trim() || null,
        clock_out_note: editClockOutNote.trim() || null,
        modification_reason: reason,
      });
    },
    onSuccess: () => {
      toast.success("Pointage corrigé.");
      invalidate();
      setEditMode(false);
      setEditReason("");
    },
    onError: (err: Error) => toast.error(err.message ?? "Impossible de corriger le pointage."),
  });

  // ── Delete (suppression manager) ────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: () => {
      if (!employeeId || !entry) throw new Error("Pointage manquant.");
      const reason = deleteReason.trim();
      if (!reason) throw new Error("Le motif de la suppression est obligatoire.");
      return planningTimeEntriesApi.delete(employeeId, entry.id, reason);
    },
    onSuccess: () => {
      toast.success("Pointage supprimé.");
      invalidate();
      setDeleteOpen(false);
      setDeleteReason("");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message ?? "Impossible de supprimer le pointage."),
  });

  // ── Derived ──────────────────────────────────────────────────────────────
  const displayedEntry = entry; // The selected row entry — purely display.
  const hasOpenEntry = !!currentOpen;

  const startDisabled =
    !employeeId || !settingsAllowManual || hasOpenEntry || startMut.isPending;
  const stopDisabled =
    !employeeId || !settingsAllowManual || !hasOpenEntry || stopMut.isPending;

  // Édition d'un pointage existant : interdite si la source est `planning`
  // (les corrections passent obligatoirement par le module de planning).
  const entryIsPlanningSourced = displayedEntry?.attendance_source === "planning";
  const editDisabledReason = useMemo<string | null>(() => {
    if (!displayedEntry) return "Aucun pointage sélectionné.";
    if (entryIsPlanningSourced)
      return "Pointage en mode 'planning' : édition manuelle interdite.";
    return null;
  }, [displayedEntry, entryIsPlanningSourced]);
  const canEdit = !editDisabledReason;
  const canSubmitEdit = canEdit && editReason.trim().length > 0 && !updateMut.isPending;
  const canSubmitDelete = canEdit && deleteReason.trim().length > 0 && !deleteMut.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Détail du pointage</SheetTitle>
          <SheetDescription>
            {employee
              ? `${employee.first_name} ${employee.last_name}`
              : "Aucun employé sélectionné"}
          </SheetDescription>
        </SheetHeader>

        {/* ── Settings banner ─────────────────────────────────────────── */}
        {!settingsAllowManual && (
          <div className="mt-4 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                Les actions manuelles start/stop sont désactivées : le paramètre planning
                <span className="font-medium"> attendance_source</span> vaut
                <span className="font-mono"> {settingsAttendanceSource ?? "?"}</span>.
                L'API refuserait ces requêtes.
              </div>
            </div>
          </div>
        )}

        {/* ── Selected entry summary (read-only OU édition in-place) ── */}
        {displayedEntry && (
          <section
            className={cn(
              "mt-4 rounded-md border p-3 text-sm",
              editMode ? "border-primary/40 bg-primary/5" : "bg-card",
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {editMode && <Pencil className="h-3.5 w-3.5" />}
                {editMode ? "Corriger ce pointage" : "Pointage sélectionné"}
              </div>
              <div className="flex items-center gap-2">
                {displayedEntry.modified_by && !editMode && (
                  <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-[10px] text-amber-900">
                    <History className="h-3 w-3" /> Corrigé
                  </Badge>
                )}
                {editMode && (
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Annuler l'édition"
                    disabled={updateMut.isPending}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {editMode ? (
              <>
                <div className="space-y-2">
                  <Field label="Heure d'entrée">
                    <Input
                      type="datetime-local"
                      value={editClockIn}
                      onChange={(e) => setEditClockIn(e.target.value)}
                      disabled={updateMut.isPending}
                      className="h-8 text-sm"
                    />
                  </Field>
                  <Field label="Heure de sortie" hint="Vide = pointage encore ouvert.">
                    <Input
                      type="datetime-local"
                      value={editClockOut}
                      onChange={(e) => setEditClockOut(e.target.value)}
                      disabled={updateMut.isPending}
                      className="h-8 text-sm"
                    />
                  </Field>
                  <Field label="Note d'entrée">
                    <Textarea
                      value={editClockInNote}
                      onChange={(e) => setEditClockInNote(e.target.value)}
                      rows={2}
                      disabled={updateMut.isPending}
                      className="text-sm"
                    />
                  </Field>
                  <Field label="Note de sortie">
                    <Textarea
                      value={editClockOutNote}
                      onChange={(e) => setEditClockOutNote(e.target.value)}
                      rows={2}
                      disabled={updateMut.isPending}
                      className="text-sm"
                    />
                  </Field>
                  <Field
                    label="Motif de la correction *"
                    hint="Obligatoire — journalisé côté serveur (audit légal)."
                  >
                    <Textarea
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      rows={2}
                      required
                      disabled={updateMut.isPending}
                      placeholder="Ex : l'employé a oublié de pointer en sortie"
                      className="text-sm"
                    />
                  </Field>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2 border-t pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditMode(false)}
                    disabled={updateMut.isPending}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!canSubmitEdit}
                    onClick={() => updateMut.mutate()}
                  >
                    Enregistrer la correction
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Row icon={Calendar} label="Date">
                  <span className="capitalize">
                    {format(parseISO(displayedEntry.clock_in_at), "EEEE d MMMM yyyy", { locale: fr })}
                  </span>
                </Row>
                <Row icon={LogIn} label="Entrée">
                  {format(parseISO(displayedEntry.clock_in_at), "HH:mm")}
                </Row>
                <Row icon={LogOut} label="Sortie">
                  {displayedEntry.clock_out_at
                    ? format(parseISO(displayedEntry.clock_out_at), "HH:mm")
                    : <span className="italic text-muted-foreground">en cours</span>}
                </Row>
                <Row icon={Clock} label="Durée">
                  {formatTimeEntryDuration(displayedEntry)}
                </Row>
                <Row icon={Info} label="Source">
                  <SourceBadge value={displayedEntry.attendance_source} />
                </Row>
                {displayedEntry.shift_id && (
                  <Row icon={User} label="Shift">
                    <span className="font-mono text-xs">{displayedEntry.shift_id}</span>
                  </Row>
                )}
                {displayedEntry.clock_in_note && (
                  <Row icon={StickyNote} label="Note d'entrée">
                    <span className="whitespace-pre-line">{displayedEntry.clock_in_note}</span>
                  </Row>
                )}
                {displayedEntry.clock_out_note && (
                  <Row icon={StickyNote} label="Note de sortie">
                    <span className="whitespace-pre-line">{displayedEntry.clock_out_note}</span>
                  </Row>
                )}
                {displayedEntry.modified_by && (
                  <Row icon={History} label="Correction">
                    <div className="space-y-0.5">
                      <div className="text-xs">
                        Modifié par <span className="font-medium">{displayedEntry.modified_by}</span>
                        {displayedEntry.modified_at && (
                          <> — le {format(parseISO(displayedEntry.modified_at), "dd/MM/yyyy HH:mm")}</>
                        )}
                      </div>
                      {displayedEntry.modification_reason && (
                        <div className="text-xs italic text-muted-foreground">
                          Motif : {displayedEntry.modification_reason}
                        </div>
                      )}
                      {/* TODO backend : exposer un historique complet des corrections
                          (ex. GET /planning/employees/{id}/time-entries/{eid}/audit).
                          Pour l'instant on n'affiche que la dernière modification connue. */}
                    </div>
                  </Row>
                )}

                {/* Action bar — corriger / supprimer */}
                <div className="mt-3 flex items-center justify-end gap-2 border-t pt-2">
                  <ActionButton
                    disabled={!canEdit}
                    disabledReason={editDisabledReason}
                    onClick={() => setEditMode(true)}
                    icon={Pencil}
                    label="Corriger"
                    variant="outline"
                  />
                  <ActionButton
                    disabled={!canEdit || deleteMut.isPending}
                    disabledReason={editDisabledReason}
                    onClick={() => setDeleteOpen(true)}
                    icon={Trash2}
                    label="Supprimer"
                    variant="destructive"
                  />
                </div>
              </>
            )}
          </section>
        )}

        {/* ── Current open entry indicator ────────────────────────────── */}
        <section className="mt-4">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Pointage en cours
          </div>
          {currentQ.isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : currentOpen ? (
            <div className="rounded-md border border-emerald-300/60 bg-emerald-50 p-2 text-xs text-emerald-900">
              Ouvert depuis {format(parseISO(currentOpen.clock_in_at), "dd/MM HH:mm")}
              {currentOpen.shift_id && (
                <> · shift <span className="font-mono">{currentOpen.shift_id}</span></>
              )}
            </div>
          ) : (
            <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
              Aucun pointage ouvert pour cet employé.
            </div>
          )}
        </section>

        {/* ── Manual start ────────────────────────────────────────────── */}
        <section
          className={cn(
            "mt-4 rounded-md border p-3 text-sm",
            startDisabled && "opacity-60",
          )}
        >
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <LogIn className="h-3.5 w-3.5" />
            Démarrer un pointage
          </div>
          <div className="space-y-2">
            <Field label="Heure d'entrée">
              <Input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                disabled={startDisabled}
                className="h-8 text-sm"
              />
            </Field>
            <Field label="Shift (optionnel)" hint="Le jour doit correspondre.">
              <Input
                value={startShiftId}
                onChange={(e) => setStartShiftId(e.target.value)}
                placeholder="sh-..."
                disabled={startDisabled}
                className="h-8 text-sm font-mono"
              />
            </Field>
            <Field label="Note">
              <Textarea
                value={startNote}
                onChange={(e) => setStartNote(e.target.value)}
                placeholder="Optionnelle"
                rows={2}
                disabled={startDisabled}
                className="text-sm"
              />
            </Field>
          </div>
          <Button
            type="button"
            size="sm"
            className="mt-3 w-full"
            disabled={startDisabled}
            onClick={() => startMut.mutate()}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Pointer une entrée
          </Button>
        </section>

        {/* ── Manual stop ─────────────────────────────────────────────── */}
        <section
          className={cn(
            "mt-4 rounded-md border p-3 text-sm",
            stopDisabled && "opacity-60",
          )}
        >
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <LogOut className="h-3.5 w-3.5" />
            Arrêter le pointage en cours
          </div>
          <div className="space-y-2">
            <Field label="Heure de sortie">
              <Input
                type="datetime-local"
                value={stopAt}
                onChange={(e) => setStopAt(e.target.value)}
                disabled={stopDisabled}
                className="h-8 text-sm"
              />
            </Field>
            <Field label="Note">
              <Textarea
                value={stopNote}
                onChange={(e) => setStopNote(e.target.value)}
                placeholder="Optionnelle"
                rows={2}
                disabled={stopDisabled}
                className="text-sm"
              />
            </Field>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-3 w-full"
            disabled={stopDisabled}
            onClick={() => stopMut.mutate()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Pointer une sortie
          </Button>
        </section>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Fermer
          </Button>
        </SheetFooter>
      </SheetContent>

      {/* ── Delete confirmation ───────────────────────────────── */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(o) => {
          if (!deleteMut.isPending) setDeleteOpen(o);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce pointage ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le motif est obligatoire et sera journalisé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Motif de la suppression *
            </label>
            <Textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={2}
              required
              disabled={deleteMut.isPending}
              placeholder="Ex : doublon ou erreur de pointage"
              className="text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={!canSubmitDelete}
              onClick={(e) => {
                e.preventDefault();
                deleteMut.mutate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}

// ─── Small presentation helpers (kept local, single-use) ───────────────────

interface RowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}

function Row({ icon: Icon, label, children }: RowProps) {
  return (
    <div className="flex items-start gap-2 py-1">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, hint, children }: FieldProps) {
  return (
    <div>
      <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function SourceBadge({ value }: { value: AttendanceSource }) {
  const isPointage = value === "pointage";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
        isPointage
          ? "bg-emerald-100 text-emerald-900"
          : "bg-indigo-100 text-indigo-900",
      )}
    >
      {value}
    </span>
  );
}

/**
 * Bouton d'action (Corriger / Supprimer) avec tooltip explicatif quand
 * désactivé pour une raison métier (ex : pointage en source planning).
 */
interface ActionButtonProps {
  disabled: boolean;
  disabledReason: string | null;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant: "outline" | "destructive";
}

function ActionButton({
  disabled,
  disabledReason,
  onClick,
  icon: Icon,
  label,
  variant,
}: ActionButtonProps) {
  const btn = (
    <Button
      type="button"
      size="sm"
      variant={variant}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="mr-1.5 h-3.5 w-3.5" />
      {label}
    </Button>
  );
  if (disabled && disabledReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          {/* Wrapper span pour permettre au tooltip de se déclencher
              malgré le `disabled` sur le bouton enfant. */}
          <TooltipTrigger asChild>
            <span className="inline-flex">{btn}</span>
          </TooltipTrigger>
          <TooltipContent>{disabledReason}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return btn;
}
