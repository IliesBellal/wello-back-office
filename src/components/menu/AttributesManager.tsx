import { useState } from 'react';
import { Attribute, AttributeOption } from '@/types/menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Edit } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AttributesManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attributes: Attribute[];
  onCreateAttribute: (data: Partial<Attribute>) => void;
  onUpdateAttribute: (id: string, data: Partial<Attribute>) => void;
}

export const AttributesManager = ({
  open,
  onOpenChange,
  attributes,
  onCreateAttribute,
  onUpdateAttribute
}: AttributesManagerProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Attribute>>({
    title: '',
    type: 'CHECK',
    min: 0,
    max: 1,
    options: []
  });

  const handleEdit = (attribute: Attribute) => {
    setEditingId(attribute.id);
    setFormData(attribute);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      title: '',
      type: 'CHECK',
      min: 0,
      max: 1,
      options: []
    });
  };

  const handleSave = () => {
    if (editingId) {
      onUpdateAttribute(editingId, formData);
    } else {
      onCreateAttribute(formData);
    }
    handleCancel();
  };

  const handleAddOption = () => {
    setFormData({
      ...formData,
      options: [
        ...(formData.options || []),
        { id: `opt_${Date.now()}`, title: '', price: 0 }
      ]
    });
  };

  const handleRemoveOption = (optionId: string) => {
    setFormData({
      ...formData,
      options: (formData.options || []).filter(o => o.id !== optionId)
    });
  };

  const handleUpdateOption = (optionId: string, field: keyof AttributeOption, value: any) => {
    setFormData({
      ...formData,
      options: (formData.options || []).map(o =>
        o.id === optionId ? { ...o, [field]: value } : o
      )
    });
  };

  const formatPrice = (cents: number) => (cents / 100).toFixed(2);
  const parsePrice = (value: string) => Math.round(parseFloat(value || '0') * 100);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Gérer les Attributs</SheetTitle>
          <SheetDescription>
            Créez et gérez les groupes d'options réutilisables pour vos produits
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {editingId === null && (
            <div className="space-y-4">
              {attributes.map((attr) => (
                <Card key={attr.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{attr.title}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(attr)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      Min: {attr.min} | Max: {attr.max} ({attr.min === attr.max && attr.max === 1 ? 'Radio' : 'Checkbox'})
                    </p>
                    <div className="space-y-1">
                      {attr.options.map((opt) => (
                        <div key={opt.id} className="flex justify-between text-sm">
                          <span>{opt.title}</span>
                          <span className="text-primary font-medium">
                            {opt.price > 0 ? `+${formatPrice(opt.price)} €` : 'Gratuit'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                onClick={() => setEditingId('new')}
                className="w-full bg-gradient-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer un Attribut
              </Button>
            </div>
          )}

          {editingId !== null && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingId === 'new' ? 'Nouvel Attribut' : 'Modifier l\'Attribut'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Taille Pizza"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min">Minimum</Label>
                    <Input
                      id="min"
                      type="number"
                      value={formData.min}
                      onChange={(e) => setFormData({ ...formData, min: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max">Maximum</Label>
                    <Input
                      id="max"
                      type="number"
                      value={formData.max}
                      onChange={(e) => setFormData({ ...formData, max: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {formData.min === formData.max && formData.max === 1
                    ? 'Type: Radio (sélection unique obligatoire)'
                    : 'Type: Checkbox (sélection multiple)'}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Options</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddOption}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Supplément (€)</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(formData.options || []).map((option) => (
                        <TableRow key={option.id}>
                          <TableCell>
                            <Input
                              value={option.title}
                              onChange={(e) => handleUpdateOption(option.id, 'title', e.target.value)}
                              placeholder="Nom de l'option"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={formatPrice(option.price)}
                              onChange={(e) => handleUpdateOption(option.id, 'price', parsePrice(e.target.value))}
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

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={handleCancel} className="flex-1">
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="flex-1 bg-gradient-primary"
                    disabled={!formData.title || (formData.options?.length || 0) === 0}
                  >
                    Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
