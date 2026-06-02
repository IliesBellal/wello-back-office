import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { qk } from "@/lib/queryKeys";
import { planningPositionsApi } from "@/services/welloApi";
import { ShiftTemplateService } from "@/services/shiftTemplateService";
import type {
  ShiftTemplate,
  ShiftTemplateCreateRequest,
  ShiftTemplateUpdateRequest,
} from "@/types/shiftTemplate";

interface ShiftTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PALETTE = [
  "#10b981", "#6366f1", "#f59e0b", "#ef4444",
  "#3b82f6", "#a855f7", "#ec4899", "#14b8a6",
  "#64748b", "#84cc16",
];

const NONE_POSITION = "__none__";

type DraftState = {
  label: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  position_id: string | null;
  color: string;
};

function emptyDraft(): DraftState {
  return {
    label: "",
    start_time: "09:00",
    end_time: "17:00",
    break_minutes: 30,
    position_id: null,
    color: PALETTE[0],
  };
}

function draftFromTemplate(t: ShiftTemplate): DraftState {
  return {
    label: t.label,
    start_time: t.start_time,
    end_time: t.end_time,
    break_minutes: t.break_minutes,
    position_id: t.position_id,
    color: t.color,
  };
}

export function ShiftTemplatesDialog({ open, onOpenChange }: ShiftTemplatesDialogProps) {
  const qc = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: qk.planningShiftTemplates.all,
    queryFn: () => ShiftTemplateService.list(),
    enabled: open,
  });

  const positionsQuery = useQuery({
    queryKey: qk.planningPositions.all,
    queryFn: () => planningPositionsApi.list(),
    enabled: open,
  });

  const templates = templatesQuery.data ?? [];
  const positions = positionsQuery.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.planningShiftTemplates.all });

  // ─── Form state — gère création OU édition d'un template ───────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);

  useEffect(() => {
    if (!open) {
      setCreating(false);
      setEditingId(null);
    }
  }, [open]);

  function startCreate() {
    setEditingId(null);
    setDraft(emptyDraft());
    setCreating(true);
  }
  function startEdit(t: ShiftTemplate) {
    setCreating(false);
    setEditingId(t.id);
    setDraft(draftFromTemplate(t));
  }
  function cancelForm() {
    setCreating(false);
    setEditingId(null);
  }

  const createMut = useMutation({
    mutationFn: (payload: ShiftTemplateCreateRequest) => ShiftTemplateService.create(payload),
    onSuccess: () => {
      toast.success("Modèle créé");
      cancelForm();
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message ?? "Erreur lors de la création"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ShiftTemplateUpdateRequest }) =>
      ShiftTemplateService.update(id, payload),
    onSuccess: () => {
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message ?? "Erreur lors de la mise à jour"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => ShiftTemplateService.remove(id),
    onSuccess: () => {
      toast.success("Modèle supprimé");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message ?? "Suppression impossible"),
  });

  function move(t: ShiftTemplate, direction: -1 | 1) {
    const sorted = [...templates].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((x) => x.id === t.id);
    const swapWith = sorted[idx + direction];
    if (!swapWith) return;
    updateMut.mutate({ id: t.id, payload: { sort_order: swapWith.sort_order } });
    updateMut.mutate({ id: swapWith.id, payload: { sort_order: t.sort_order } });
  }

  function handleDelete(t: ShiftTemplate) {
    if (!confirm(`Supprimer le modèle « ${t.label} » ?`)) return;
    deleteMut.mutate(t.id);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const label = draft.label.trim();
    if (!label) return;
    if (draft.end_time <= draft.start_time) {
      toast.error("L'heure de fin doit être après l'heure de début.");
      return;
    }
    const payload = {
      label,
      start_time: draft.start_time,
      end_time: draft.end_time,
      break_minutes: Math.max(0, draft.break_minutes),
      position_id: draft.position_id,
      color: draft.color,
    };
    if (editingId) {
      updateMut.mutate({ id: editingId, payload }, { onSuccess: () => { toast.success("Modèle mis à jour"); cancelForm(); } });
    } else {
      createMut.mutate(payload);
    }
  }

  const sortedTemplates = [...templates].sort((a, b) => a.sort_order - b.sort_order);
  const positionLabelById = new Map(positions.map((p) => [p.id, p.label]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3x2">
        <DialogHeader>
          <DialogTitle>Modèles de shift</DialogTitle>
          <DialogDescription>
            Créneaux types réutilisables au moment de créer un shift sur le planning.
            La suppression est logique (le modèle est désactivé, pas effacé).
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-1.5 max-h-[55vh] overflow-y-auto">
          {templatesQuery.isLoading ? (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          ) : sortedTemplates.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun modèle configuré.</p>
          ) : (
            sortedTemplates.map((t, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === sortedTemplates.length - 1;
              const positionLabel = t.position_id ? positionLabelById.get(t.position_id) ?? "—" : "Toutes positions";
              return (
                <div
                  key={t.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md border bg-card px-2 py-1.5",
                    !t.active && "opacity-60",
                  )}
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => move(t, -1)}
                      disabled={isFirst || updateMut.isPending}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Monter"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(t, 1)}
                      disabled={isLast || updateMut.isPending}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Descendre"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>

                  <span
                    className="inline-block h-3.5 w-3.5 flex-shrink-0 rounded-full ring-1 ring-border"
                    style={{ backgroundColor: t.color }}
                    aria-hidden
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{t.label}</span>
                      {!t.active && <Badge variant="outline" className="text-[10px]">Inactif</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {t.start_time}–{t.end_time}
                      {t.break_minutes > 0 ? ` · pause ${t.break_minutes} min` : ""}
                      {" · "}
                      {positionLabel}
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => startEdit(t)}
                    aria-label="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(t)}
                    disabled={deleteMut.isPending || !t.active}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}

          {(creating || editingId) ? (
            <form
              onSubmit={handleSubmit}
              className="mt-3 space-y-3 rounded-md border bg-muted/30 p-3"
            >
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tmpl-label">Nom du modèle</Label>
                  <Input
                    id="tmpl-label"
                    autoFocus
                    value={draft.label}
                    onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                    placeholder="Service midi, Coupure…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Couleur</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-md border bg-background"
                        aria-label="Choisir une couleur"
                      >
                        <span
                          className="inline-block h-5 w-5 rounded-full ring-1 ring-border"
                          style={{ backgroundColor: draft.color }}
                        />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                      <div className="grid grid-cols-5 gap-1.5">
                        {PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setDraft((d) => ({ ...d, color: c }))}
                            className={cn(
                              "h-6 w-6 rounded-full ring-1 ring-border transition",
                              draft.color === c && "ring-2 ring-foreground",
                            )}
                            style={{ backgroundColor: c }}
                            aria-label={c}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tmpl-start">Début</Label>
                  <Input
                    id="tmpl-start"
                    type="time"
                    value={draft.start_time}
                    onChange={(e) => setDraft((d) => ({ ...d, start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tmpl-end">Fin</Label>
                  <Input
                    id="tmpl-end"
                    type="time"
                    value={draft.end_time}
                    onChange={(e) => setDraft((d) => ({ ...d, end_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tmpl-break">Pause (min)</Label>
                  <Input
                    id="tmpl-break"
                    type="number"
                    min={0}
                    step={5}
                    value={draft.break_minutes}
                    onChange={(e) => setDraft((d) => ({ ...d, break_minutes: Math.max(0, Number(e.target.value) || 0) }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tmpl-position">Poste</Label>
                <Select
                  value={draft.position_id ?? NONE_POSITION}
                  onValueChange={(v) => setDraft((d) => ({ ...d, position_id: v === NONE_POSITION ? null : v }))}
                >
                  <SelectTrigger id="tmpl-position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_POSITION}>Toutes positions</SelectItem>
                    {positions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" size="sm" variant="ghost" onClick={cancelForm}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!draft.label.trim() || createMut.isPending || updateMut.isPending}
                >
                  {editingId ? "Enregistrer" : "Créer"}
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={startCreate}
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un modèle
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
