import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { GripVertical, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Category } from '@/types/menu';

/** Même borne que l'API (productcateg.course_step). */
const MAX_STEP = 20;
/** Étapes proposées d'office : entrées, plats, desserts. */
const DEFAULT_STEP_COUNT = 3;

/** Couleur d'une étape : la même que celle de la suite sur la caisse. */
const STEP_COLORS = ['#7c5cdb', '#0e8f80', '#c26a12', '#c93a70', '#2f6fd6', '#5e8c17'];
const stepColor = (step: number) => STEP_COLORS[(step - 1) % STEP_COLORS.length];

/** Libellés proposés pour les premières étapes ; les suivantes sont numérotées. */
const stepTitle = (step: number) => {
  switch (step) {
    case 1:
      return 'Entrées';
    case 2:
      return 'Plats';
    case 3:
      return 'Desserts';
    default:
      return `Étape ${step}`;
  }
};

const NONE = 'none';
const columnId = (step: number | null) => (step === null ? NONE : `step-${step}`);
const stepOfColumn = (id: string): number | null => (id === NONE ? null : Number(id.replace('step-', '')));

const categoryName = (category: Category) => category.category_name || category.category;

interface CourseStepsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  /** Enregistre les changements ; renvoie le nombre de mises à jour et les ids en échec. */
  onSave: (
    changes: Array<{ categoryId: string; step: number | null }>
  ) => Promise<{ updated: number; failed: string[] }>;
}

/**
 * Réglage des suites : on range les catégories caisse par étape de service.
 * Les catégories d'une même colonne partent ensemble en cuisine ; une
 * catégorie « Hors suite » (boissons…) part tout de suite. Un établissement
 * qui ne veut pas de suites laisse tout en « Hors suite ».
 */
export function CourseStepsDialog({ open, onOpenChange, categories, onSave }: CourseStepsDialogProps) {
  const initial = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const category of categories) map[category.category_id] = category.course_step ?? null;
    return map;
  }, [categories]);

  const [assignment, setAssignment] = useState<Record<string, number | null>>(initial);
  const [stepCount, setStepCount] = useState(DEFAULT_STEP_COUNT);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // À chaque ouverture : on repart de l'état enregistré.
  useEffect(() => {
    if (!open) return;
    setAssignment(initial);
    const highest = Math.max(0, ...Object.values(initial).map((step) => step ?? 0));
    setStepCount(Math.min(MAX_STEP, Math.max(DEFAULT_STEP_COUNT, highest)));
  }, [open, initial]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const steps = Array.from({ length: stepCount }, (_, index) => index + 1);
  const inColumn = (step: number | null) =>
    categories.filter((category) => (assignment[category.category_id] ?? null) === step);

  const changes = categories
    .filter((category) => (assignment[category.category_id] ?? null) !== (category.course_step ?? null))
    .map((category) => ({ categoryId: category.category_id, step: assignment[category.category_id] ?? null }));

  const lastStepIsEmpty = stepCount > 1 && inColumn(stepCount).length === 0;
  const activeCategory = categories.find((category) => category.category_id === activeId);

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    if (!event.over) return;
    const step = stepOfColumn(String(event.over.id));
    setAssignment((prev) => ({ ...prev, [String(event.active.id)]: step }));
  };

  const handleSave = async () => {
    if (changes.length === 0) {
      onOpenChange(false);
      return;
    }
    setIsSaving(true);
    try {
      const result = await onSave(changes);
      if (result.failed.length === 0) onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gérer les suites</DialogTitle>
          <DialogDescription>
            Glissez chaque catégorie dans l'étape où ses produits doivent être servis. Les catégories d'une même
            étape partent ensemble en cuisine ; « Hors suite » (boissons…) part tout de suite. Pour ne pas
            utiliser les suites, laissez tout en « Hors suite ».
          </DialogDescription>
        </DialogHeader>

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Column
              id={columnId(null)}
              title="Hors suite"
              subtitle="Part tout de suite"
              categories={inColumn(null)}
            />
            {steps.map((step) => (
              <Column
                key={step}
                id={columnId(step)}
                title={`${step} · ${stepTitle(step)}`}
                color={stepColor(step)}
                categories={inColumn(step)}
                onRemove={step === stepCount && lastStepIsEmpty ? () => setStepCount(stepCount - 1) : undefined}
              />
            ))}
          </div>

          {/*
            La fenêtre est centrée par une transformation CSS : un élément
            `position: fixed` placé dedans se positionne par rapport à elle et non
            à l'écran, d'où le décalage avec le curseur. On l'affiche donc dans
            `body`, au-dessus de la fenêtre.
          */}
          {createPortal(
            <DragOverlay zIndex={100}>
              {activeCategory ? <CategoryChip name={categoryName(activeCategory)} isOverlay /> : null}
            </DragOverlay>,
            document.body
          )}
        </DndContext>

        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStepCount((count) => Math.min(MAX_STEP, count + 1))}
            disabled={stepCount >= MAX_STEP}
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une étape
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving || changes.length === 0}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enregistrer{changes.length > 0 ? ` (${changes.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ColumnProps {
  id: string;
  title: string;
  subtitle?: string;
  color?: string;
  categories: Category[];
  onRemove?: () => void;
}

function Column({ id, title, subtitle, color, categories, onRemove }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg border bg-card p-3 min-h-[8rem] transition-colors',
        isOver ? 'border-primary bg-primary/5' : 'border-border'
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        {color && <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {onRemove && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove} title="Supprimer l'étape">
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {categories.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">Glissez une catégorie ici</p>
        ) : (
          categories.map((category) => (
            <DraggableCategory key={category.category_id} category={category} />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableCategory({ category }: { category: Category }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: category.category_id });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cn(isDragging && 'opacity-40')}>
      <CategoryChip name={categoryName(category)} color={category.bg_color} />
    </div>
  );
}

function CategoryChip({ name, color, isOverlay }: { name: string; color?: string; isOverlay?: boolean }) {
  const hasColor = !!color && color.toLowerCase() !== '#ffffff';
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm cursor-grab active:cursor-grabbing',
        isOverlay && 'shadow-lg'
      )}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
      {hasColor && <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />}
      <span className="truncate">{name}</span>
    </div>
  );
}
