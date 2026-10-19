import { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical, Info, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Promotion } from '@/types/promotions';
import { sortByApplicationOrder } from '@/services/promotionsService';

interface PromotionOrderDialogProps {
  open: boolean;
  promotions: Promotion[];
  onClose: () => void;
  onSave: (ordered: Promotion[]) => Promise<void>;
}

function SortablePromotionRow({
  promo,
  index,
  count,
  disabled,
  onMove,
}: {
  promo: Promotion;
  index: number;
  count: number;
  disabled: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: promo.id,
    disabled,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-md border border-border bg-card p-2 ${
        isDragging ? 'relative z-10 shadow-lg' : ''
      } ${promo.active ? '' : 'opacity-60'}`}
    >
      <button
        type="button"
        className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
        aria-label={`Déplacer « ${promo.name} »`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Badge variant="outline" className="shrink-0 tabular-nums">
        {index + 1}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{promo.name}</p>
        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          <span>{promo.is_cumulative ? 'Cumulable' : 'Non cumulable'}</span>
          {!promo.active && <span>· Inactive</span>}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={disabled || index === 0}
        onClick={() => onMove(index, -1)}
        title="Monter"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={disabled || index === count - 1}
        onClick={() => onMove(index, 1)}
        title="Descendre"
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
    </li>
  );
}

export function PromotionOrderDialog({ open, promotions, onClose, onSave }: PromotionOrderDialogProps) {
  const [ordered, setOrdered] = useState<Promotion[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setOrdered(sortByApplicationOrder(promotions));
  }, [open, promotions]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setOrdered(prev => {
      const from = prev.findIndex(p => p.id === active.id);
      const to = prev.findIndex(p => p.id === over.id);
      return arrayMove(prev, from, to);
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    setOrdered(prev => arrayMove(prev, index, index + direction));
  };

  // Rien à enregistrer si l'ordre affiché est celui déjà appliqué, rangs
  // distincts compris (des égalités sont normalisées en 1..n).
  const isUnchanged = ordered.every((p, i) => p.preferred_order === i + 1);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(ordered);
      onClose();
    } catch {
      // Erreur déjà signalée (toast de l'apiClient) : la boîte reste ouverte.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && !saving && onClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ordre d'application des promotions</DialogTitle>
          <DialogDescription>
            Glissez les promotions ou utilisez les flèches. La première de la liste est appliquée en priorité.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-1">
            <p>
              Les promotions sont évaluées de haut en bas. Un article déjà remisé par une promotion ne peut plus l'être
              par les suivantes.
            </p>
            <p>
              Dès qu'une promotion <strong>non cumulable</strong> s'applique, les suivantes sont ignorées. Une promotion
              non cumulable est aussi ignorée si une promotion placée avant elle s'est déjà appliquée.
            </p>
          </div>
        </div>

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ordered.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {ordered.map((promo, index) => (
                  <SortablePromotionRow
                    key={promo.id}
                    promo={promo}
                    index={index}
                    count={ordered.length}
                    disabled={saving}
                    onMove={move}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button
            type="button"
            className="bg-gradient-primary"
            onClick={handleSubmit}
            disabled={saving || isUnchanged}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer l'ordre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
