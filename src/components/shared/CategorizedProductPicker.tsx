import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Category, Product, SubProduct } from '@/types/menu';

interface CategorizedProductPickerProps {
  /** Catégories caisse avec leurs produits imbriqués (menuService.getMenuData). */
  categories: Category[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  /** Filtre sur le nom ; les catégories sans résultat sont masquées. */
  search?: string;
}

interface PickerItem {
  id: string;
  name: string;
  image_url?: string;
  bg_color?: string;
  /** IDs des sous-produits (lignes de groupe uniquement). */
  subIds: string[];
  isSub: boolean;
}

interface PickerCategory {
  id: string;
  name: string;
  items: PickerItem[];
  /** Tous les IDs de la catégorie, filtre de recherche ignoré. */
  allIds: string[];
}

// Recherche insensible à la casse et aux accents (« creme » trouve « Crème »).
const normalize = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const subId = (sp: SubProduct) => sp.product_id || sp.id || '';

/**
 * Sélection de produits rangés par catégorie caisse : chaque catégorie se
 * déplie/replie et se coche d'un coup. Les sous-produits sont listés sous leur
 * groupe ; cocher un groupe coche aussi ses sous-produits.
 */
export function CategorizedProductPicker({
  categories,
  selectedIds,
  onChange,
  search = '',
}: CategorizedProductPickerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const query = normalize(search.trim());
  const searching = query.length > 0;

  const pickerCategories = useMemo<PickerCategory[]>(() => {
    const matches = (name: string) => !searching || normalize(name).includes(query);

    return categories
      .map((category) => {
        const items: PickerItem[] = [];
        const allIds: string[] = [];

        (category.products || []).forEach((product: Product) => {
          const subs = (product.sub_products || []).filter((sp) => subId(sp));
          allIds.push(product.product_id, ...subs.map(subId));

          // Un groupe dont le nom correspond montre tous ses sous-produits ;
          // sinon seuls les sous-produits qui correspondent (et leur groupe).
          const groupMatches = matches(product.name);
          const visibleSubs = groupMatches ? subs : subs.filter((sp) => matches(sp.name));
          if (!groupMatches && visibleSubs.length === 0) return;

          items.push({
            id: product.product_id,
            name: product.name,
            image_url: product.image_url,
            bg_color: product.bg_color,
            subIds: subs.map(subId),
            isSub: false,
          });
          visibleSubs.forEach((sp) =>
            items.push({
              id: subId(sp),
              name: sp.name,
              image_url: sp.image_url,
              bg_color: sp.bg_color,
              subIds: [],
              isSub: true,
            })
          );
        });

        return {
          id: category.category_id,
          name: category.category_name || category.category || category.name || '',
          items,
          allIds,
        };
      })
      .filter((category) => category.items.length > 0);
  }, [categories, query, searching]);

  // Pendant une recherche, tout est déplié : les résultats doivent se voir.
  const isExpanded = (categoryId: string) => searching || expanded.has(categoryId);

  const toggleExpanded = (categoryId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });

  const apply = (add: string[], remove: string[]) => {
    const next = new Set(selected);
    remove.forEach((id) => next.delete(id));
    add.forEach((id) => next.add(id));
    onChange(Array.from(next));
  };

  // La case d'une catégorie porte sur ses lignes visibles : sans recherche,
  // toute la catégorie ; avec, seulement les résultats affichés.
  const categoryState = (category: PickerCategory): boolean | 'indeterminate' => {
    const ids = category.items.map((item) => item.id);
    const count = ids.filter((id) => selected.has(id)).length;
    if (count === 0) return false;
    return count === ids.length ? true : 'indeterminate';
  };

  const toggleCategory = (category: PickerCategory) => {
    const ids = category.items.map((item) => item.id);
    if (categoryState(category) === true) apply([], ids);
    else apply(ids, []);
  };

  // Cocher un groupe coche ses sous-produits (ils le suivent sur la caisse, la
  // borne et le Scan & Order). Décocher un sous-produit décoche son groupe :
  // un groupe coché couvrirait sinon encore ce sous-produit.
  const toggleItem = (item: PickerItem, category: PickerCategory) => {
    if (!item.isSub) {
      if (selected.has(item.id)) apply([], [item.id, ...item.subIds]);
      else apply([item.id, ...item.subIds], []);
      return;
    }
    const parent = category.items.find((candidate) => candidate.subIds.includes(item.id));
    if (selected.has(item.id)) {
      apply([], parent ? [item.id, parent.id] : [item.id]);
      return;
    }
    const allSubsSelected =
      parent && parent.subIds.every((id) => id === item.id || selected.has(id));
    apply(allSubsSelected && parent ? [item.id, parent.id] : [item.id], []);
  };

  if (pickerCategories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        {categories.length === 0 ? 'Aucun produit disponible' : 'Aucun résultat pour votre recherche'}
      </p>
    );
  }

  const allExpanded = pickerCategories.every((category) => isExpanded(category.id));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-muted-foreground">
          {selectedIds.length} produit{selectedIds.length !== 1 ? 's' : ''} sélectionné{selectedIds.length !== 1 ? 's' : ''}
        </span>
        {!searching && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setExpanded(allExpanded ? new Set() : new Set(pickerCategories.map((category) => category.id)))
            }
          >
            {allExpanded ? 'Tout replier' : 'Tout déplier'}
          </Button>
        )}
      </div>

      {pickerCategories.map((category) => {
        const open = isExpanded(category.id);
        const selectedCount = category.allIds.filter((id) => selected.has(id)).length;
        return (
          <div key={category.id} className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-2 bg-muted/40">
              <Checkbox
                checked={categoryState(category)}
                onCheckedChange={() => toggleCategory(category)}
                aria-label={`Sélectionner toute la catégorie ${category.name}`}
              />
              <button
                type="button"
                className="flex flex-1 items-center gap-2 min-w-0 text-left"
                onClick={() => !searching && toggleExpanded(category.id)}
                aria-expanded={open}
              >
                {open ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="font-medium text-sm truncate">{category.name}</span>
                <span className="ml-auto text-xs text-muted-foreground shrink-0">
                  {selectedCount} / {category.allIds.length}
                </span>
              </button>
            </div>

            {open && (
              <div className="p-1 space-y-0.5">
                {category.items.map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer ${
                      item.isSub ? 'pl-10' : ''
                    }`}
                  >
                    <Checkbox
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggleItem(item, category)}
                    />
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={item.image_url} alt={item.name} />
                      <AvatarFallback style={{ backgroundColor: item.bg_color || '#e5e7eb' }} />
                    </Avatar>
                    <span className="text-sm font-medium flex-1 truncate">{item.name}</span>
                    {item.subIds.length > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        Groupe · {item.subIds.length} sous-produit{item.subIds.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
