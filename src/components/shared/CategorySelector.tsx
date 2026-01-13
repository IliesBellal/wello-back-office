import { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Category } from '@/types/menu';

interface CategorySelectorProps {
  categories: Category[];
  value?: string;
  onValueChange: (categoryId: string) => void;
  onCreateCategory: (name: string) => Promise<Category | undefined>;
  placeholder?: string;
}

export function CategorySelector({
  categories,
  value,
  onValueChange,
  onCreateCategory,
  placeholder = "Sélectionner une catégorie..."
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectedCategory = categories.find(c => c.category_id === value);
  const searchLower = search.toLowerCase();
  const exactMatch = categories.some(c => c.category_name.toLowerCase() === searchLower);

  const handleCreateCategory = async () => {
    if (!search.trim() || isCreating) return;
    
    setIsCreating(true);
    const newCategory = await onCreateCategory(search.trim());
    setIsCreating(false);
    
    if (newCategory) {
      onValueChange(newCategory.category_id);
      setSearch('');
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={isCreating}
        >
          {selectedCategory ? selectedCategory.category_name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Rechercher ou créer..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search && !exactMatch ? (
                <button
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-accent rounded-sm"
                  onClick={handleCreateCategory}
                  disabled={isCreating}
                >
                  <Plus className="h-4 w-4" />
                  {isCreating ? "Création..." : `Créer la catégorie "${search}"`}
                </button>
              ) : (
                "Aucune catégorie trouvée."
              )}
            </CommandEmpty>
            <CommandGroup>
              {categories.map((category) => (
                <CommandItem
                  key={category.category_id}
                  value={category.category_name}
                  onSelect={() => {
                    onValueChange(category.category_id);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === category.category_id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {category.category_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
