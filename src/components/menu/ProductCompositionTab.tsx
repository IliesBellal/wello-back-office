import { useState } from 'react';
import { Component, UnitOfMeasure, ProductComposition } from '@/types/menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProductCompositionTabProps {
  composition: ProductComposition[];
  components: Component[];
  units: UnitOfMeasure[];
  onChange: (composition: ProductComposition[]) => void;
}

export const ProductCompositionTab = ({
  composition,
  components,
  units,
  onChange
}: ProductCompositionTabProps) => {
  const [newItem, setNewItem] = useState<Partial<ProductComposition>>({
    component_id: '',
    quantity: 0,
    unit_id: 0
  });

  const getComponentDetails = (componentId: string) => {
    return components.find(c => c.id === componentId);
  };

  const getUnitDetails = (unitId: number) => {
    return units.find(u => u.id === unitId);
  };

  const getCompatibleUnits = (componentId: string) => {
    const component = getComponentDetails(componentId);
    if (!component) return [];

    const baseUnit = getUnitDetails(component.unit_id);
    if (!baseUnit) return [];

    return units.filter(u => 
      baseUnit.compatible_with.includes(u.id.toString())
    );
  };

  const handleAddItem = () => {
    if (!newItem.component_id || !newItem.quantity || !newItem.unit_id) return;

    onChange([
      ...composition,
      {
        component_id: newItem.component_id,
        quantity: newItem.quantity,
        unit_id: newItem.unit_id
      }
    ]);

    setNewItem({
      component_id: '',
      quantity: 0,
      unit_id: 0
    });
  };

  const handleRemoveItem = (componentId: string) => {
    onChange(composition.filter(c => c.component_id !== componentId));
  };

  const handleComponentChange = (componentId: string) => {
    const compatibleUnits = getCompatibleUnits(componentId);
    setNewItem({
      component_id: componentId,
      quantity: newItem.quantity,
      unit_id: compatibleUnits.length > 0 ? compatibleUnits[0].id : 0
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-[2fr,1fr,1fr,auto] gap-2 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">Ingrédient</label>
              <Select
                value={newItem.component_id}
                onValueChange={handleComponentChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {components
                    .filter(c => !composition.some(comp => comp.component_id === c.id))
                    .map((component) => (
                      <SelectItem key={component.id} value={component.id}>
                        {component.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Quantité</label>
              <Input
                type="number"
                step="0.01"
                value={newItem.quantity || ''}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Unité</label>
              <Select
                value={newItem.unit_id?.toString()}
                onValueChange={(value) => setNewItem({ ...newItem, unit_id: parseInt(value) })}
                disabled={!newItem.component_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unité" />
                </SelectTrigger>
                <SelectContent>
                  {getCompatibleUnits(newItem.component_id || '').map((unit) => (
                    <SelectItem key={unit.id} value={unit.id.toString()}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAddItem}
              disabled={!newItem.component_id || !newItem.quantity || !newItem.unit_id}
              className="bg-gradient-primary"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {composition.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Aucun ingrédient ajouté. Définissez la composition de ce produit.
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ingrédient</TableHead>
              <TableHead>Quantité</TableHead>
              <TableHead>Unité</TableHead>
              <TableHead>Coût unitaire</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {composition.map((item) => {
              const component = getComponentDetails(item.component_id);
              const unit = getUnitDetails(item.unit_id);
              return (
                <TableRow key={item.component_id}>
                  <TableCell className="font-medium">
                    {component?.name || 'Inconnu'}
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{unit?.name || 'Inconnu'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {component ? `${component.price_per_unit.toFixed(2)} €` : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(item.component_id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
