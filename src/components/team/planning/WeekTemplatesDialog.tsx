/**
 * Modale CRUD des **modèles de semaine** (week templates).
 *
 * Présentation : liste paginée des templates avec actions (éditer / supprimer),
 * bouton "Créer un modèle", et bouton "Enregistrer la semaine courante comme
 * modèle" (appelle `createFromWeek` avec la semaine actuellement affichée).
 *
 * L'éditeur de template est rendu inline en bas de liste (même pattern que
 * `ShiftTemplatesDialog`) : un mini-formulaire qui montre les 7 jours de la
 * semaine sous forme de colonnes, avec un bouton "+" par jour pour ajouter
 * un shift de template via la `ShiftSheet` allégée intégrée (`WeekTemplateShiftSheet`).
 *
 * Gating : `manage_plannings` (déjà appliqué au niveau de la page).
 */

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Save, Send, Trash2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { qk } from "@/lib/queryKeys";
import { planningPositionsApi } from "@/services/welloApi";
import { WeekTemplateService } from "@/services/weekTemplateService";
import type {
  Employee,
  PlanningShift,
  PlanningWeek,
  WeekTemplate,
  WeekTemplateShift,
  WeekTemplateShiftInput,
} from "@/types/planning";

import { WeekTemplateEditor } from "./WeekTemplateEditor";
import { ApplyWeekTemplateDialog } from "./ApplyWeekTemplateDialog";

interface WeekTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Semaine actuellement affichée — nécessaire pour "Enregistrer la semaine comme modèle". */
  currentWeek: PlanningWeek | null;
  currentWeekShifts: PlanningShift[];
  employees: Employee[];
}

type Screen =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; id: string }
  | { kind: "from-week" };

export function WeekTemplatesDialog({
  open,
  onOpenChange,
  currentWeek,
  currentWeekShifts,
  employees,
}: WeekTemplatesDialogProps) {
  const qc = useQueryClient();
  const [screen, setScreen] = useState<Screen>({ kind: "list" });
  const [applyingTemplate, setApplyingTemplate] = useState<WeekTemplate | null>(null);

  const listQuery = useQuery({
    queryKey: qk.planningWeekTemplates.all,
    queryFn: () => WeekTemplateService.list(),
    enabled: open,
  });

  const positionsQuery = useQuery({
    queryKey: qk.planningPositions.all,
    queryFn: () => planningPositionsApi.list(),
    enabled: open,
  });

  const editQuery = useQuery({
    queryKey: screen.kind === "edit" ? qk.planningWeekTemplates.detail(screen.id) : ["__noop__"],
    queryFn: () => {
      if (screen.kind !== "edit") throw new Error("noop");
      return WeekTemplateService.get(screen.id);
    },
    enabled: open && screen.kind === "edit",
  });

  useEffect(() => {
    if (!open) setScreen({ kind: "list" });
  }, [open]);

  const invalidateList = () => qc.invalidateQueries({ queryKey: qk.planningWeekTemplates.all });

  const deleteMut = useMutation({
    mutationFn: (id: string) => WeekTemplateService.remove(id),
    onSuccess: () => {
      toast.success("Modèle supprimé");
      invalidateList();
    },
    onError: (err: Error) => toast.error(err.message ?? "Suppression impossible"),
  });

  const templates = listQuery.data ?? [];
  const positions = positionsQuery.data ?? [];

  // ─── List screen ───────────────────────────────────────────────────────────
  if (screen.kind === "list") {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Semaines types</DialogTitle>
            <DialogDescription>
              Modèles réutilisables d'une semaine complète. La suppression est logique
              (le modèle est désactivé, pas effacé).
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-1.5 max-h-[55vh] overflow-y-auto">
            {listQuery.isLoading ? (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            ) : templates.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucune semaine type. Crées-en une, ou enregistre la semaine actuellement
                affichée comme modèle.
              </p>
            ) : (
              templates.map((t) => (
                <WeekTemplateRow
                  key={t.id}
                  template={t}
                  onApply={() => setApplyingTemplate(t)}
                  onEdit={() => setScreen({ kind: "edit", id: t.id })}
                  onDelete={() => {
                    if (!confirm(`Supprimer le modèle "${t.label}" ?`)) return;
                    deleteMut.mutate(t.id);
                  }}
                  deleteDisabled={deleteMut.isPending || !t.active}
                  applyDisabled={!t.active || t.shift_count === 0}
                />
              ))
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setScreen({ kind: "from-week" })}
              disabled={!currentWeek || currentWeekShifts.length === 0}
              title={
                !currentWeek
                  ? "Aucune semaine affichée"
                  : currentWeekShifts.length === 0
                    ? "La semaine affichée est vide"
                    : undefined
              }
            >
              <Save className="mr-2 h-4 w-4" />
              Enregistrer la semaine courante
            </Button>
            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
              <Button onClick={() => setScreen({ kind: "create" })}>
                <Plus className="mr-2 h-4 w-4" />
                Créer une semaine type
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        <ApplyWeekTemplateDialog
          open={applyingTemplate !== null}
          onOpenChange={(v) => { if (!v) setApplyingTemplate(null); }}
          template={applyingTemplate}
          defaultWeekStart={currentWeek?.start_date ?? null}
          employees={employees}
        />
      </>
    );
  }

  // ─── "From week" screen (label prompt) ─────────────────────────────────────
  if (screen.kind === "from-week") {
    return (
      <FromWeekScreen
        open={open}
        onOpenChange={onOpenChange}
        currentWeek={currentWeek!}
        currentWeekShifts={currentWeekShifts}
        positions={positions}
        onBack={() => setScreen({ kind: "list" })}
        onDone={() => {
          invalidateList();
          setScreen({ kind: "list" });
        }}
      />
    );
  }

  // ─── Create / Edit editor ──────────────────────────────────────────────────
  // Pour l'édition, on attend que `editQuery` ait chargé les shifts complets.
  const editorReady =
    screen.kind === "create" || (screen.kind === "edit" && editQuery.data !== undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {screen.kind === "create" ? "Nouvelle semaine type" : "Modifier la semaine type"}
          </DialogTitle>
          <DialogDescription>
            Définis les shifts du modèle. Tu pourras instancier ce modèle sur une semaine
            réelle depuis le planning.
          </DialogDescription>
        </DialogHeader>

        {!editorReady ? (
          <div className="space-y-2 py-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <WeekTemplateEditor
            mode={screen.kind === "create" ? "create" : "edit"}
            templateId={screen.kind === "edit" ? screen.id : null}
            initialLabel={screen.kind === "edit" ? editQuery.data!.week_template.label : ""}
            initialNotes={screen.kind === "edit" ? editQuery.data!.week_template.notes : null}
            initialActive={screen.kind === "edit" ? editQuery.data!.week_template.active : true}
            initialShifts={
              screen.kind === "edit"
                ? editQuery.data!.week_template_shifts.map(stripShiftId)
                : []
            }
            positions={positions}
            employees={employees}
            onCancel={() => setScreen({ kind: "list" })}
            onSaved={() => {
              invalidateList();
              setScreen({ kind: "list" });
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Strip ids — le formulaire interne manipule des `WeekTemplateShiftInput`. */
function stripShiftId(s: WeekTemplateShift): WeekTemplateShiftInput {
  // Destructurer explicitement pour ne pas faire fuiter l'id.
  const { id, ...input } = s;
  void id;
  return input;
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function WeekTemplateRow({
  template,
  onApply,
  onEdit,
  onDelete,
  deleteDisabled,
  applyDisabled,
}: {
  template: WeekTemplate;
  onApply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
  applyDisabled: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border bg-card px-3 py-2",
        !template.active && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{template.label}</span>
          <Badge variant="outline" className="text-[10px]">
            {template.shift_count} shift{template.shift_count > 1 ? "s" : ""}
          </Badge>
          {!template.active && <Badge variant="outline" className="text-[10px]">Inactif</Badge>}
        </div>
        {template.notes && (
          <p className="line-clamp-1 text-[11px] text-muted-foreground">{template.notes}</p>
        )}
        <p className="text-[11px] text-muted-foreground">
          MAJ {new Date(template.updated_at).toLocaleDateString("fr-FR")}
        </p>
      </div>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={onApply}
        disabled={applyDisabled}
        aria-label="Appliquer"
        title="Appliquer à une ou plusieurs semaines"
      >
        <Send className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={onEdit}
        aria-label="Modifier"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
        disabled={deleteDisabled}
        aria-label="Supprimer"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── "From week" sub-screen ──────────────────────────────────────────────────

function FromWeekScreen({
  open,
  onOpenChange,
  currentWeek,
  currentWeekShifts,
  positions,
  onBack,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWeek: PlanningWeek;
  currentWeekShifts: PlanningShift[];
  positions: { id: string; label: string }[];
  onBack: () => void;
  onDone: () => void;
}) {
  const [label, setLabel] = useState(`Modèle — ${currentWeek.label || currentWeek.start_date}`);
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      WeekTemplateService.createFromWeek(
        { week_id: currentWeek.id, label: label.trim(), notes: notes.trim() || null },
        currentWeekShifts,
        positions,
      ),
    onSuccess: () => {
      toast.success("Modèle créé à partir de la semaine courante");
      onDone();
    },
    onError: (err: Error) => toast.error(err.message ?? "Création impossible"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enregistrer la semaine courante</DialogTitle>
          <DialogDescription>
            Copie les {currentWeekShifts.length} shift
            {currentWeekShifts.length > 1 ? "s" : ""} de la semaine affichée en conservant
            les employés assignés.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!label.trim()) {
              toast.error("Le libellé du modèle est obligatoire.");
              return;
            }
            mut.mutate();
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="wtmpl-fromweek-label">Libellé</Label>
            <Input
              id="wtmpl-fromweek-label"
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Semaine type été…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wtmpl-fromweek-notes">Notes (optionnel)</Label>
            <Textarea
              id="wtmpl-fromweek-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Affluence forte, planning rodé…"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onBack} disabled={mut.isPending}>
              Retour
            </Button>
            <Button type="submit" disabled={!label.trim() || mut.isPending}>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer le modèle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
