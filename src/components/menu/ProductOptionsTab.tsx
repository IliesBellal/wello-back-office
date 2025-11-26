import { useState } from 'react';
import { Attribute, ProductAttribute } from '@/types/menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProductOptionsTabProps {
  productAttributes: ProductAttribute[];
  availableAttributes: Attribute[];
  onChange: (attributes: ProductAttribute[]) => void;
  disabled?: boolean;
}

export const ProductOptionsTab = ({
  productAttributes,
  availableAttributes,
  onChange,
  disabled = false
}: ProductOptionsTabProps) => {
  const [selectedAttributeId, setSelectedAttributeId] = useState<string>('');

  const handleAddAttribute = () => {
    if (!selectedAttributeId) return;
    
    const newAttribute: ProductAttribute = {
      attribute_id: selectedAttributeId,
      options: []
    };
    
    onChange([...productAttributes, newAttribute]);
    setSelectedAttributeId('');
  };

  const handleRemoveAttribute = (attributeId: string) => {
    onChange(productAttributes.filter(a => a.attribute_id !== attributeId));
  };

  const getAttributeDetails = (attributeId: string) => {
    return availableAttributes.find(a => a.id === attributeId);
  };

  const formatPrice = (cents: number) => (cents / 100).toFixed(2);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={selectedAttributeId} onValueChange={setSelectedAttributeId} disabled={disabled}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Sélectionner un groupe d'options" />
          </SelectTrigger>
          <SelectContent>
            {availableAttributes
              .filter(attr => !productAttributes.some(pa => pa.attribute_id === attr.id))
              .map((attr) => (
                <SelectItem key={attr.id} value={attr.id}>
                  {attr.title}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Button
          onClick={handleAddAttribute}
          disabled={disabled || !selectedAttributeId}
          className="bg-gradient-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter
        </Button>
      </div>

      {productAttributes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Aucun groupe d'options lié. Ajoutez-en un pour permettre aux clients de personnaliser ce produit.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {productAttributes.map((productAttr) => {
            const attribute = getAttributeDetails(productAttr.attribute_id);
            if (!attribute) return null;

            return (
              <Card key={productAttr.attribute_id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{attribute.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAttribute(productAttr.attribute_id)}
                    disabled={disabled}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {attribute.min === attribute.max && attribute.max === 1
                      ? 'Sélection unique obligatoire'
                      : `${attribute.min} à ${attribute.max} choix possibles`}
                  </p>
                  <div className="space-y-2">
                    {attribute.options.map((option) => (
                      <div
                        key={option.id}
                        className="flex justify-between items-center p-2 rounded-md bg-muted/50"
                      >
                        <span className="text-sm">{option.title}</span>
                        <span className="text-sm font-medium text-primary">
                          {option.price > 0 ? `+${formatPrice(option.price)} €` : 'Gratuit'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
