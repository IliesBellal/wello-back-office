import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { qk } from "@/lib/queryKeys";
import { planningPositionsApi } from "@/services/welloApi";
import type { EmployeePosition } from "@/types/planning";
import { PositionColorPicker } from "./PositionColorPicker";

interface PositionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PositionsModal({ open, onOpenChange }: PositionsModalProps) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("");
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  // Couleur de création : `""` = pas encore choisi (submit désactivé).
  // Pas de défaut silencieux — l'utilisateur DOIT sélectionner.
  const [newColor, setNewColor] = useState("");

  const positionsQuery = useQuery({
    queryKey: qk.planningPositions.all,
    queryFn: () => planningPositionsApi.list(),
    enabled: open,
  });

  const positions = (positionsQuery.data ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.planningPositions.all });

  const createMut = useMutation({
    mutationFn: (payload: { label: string; color: string }) =>
      planningPositionsApi.create({ label: payload.label, color: payload.color }),
    onSuccess: () => {
      toast.success("Poste créé");
      setCreating(false);
      setNewLabel("");
      setNewColor("");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message ?? "Erreur lors de la création"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof planningPositionsApi.update>[1] }) =>
      planningPositionsApi.update(id, payload),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message ?? "Erreur lors de la mise à jour"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => planningPositionsApi.delete(id),
    onSuccess: () => {
      toast.success("Poste supprimé");
      invalidate();
    },
    // The backend refuses the deletion when the position is still used by at
    // least one employee — surface the API message verbatim.
    onError: (err: Error) =>
      toast.error(err.message ?? "Suppression impossible : poste encore utilisé."),
  });

  function startEdit(p: EmployeePosition) {
    setEditingId(p.id);
    setEditLabel(p.label);
    setEditColor(p.color);
  }

  function commitEdit(p: EmployeePosition) {
    const lbl = editLabel.trim();
    const colorChanged = editColor && editColor !== p.color;
    const labelChanged = lbl && lbl !== p.label;
    if (!labelChanged && !colorChanged) {
      setEditingId(null);
      return;
    }
    const payload: { label?: string; color?: string } = {};
    if (labelChanged) payload.label = lbl;
    if (colorChanged) payload.color = editColor;
    updateMut.mutate({ id: p.id, payload });
  }

  function move(p: EmployeePosition, direction: -1 | 1) {
    const idx = positions.findIndex((x) => x.id === p.id);
    const swapWith = positions[idx + direction];
    if (!swapWith) return;
    // Two sequential patches — no batch endpoint exists.
    updateMut.mutate({ id: p.id, payload: { sort_order: swapWith.sort_order } });
    updateMut.mutate({ id: swapWith.id, payload: { sort_order: p.sort_order } });
  }

  function toggleActive(p: EmployeePosition, active: boolean) {
    updateMut.mutate({ id: p.id, payload: { active } });
  }

  function handleDelete(p: EmployeePosition) {
    if (!confirm(`Supprimer le poste « ${p.label} » ?`)) return;
    deleteMut.mutate(p.id);
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lbl = newLabel.trim();
    if (!lbl) return;
    // Couleur obligatoire — protection ceinture+bretelles ; le bouton est
    // déjà désactivé tant que `newColor` est vide.
    if (!/^#[0-9a-fA-F]{6}$/.test(newColor)) {
      toast.error("Choisis une couleur pour ce poste.");
      return;
    }
    createMut.mutate({ label: lbl, color: newColor });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gérer les postes</DialogTitle>
          <DialogDescription>
            Renomme, réordonne, active/désactive ou supprime les postes utilisés sur le planning.
            La suppression est refusée si des membres y sont encore rattachés.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-1.5 max-h-[55vh] overflow-y-auto">
          {positionsQuery.isLoading ? (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          ) : positions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun poste configuré.</p>
          ) : (
            positions.map((p, idx) => {
              const isEditing = editingId === p.id;
              const isFirst = idx === 0;
              const isLast = idx === positions.length - 1;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md border bg-card px-2 py-1.5",
                    !p.active && "opacity-60",
                  )}
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => move(p, -1)}
                      disabled={isFirst || updateMut.isPending}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Monter"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(p, 1)}
                      disabled={isLast || updateMut.isPending}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Descendre"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Pastille de couleur du poste (cliquable en mode édition pour changer). */}
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full border"
                    style={{ backgroundColor: isEditing ? editColor || p.color : p.color }}
                    title={isEditing ? editColor || p.color : p.color}
                    aria-label="Couleur du poste"
                  />

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <Input
                          autoFocus
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(p);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="h-8 text-sm"
                        />
                        <PositionColorPicker
                          value={editColor}
                          onChange={setEditColor}
                          disabled={updateMut.isPending}
                        />
                      </div>
                    ) : (
                      <div className="truncate text-sm font-medium">{p.label}</div>
                    )}
                    <div className="text-[11px] text-muted-foreground">
                      {p.employee_count} membre{p.employee_count !== 1 ? "s" : ""}
                    </div>
                  </div>

                  <Switch
                    checked={p.active}
                    onCheckedChange={(v) => toggleActive(p, v)}
                    disabled={updateMut.isPending}
                    aria-label="Actif"
                  />

                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => commitEdit(p)}
                          aria-label="Enregistrer"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setEditingId(null)}
                          aria-label="Annuler"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => startEdit(p)}
                        aria-label="Renommer"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(p)}
                      disabled={deleteMut.isPending}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          {creating ? (
            <form onSubmit={handleCreateSubmit} className="space-y-2 rounded-md border bg-muted/30 p-2">
              <Input
                autoFocus
                placeholder="Nom du poste"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="h-8 text-sm"
              />
              <PositionColorPicker
                value={newColor}
                onChange={setNewColor}
                disabled={createMut.isPending}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newLabel.trim() || !newColor || createMut.isPending}
                >
                  Ajouter
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCreating(false);
                    setNewLabel("");
                    setNewColor("");
                  }}
                >
                  Annuler
                </Button>
                {!newColor && (
                  <span className="text-[11px] text-muted-foreground">
                    Choisis une couleur (obligatoire).
                  </span>
                )}
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => setCreating(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un poste
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
