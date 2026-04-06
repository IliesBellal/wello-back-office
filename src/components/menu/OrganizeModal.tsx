import { useState } from 'react';
import { Category, Product } from '@/types/menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GripVertical, Save, Loader2 } from 'lucide-react';
import { menuService } from '@/services/menuService';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '@/hooks/use-toast';

interface OrganizeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  products: Product[];
  onSaveOrder: (categoryOrder: string[], productOrder: string[]) => Promise<void>;
}

const SortableCategoryItem = ({ category, isActive, onClick }: { category: Category; isActive: boolean; onClick: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: category.category_id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
        isActive ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
      }`}
      {...attributes}
      onClick={onClick}
    >
      <div
        {...listeners}
        className="flex items-center justify-center"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
      </div>
      <span className="font-medium">{category.category_name}</span>
    </div>
  );
};

// Helper function to determine text color based on background color
const getTextColor = (bgColor: string | undefined): string => {
  if (!bgColor) return 'text-foreground';
  
  // Remove # and convert to RGB
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance using relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? 'text-black' : 'text-white';
};

const SortableProductItem = ({ product }: { product: Product }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: product.product_id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  const bgColor = product.bg_color || '#ffffff';
  const textColorClass = getTextColor(bgColor);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: bgColor,
      }}
      className={`p-4 rounded-lg cursor-move ${textColorClass}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-2 mb-1">
        <GripVertical className="w-4 h-4 opacity-70" />
        <h3 className="font-semibold">{product.name}</h3>
      </div>
      {product.price && (
        <p className="text-sm opacity-80">{(product.price / 100).toFixed(2)} €</p>
      )}
    </div>
  );
};

export const OrganizeModal = ({
  open,
  onOpenChange,
  categories: initialCategories,
  products: initialProducts,
  onSaveOrder
}: OrganizeModalProps) => {
  const [categories, setCategories] = useState(
    initialCategories.sort((a, b) => (a.categ_order ?? a.order ?? 0) - (b.categ_order ?? b.order ?? 0))
  );
  const [activeCategory, setActiveCategory] = useState<string>(initialCategories[0]?.category_id || '');
  const [products, setProducts] = useState(
    initialProducts.sort((a, b) => (a.display_order ?? a.order ?? 0) - (b.display_order ?? b.order ?? 0))
  );
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const categoryProducts = products.filter(p => p.category_id === activeCategory)
    .sort((a, b) => (a.display_order ?? a.order ?? 0) - (b.display_order ?? b.order ?? 0));

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex(c => c.category_id === active.id);
    const newIndex = categories.findIndex(c => c.category_id === over.id);

    const newCategories = [...categories];
    const [movedItem] = newCategories.splice(oldIndex, 1);
    newCategories.splice(newIndex, 0, movedItem);

    setCategories(newCategories.map((c, i) => ({ ...c, categ_order: i })));
  };

  const handleProductDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categoryProducts.findIndex(p => p.product_id === active.id);
    const newIndex = categoryProducts.findIndex(p => p.product_id === over.id);

    const newOrder = [...categoryProducts];
    const [movedItem] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, movedItem);

    setProducts(prev => prev.map(p => {
      if (p.category_id !== activeCategory) return p;
      const index = newOrder.findIndex(np => np.product_id === p.product_id);
      return index >= 0 ? { ...p, display_order: index } : p;
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build display order: for each category, get products in that category in order
      const displayOrder = categories.map(category => {
        const categoryProductIds = products
          .filter(p => p.category_id === category.category_id)
          .sort((a, b) => (a.display_order ?? a.order ?? 0) - (b.display_order ?? b.order ?? 0))
          .map(p => p.product_id);
        
        return {
          category_id: category.category_id,
          products: categoryProductIds
        };
      });
      
      // Save to API
      await menuService.saveDisplayOrder(displayOrder);
      
      // Also call the old callback if provided
      if (onSaveOrder) {
        const categoryOrder = categories.map(c => c.category_id);
        const productOrder = products.map(p => p.product_id);
        await onSaveOrder(categoryOrder, productOrder);
      }
      
      toast({
        title: "Succès",
        description: "Ordre sauvegardé avec succès"
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving display order:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de sauvegarder l'ordre",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Organiser le Menu (Mode Tablette)</DialogTitle>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex gap-4 h-full overflow-hidden">
          {/* Left Sidebar - Categories */}
          <div className="w-1/5 overflow-y-auto space-y-2">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
              <SortableContext items={categories.map(c => c.category_id)} strategy={verticalListSortingStrategy}>
                {categories.map(category => (
                  <SortableCategoryItem 
                    key={category.category_id}
                    category={category} 
                    isActive={activeCategory === category.category_id}
                    onClick={() => setActiveCategory(category.category_id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* Main Area - Products Grid */}
          <div className="flex-1 overflow-y-auto">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleProductDragEnd}>
              <SortableContext items={categoryProducts.map(p => p.product_id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-4 gap-4">
                  {categoryProducts.map(product => (
                    <SortableProductItem key={product.product_id} product={product} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
