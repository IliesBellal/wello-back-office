import { useState } from 'react';
import { Category, Product } from '@/types/menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GripVertical, Save } from 'lucide-react';
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

const SortableCategoryItem = ({ category, isActive }: { category: Category; isActive: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: category.id });
  
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
      {...listeners}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground" />
      <span className="font-medium">{category.name}</span>
    </div>
  );
};

const SortableProductItem = ({ product }: { product: Product }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: product.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-4 rounded-lg bg-card border cursor-move"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-2 mb-1">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">{product.name}</h3>
      </div>
      {product.price && (
        <p className="text-sm text-muted-foreground">{(product.price / 100).toFixed(2)} €</p>
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
  const [categories, setCategories] = useState(initialCategories);
  const [activeCategory, setActiveCategory] = useState<string>(initialCategories[0]?.id || '');
  const [products, setProducts] = useState(initialProducts);
  const { toast } = useToast();

  const categoryProducts = products.filter(p => p.category_id === activeCategory)
    .sort((a, b) => a.order - b.order);

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex(c => c.id === active.id);
    const newIndex = categories.findIndex(c => c.id === over.id);

    const newCategories = [...categories];
    const [movedItem] = newCategories.splice(oldIndex, 1);
    newCategories.splice(newIndex, 0, movedItem);

    setCategories(newCategories.map((c, i) => ({ ...c, order: i })));
  };

  const handleProductDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categoryProducts.findIndex(p => p.id === active.id);
    const newIndex = categoryProducts.findIndex(p => p.id === over.id);

    const newOrder = [...categoryProducts];
    const [movedItem] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, movedItem);

    setProducts(prev => prev.map(p => {
      if (p.category_id !== activeCategory) return p;
      const index = newOrder.findIndex(np => np.id === p.id);
      return index >= 0 ? { ...p, order: index } : p;
    }));
  };

  const handleSave = async () => {
    try {
      const categoryOrder = categories.map(c => c.id);
      const productOrder = products.map(p => p.id);
      await onSaveOrder(categoryOrder, productOrder);
      toast({
        title: "Succès",
        description: "Ordre sauvegardé avec succès"
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'ordre",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Organiser le Menu (Mode Tablette)</DialogTitle>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </DialogHeader>

        <div className="flex gap-4 h-full overflow-hidden">
          {/* Left Sidebar - Categories */}
          <div className="w-1/5 overflow-y-auto space-y-2">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
              <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {categories.map(category => (
                  <div key={category.id} onClick={() => setActiveCategory(category.id)}>
                    <SortableCategoryItem 
                      category={category} 
                      isActive={activeCategory === category.id}
                    />
                  </div>
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* Main Area - Products Grid */}
          <div className="flex-1 overflow-y-auto">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleProductDragEnd}>
              <SortableContext items={categoryProducts.map(p => p.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-4 gap-4">
                  {categoryProducts.map(product => (
                    <SortableProductItem key={product.id} product={product} />
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
