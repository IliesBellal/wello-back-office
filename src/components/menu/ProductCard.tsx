import { Product } from '@/types/menu';
import { Card } from '@/components/ui/card';
import { Layers } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export const ProductCard = ({ product, onClick }: ProductCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.product_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatPrice = (price?: number) => {
    if (!price) return '';
    return `${(price / 100).toFixed(2)} €`;
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card 
        className="p-4 cursor-pointer hover:shadow-md transition-all"
        onClick={onClick}
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-foreground">{product.name}</h3>
            {product.is_product_group && (
              <Layers className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {product.description}
            </p>
          )}
          
          {!product.is_product_group && product.price && (
            <p className="text-lg font-bold text-primary">
              {formatPrice(product.price)}
            </p>
          )}

          {!product.is_product_group && (
            <div className="flex gap-1 mt-2">
              {product.available_in && (
                <div className="w-2 h-2 rounded-full bg-green-500" title="Sur place" />
              )}
              {product.available_take_away && (
                <div className="w-2 h-2 rounded-full bg-blue-500" title="Emporter" />
              )}
              {product.available_delivery && (
                <div className="w-2 h-2 rounded-full bg-orange-500" title="Livraison" />
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
