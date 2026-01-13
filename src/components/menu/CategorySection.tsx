import { Category, Product } from '@/types/menu';
import { ProductCard } from './ProductCard';
import { GripVertical } from 'lucide-react';
import { 
  SortableContext, 
  rectSortingStrategy 
} from '@dnd-kit/sortable';

interface CategorySectionProps {
  category: Category;
  products: Product[];
  onProductClick: (product: Product) => void;
}

export const CategorySection = ({ 
  category, 
  products,
  onProductClick 
}: CategorySectionProps) => {
  const sortedProducts = [...products].sort((a, b) => a.order - b.order);
  const productIds = sortedProducts.map(p => p.product_id);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
        <h2 className="text-2xl font-bold text-foreground">{category.category_name}</h2>
      </div>
      
      <SortableContext items={productIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sortedProducts.map((product) => (
            <ProductCard
              key={product.product_id}
              product={product}
              onClick={() => onProductClick(product)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};
