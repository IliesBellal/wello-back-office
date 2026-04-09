import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2, Edit, ChevronLeft, Settings2, GripVertical } from 'lucide-react';
import { useMenuData } from '@/hooks/useMenuData';
import { Attribute, AttributeOption } from '@/types/menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── helpers ─────────────────────────────────────────────────────────────────

const formatPrice = (cents: number) => (cents / 100).toFixed(2);
const parsePrice = (value: string) => Math.round(parseFloat(value || '0') * 100);

const getOptionPrice = (opt: AttributeOption) =>
  opt.extra_price !== undefined ? opt.extra_price : (opt.price ?? 0);

const getAttrType = (attr: Attribute) =>
  attr.min === attr.max && attr.max === 1 ? 'Radio' : 'Checkbox';

const getOptionCost = (option: AttributeOption, components: any[]): number => {
  if (!option.component_id || !option.quantity) return 0;
  const component = components.find(c => c.component_id === option.component_id);
  if (!component || !component.purchase_cost) return 0;
  return Math.round(component.purchase_cost * option.quantity);
};

// ─── empty form ───────────────────────────────────────────────────────────────

const emptyForm = (): Partial<Attribute> => ({
  name: '',
  title: '',
  type: 'CHECK',
  min: 0,
  max: 1,
  options: [],
});

// ─── attribute list view ─────────────────────────────────────────────────────

interface ListViewProps {
  attributes: Attribute[];
  components: any[];
  onNew: () => void;
  onEdit: (attr: Attribute) => void;
}

function ListView({ attributes, components, onNew, onEdit }: ListViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {attributes.length} groupe{attributes.length !== 1 ? 's' : ''} d'options
        </p>
        <Button className="bg-gradient-primary" onClick={onNew}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau groupe
        </Button>
      </div>

      {attributes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Settings2 className="w-10 h-10 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">Aucun groupe d'options pour l'instant.</p>
            <Button className="bg-gradient-primary mt-2" onClick={onNew}>
              <Plus className="w-4 h-4 mr-2" />
              Créer mon premier groupe
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {attributes.map((attr) => (
            <Card key={attr.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base">{attr.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {getAttrType(attr)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Min: {attr.min} · Max: {attr.max}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(attr)}
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" />
                  Modifier
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs h-8">Option</TableHead>
                        <TableHead className="text-xs h-8 text-right">Supplément</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attr.options.map((opt) => {
                        const price = getOptionPrice(opt);
                        const cost = getOptionCost(opt, components);
                        return (
                          <TableRow key={opt.id}>
                            <TableCell className="text-sm py-2">{opt.title}</TableCell>
                            <TableCell className="text-sm py-2 text-right font-mono">
                              <div className="flex flex-col items-end gap-0.5">
                                {price > 0 ? (
                                  <span className="text-primary font-medium">+{formatPrice(price)} €</span>
                                ) : (
                                  <span className="text-muted-foreground">Gratuit</span>
                                )}
                                {cost > 0 && (
                                  <span className="text-xs text-muted-foreground">Coût: {formatPrice(cost)} €</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── sortable option row ──────────────────────────────────────────────────────

interface SortableOptionRowProps {
  option: AttributeOption;
  components: any[];
  compatibleUnits: any[];
  onUpdate: (field: keyof AttributeOption, value: unknown) => void;
  onRemove: () => void;
}

function SortableOptionRow({
  option,
  components,
  compatibleUnits,
  onUpdate,
  onRemove,
}: SortableOptionRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: option.id,
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    transition: isDragging ? 'none' : 'all 0.2s ease',
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-muted/50' : ''}>
      <TableCell className="cursor-grab active:cursor-grabbing pl-2 w-8" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </TableCell>
      <TableCell>
        <Input
          value={option.title}
          onChange={e => onUpdate('title', e.target.value)}
          placeholder="Ex: Grande, Olive…"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          min={0}
          value={formatPrice(getOptionPrice(option))}
          onChange={e => {
            const cents = parsePrice(e.target.value);
            onUpdate('price', cents);
            onUpdate('extra_price', cents);
          }}
        />
      </TableCell>
      <TableCell>
        <Select
          value={option.component_id || 'none'}
          onValueChange={value => {
            if (value === 'none') {
              onUpdate('component_id', undefined);
              onUpdate('quantity', undefined);
              onUpdate('unit_of_measure_id', undefined);
            } else {
              onUpdate('component_id', value);
            }
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun</SelectItem>
            {components.map(comp => (
              <SelectItem key={comp.component_id} value={comp.component_id}>
                {comp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          min={0}
          value={option.quantity ?? ''}
          onChange={e => onUpdate('quantity', parseFloat(e.target.value) || undefined)}
          placeholder="0"
          disabled={!option.component_id}
        />
      </TableCell>
      <TableCell>
        <Select
          value={option.unit_of_measure_id?.toString() || 'none'}
          onValueChange={value => {
            if (value === 'none') {
              onUpdate('unit_of_measure_id', undefined);
            } else {
              onUpdate('unit_of_measure_id', value);
            }
          }}
          disabled={!option.component_id}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucune</SelectItem>
            {compatibleUnits.map(unit => (
              <SelectItem key={unit.id} value={unit.id.toString()}>
                {unit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-sm font-medium text-muted-foreground">
        {option.component_id && option.quantity ? formatPrice(getOptionCost(option, components)) : '—'}
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ─── attribute form view ──────────────────────────────────────────────────────

interface FormViewProps {
  initial?: Attribute;
  onSave: (data: Partial<Attribute>) => void;
  onCancel: () => void;
}

function FormView({ initial, onSave, onCancel }: FormViewProps) {
  const { components, units } = useMenuData();
  const [formData, setFormData] = useState<Partial<Attribute>>(
    initial
      ? { ...initial, options: initial.options.map(o => ({ ...o })) }
      : emptyForm()
  );

  const handleAddOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [
        ...(prev.options || []),
        { id: `opt_${Date.now()}`, title: '', price: 0, extra_price: 0 },
      ],
    }));
  };

  const handleRemoveOption = (optionId: string) => {
    setFormData(prev => ({
      ...prev,
      options: (prev.options || []).filter(o => o.id !== optionId),
    }));
  };

  const handleUpdateOption = (optionId: string, field: keyof AttributeOption, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      options: (prev.options || []).map(o => {
        if (o.id === optionId) {
          const updated = { ...o, [field]: value };
          
          // Auto-fill option title from selected component if empty
          if (field === 'component_id' && value && value !== 'none') {
            const selectedComponent = components.find(c => c.component_id === value);
            if (selectedComponent && !updated.title?.trim()) {
              updated.title = selectedComponent.name;
            }
          }
          
          return updated;
        }
        return o;
      }),
    }));
  };

  // Get compatible units for a component
  const getCompatibleUnits = (componentId: string) => {
    const component = components.find(c => c.component_id === componentId);
    if (!component) return units || [];
    const componentUnitId = component.unit_of_measure_id || component.unit_id;
    const componentUnit = (units || []).find(u => u.id === componentUnitId || u.id.toString() === componentUnitId?.toString());
    if (!componentUnit || !componentUnit.compatible_with) return [componentUnit].filter(Boolean);
    return (units || []).filter(u => componentUnit.compatible_with?.includes(u.id.toString()) || componentUnit.compatible_with?.includes(u.id as any));
  };

  const handleOptionDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const options = formData.options || [];
    const activeIndex = options.findIndex(o => o.id === active.id);
    const overIndex = options.findIndex(o => o.id === over.id);

    if (activeIndex === -1 || overIndex === -1) return;

    const newOptions = [...options];
    const [movedOption] = newOptions.splice(activeIndex, 1);
    newOptions.splice(overIndex, 0, movedOption);

    setFormData(prev => ({
      ...prev,
      options: newOptions.map((o, i) => ({ ...o, order: i })),
    }));
  };

  const [showBatchSelector, setShowBatchSelector] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState<Set<string>>(new Set());

  const handleBatchSelectComponents = () => {
    if (selectedComponents.size === 0) return;

    const newOptions = Array.from(selectedComponents).map(componentId => {
      const component = components.find(c => c.component_id === componentId);
      return {
        id: `opt_${Date.now()}_${componentId}`,
        title: component?.name || '',
        price: 0,
        extra_price: 0,
        component_id: componentId,
        order: (formData.options?.length || 0) + Array.from(selectedComponents).indexOf(componentId),
      };
    });

    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), ...newOptions],
    }));

    setSelectedComponents(new Set());
    setShowBatchSelector(false);
  };

  const isEditing = !!initial;
  const canSave = 
    (formData.name?.trim() ?? '').length > 0 &&
    (formData.title?.trim() ?? '').length > 0 &&
    (formData.options?.length ?? 0) > 0;

  return (
    <div className="space-y-6 max-w-full">
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Retour à la liste
      </button>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Modifier le groupe' : 'Nouveau groupe d\'options'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name (Staff-only) */}
          <div className="space-y-2">
            <Label htmlFor="attr-name">Nom (interne)</Label>
            <Input
              id="attr-name"
              value={formData.name ?? ''}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Pizza Size (visible uniquement par le restaurateur)"
              className="text-sm"
            />
          </div>

          {/* Title (Client-visible) */}
          <div className="space-y-2">
            <Label htmlFor="attr-title">Titre visible aux clients</Label>
            <Input
              id="attr-title"
              value={formData.title ?? ''}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Taille Pizza, Suppléments…"
            />
          </div>

          {/* Min / Max */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="attr-min">Sélection minimum</Label>
              <Input
                id="attr-min"
                type="number"
                min={0}
                value={formData.min ?? 0}
                onChange={e => setFormData(prev => ({ ...prev, min: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attr-max">Sélection maximum</Label>
              <Input
                id="attr-max"
                type="number"
                min={1}
                value={formData.max ?? 1}
                onChange={e => setFormData(prev => ({ ...prev, max: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            {formData.min === formData.max && formData.max === 1
              ? 'Type : Radio — sélection unique obligatoire'
              : formData.min === 0
              ? 'Type : Checkbox — sélection multiple optionnelle'
              : 'Type : Checkbox — sélection multiple obligatoire'}
          </p>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Options</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBatchSelector(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Sélectionner des ingrédients
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter une option
                </Button>
              </div>
            </div>

            {(formData.options ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                Aucune option — cliquez sur "Ajouter" pour commencer
              </p>
            ) : (
              <DndContext onDragEnd={handleOptionDragEnd}>
                <div className="rounded-lg border border-border overflow-hidden -mx-6 px-6">
                  <div className="overflow-x-auto -mx-6">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-8" />
                          <TableHead className="min-w-[120px]">Nom de l'option</TableHead>
                          <TableHead className="min-w-[100px]">Supplément (€)</TableHead>
                          <TableHead className="min-w-[150px]">Ingrédient (optionnel)</TableHead>
                          <TableHead className="min-w-[100px]">Quantité</TableHead>
                          <TableHead className="min-w-[130px]">Unité de mesure</TableHead>
                          <TableHead className="min-w-[90px]">Coût (€)</TableHead>
                          <TableHead className="w-12" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <SortableContext items={formData.options?.map(o => o.id) || []} strategy={verticalListSortingStrategy}>
                          {(formData.options ?? []).map((option) => {
                            const compatibleUnits = option.component_id ? getCompatibleUnits(option.component_id) : [];
                            return (
                              <SortableOptionRow
                                key={option.id}
                                option={option}
                                components={components}
                                compatibleUnits={compatibleUnits}
                                onUpdate={(field, value) => handleUpdateOption(option.id, field, value)}
                                onRemove={() => handleRemoveOption(option.id)}
                              />
                            );
                          })}
                        </SortableContext>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </DndContext>
            )}
          </div>

          {/* Batch Ingredient Selector Dialog */}
          <Dialog open={showBatchSelector} onOpenChange={setShowBatchSelector}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Sélectionner des ingrédients</DialogTitle>
                <DialogDescription>
                  Sélectionnez les ingrédients à ajouter comme options. Le nom de l'ingrédient sera utilisé comme nom de l'option.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {components.map(comp => (
                  <label key={comp.component_id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedComponents.has(comp.component_id)}
                      onChange={e => {
                        const newSelected = new Set(selectedComponents);
                        if (e.target.checked) {
                          newSelected.add(comp.component_id);
                        } else {
                          newSelected.delete(comp.component_id);
                        }
                        setSelectedComponents(newSelected);
                      }}
                      className="w-4 h-4 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{comp.name}</p>
                      {comp.category && <p className="text-xs text-muted-foreground truncate">{comp.category}</p>}
                    </div>
                  </label>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBatchSelector(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleBatchSelectComponents}
                  className="bg-gradient-primary"
                  disabled={selectedComponents.size === 0}
                >
                  Ajouter {selectedComponents.size > 0 ? `(${selectedComponents.size})` : ''}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Annuler
            </Button>
            <Button
              onClick={() => onSave(formData)}
              className="flex-1 bg-gradient-primary"
              disabled={!canSave}
            >
              {isEditing ? 'Enregistrer les modifications' : 'Créer le groupe'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'new' | { editing: Attribute };

export default function AttributesPage() {
  const { attributes, components, loading, createAttribute, updateAttributeData } = useMenuData();
  const [view, setView] = useState<ViewMode>('list');

  const handleSave = async (data: Partial<Attribute>) => {
    if (view === 'new') {
      await createAttribute(data);
    } else if (typeof view === 'object') {
      await updateAttributeData(view.editing.id, data);
    }
    setView('list');
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Options &amp; Suppléments</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les groupes d'options réutilisables à associer à vos produits.
          </p>
        </div>

        {loading ? (
          <PageSkeleton />
        ) : view === 'list' ? (
          <ListView
            attributes={attributes}
            components={components}
            onNew={() => setView('new')}
            onEdit={(attr) => setView({ editing: attr })}
          />
        ) : (
          <FormView
            initial={typeof view === 'object' ? view.editing : undefined}
            onSave={handleSave}
            onCancel={() => setView('list')}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
