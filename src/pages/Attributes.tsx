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
import { Plus, Trash2, Edit, ChevronLeft, Settings2 } from 'lucide-react';
import { useMenuData } from '@/hooks/useMenuData';
import { Attribute, AttributeOption } from '@/types/menu';
import { Skeleton } from '@/components/ui/skeleton';

// ─── helpers ─────────────────────────────────────────────────────────────────

const formatPrice = (cents: number) => (cents / 100).toFixed(2);
const parsePrice = (value: string) => Math.round(parseFloat(value || '0') * 100);

const getOptionPrice = (opt: AttributeOption) =>
  opt.extra_price !== undefined ? opt.extra_price : (opt.price ?? 0);

const getAttrType = (attr: Attribute) =>
  attr.min === attr.max && attr.max === 1 ? 'Radio' : 'Checkbox';

// ─── empty form ───────────────────────────────────────────────────────────────

const emptyForm = (): Partial<Attribute> => ({
  title: '',
  type: 'CHECK',
  min: 0,
  max: 1,
  options: [],
});

// ─── attribute list view ─────────────────────────────────────────────────────

interface ListViewProps {
  attributes: Attribute[];
  onNew: () => void;
  onEdit: (attr: Attribute) => void;
}

function ListView({ attributes, onNew, onEdit }: ListViewProps) {
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
                        return (
                          <TableRow key={opt.id}>
                            <TableCell className="text-sm py-2">{opt.title}</TableCell>
                            <TableCell className="text-sm py-2 text-right font-mono">
                              {price > 0 ? (
                                <span className="text-primary font-medium">+{formatPrice(price)} €</span>
                              ) : (
                                <span className="text-muted-foreground">Gratuit</span>
                              )}
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

// ─── attribute form view ──────────────────────────────────────────────────────

interface FormViewProps {
  initial?: Attribute;
  onSave: (data: Partial<Attribute>) => void;
  onCancel: () => void;
}

function FormView({ initial, onSave, onCancel }: FormViewProps) {
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
      options: (prev.options || []).map(o =>
        o.id === optionId ? { ...o, [field]: value } : o
      ),
    }));
  };

  const isEditing = !!initial;
  const canSave = (formData.title?.trim() ?? '').length > 0 && (formData.options?.length ?? 0) > 0;

  return (
    <div className="space-y-6 max-w-2xl">
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
        <CardContent className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="attr-title">Nom du groupe</Label>
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
            <div className="flex items-center justify-between">
              <Label>Options</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                <Plus className="w-4 h-4 mr-1" />
                Ajouter une option
              </Button>
            </div>

            {(formData.options ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                Aucune option — cliquez sur "Ajouter" pour commencer
              </p>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Nom de l'option</TableHead>
                      <TableHead>Supplément (€)</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(formData.options ?? []).map((option) => (
                      <TableRow key={option.id}>
                        <TableCell>
                          <Input
                            value={option.title}
                            onChange={e => handleUpdateOption(option.id, 'title', e.target.value)}
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
                              handleUpdateOption(option.id, 'price', cents);
                              handleUpdateOption(option.id, 'extra_price', cents);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveOption(option.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

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
  const { attributes, loading, createAttribute, updateAttributeData } = useMenuData();
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
