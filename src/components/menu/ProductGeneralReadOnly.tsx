import type { ReactNode } from 'react';
import { ImageIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { Allergen, Product, Tag } from '@/types/menu';

/**
 * Onglet « Général » d'une fiche produit en consultation.
 *
 * Reprend champ pour champ, à la même place, le formulaire du mode
 * modification (SimpleProductSheet) : image, nom, description, puis
 * catégorie, statut, alcool, tags, allergènes et couleurs. Si on ajoute un
 * champ au formulaire, il faut l'ajouter ici aussi, sinon il disparaît de la
 * consultation.
 */
interface ProductGeneralReadOnlyProps {
  product: Product;
  /** Nom de la catégorie déjà résolu par la fiche (vide si inconnue). */
  categoryName?: string;
  /** Catalogues complets, pour retrouver le nom à partir de l'identifiant. */
  tags?: Tag[];
  allergens?: Allergen[];
  /** `sheet` : panneau latéral desktop ; `dialog` : fiche mobile, tout en colonne. */
  layout: 'sheet' | 'dialog';
}

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  out_of_stock: 'Hors stock',
  removed_from_menu: 'Retiré',
};

interface NamedItem {
  id: string;
  name: string;
}

/**
 * L'API renvoie les tags/allergènes tantôt en identifiants, tantôt en objets.
 * On résout le nom dans le catalogue ; à défaut (catalogue pas encore chargé),
 * on garde le nom porté par l'objet.
 */
const resolveItems = (
  raw: unknown,
  idKey: 'id' | 'allergen_id',
  catalog: NamedItem[],
): NamedItem[] => {
  if (!Array.isArray(raw)) return [];
  const items: NamedItem[] = [];
  for (const entry of raw) {
    const record = typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>) : null;
    const id = typeof entry === 'string' ? entry : record?.[idKey];
    if (typeof id !== 'string' || id === '') continue;
    const embeddedName = typeof record?.name === 'string' ? record.name : '';
    const name = catalog.find((item) => item.id === id)?.name || embeddedName;
    if (name) items.push({ id, name });
  }
  return items;
};

const FieldLabel = ({ children }: { children: ReactNode }) => (
  <Label className="text-xs font-semibold text-muted-foreground uppercase">{children}</Label>
);

const TextValue = ({ children }: { children?: string | null }) => (
  <p className="mt-1 text-sm text-foreground leading-relaxed whitespace-pre-line break-words">
    {children?.trim() ? children : '—'}
  </p>
);

const ChipsValue = ({ items, emptyLabel }: { items: NamedItem[]; emptyLabel: string }) =>
  items.length === 0 ? (
    <p className="mt-1 text-sm text-muted-foreground">{emptyLabel}</p>
  ) : (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item.id} variant="secondary" className="font-normal">
          {item.name}
        </Badge>
      ))}
    </div>
  );

const ColorValue = ({ color, size }: { color?: string | null; size: 'sm' | 'md' }) => (
  <div className="mt-2 flex items-center gap-2">
    <div
      className={size === 'md' ? 'w-8 h-8 rounded border border-border' : 'w-6 h-6 rounded border border-border'}
      style={{ backgroundColor: color || '#ffffff' }}
    />
    <span className="text-xs text-foreground font-mono">{color || '—'}</span>
  </div>
);

export const ProductGeneralReadOnly = ({
  product,
  categoryName,
  tags = [],
  allergens = [],
  layout,
}: ProductGeneralReadOnlyProps) => {
  const isSheet = layout === 'sheet';

  const productTags = resolveItems(
    product.tags,
    'id',
    tags.map((tag) => ({ id: tag.id, name: tag.name })),
  );
  const productAllergens = resolveItems(
    product.allergens,
    'allergen_id',
    allergens.map((allergen) => ({ id: allergen.allergen_id, name: allergen.name })),
  );

  const image = (
    <div
      className={
        isSheet
          ? 'w-40 h-40 rounded-lg bg-white border border-border overflow-hidden flex items-center justify-center'
          : 'w-full h-40 rounded-lg bg-white border border-border overflow-hidden flex items-center justify-center'
      }
    >
      {product.image_url ? (
        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
      ) : product.bg_color ? (
        <div className="w-full h-full" style={{ backgroundColor: product.bg_color }} />
      ) : (
        <ImageIcon className="w-10 h-10 text-muted-foreground opacity-50" />
      )}
    </div>
  );

  const name = (
    <div>
      <FieldLabel>Nom du produit</FieldLabel>
      <TextValue>{product.name}</TextValue>
    </div>
  );
  const description = (
    <div>
      <FieldLabel>Description</FieldLabel>
      <TextValue>{product.description}</TextValue>
    </div>
  );
  const category = (
    <div>
      <FieldLabel>Catégorie</FieldLabel>
      <TextValue>{categoryName}</TextValue>
    </div>
  );
  const status = (
    <div>
      <FieldLabel>Statut</FieldLabel>
      <TextValue>{STATUS_LABELS[String(product.status)] ?? 'Indisponible'}</TextValue>
    </div>
  );
  const alcohol = (
    <div>
      <FieldLabel>Alcool</FieldLabel>
      <TextValue>{product.contains_alcohol ? 'Oui, contrôle d’âge' : 'Non'}</TextValue>
    </div>
  );
  const tagsField = (
    <div>
      <FieldLabel>Tags</FieldLabel>
      <ChipsValue items={productTags} emptyLabel="Aucun tag" />
    </div>
  );
  const allergensField = (
    <div>
      <FieldLabel>Allergènes</FieldLabel>
      <ChipsValue items={productAllergens} emptyLabel="Aucun allergène" />
    </div>
  );
  const bgColor = (
    <div>
      <FieldLabel>Couleur fond</FieldLabel>
      <ColorValue color={product.bg_color} size={isSheet ? 'sm' : 'md'} />
    </div>
  );
  const productionColor = (
    <div>
      <FieldLabel>Couleur production</FieldLabel>
      <ColorValue color={product.production_color} size={isSheet ? 'sm' : 'md'} />
    </div>
  );

  if (!isSheet) {
    return (
      <>
        {image}
        {name}
        {description}
        {category}
        {status}
        {alcohol}
        {tagsField}
        {allergensField}
        <div className="space-y-3">
          {bgColor}
          {productionColor}
        </div>
      </>
    );
  }

  return (
    <>
      <Card className="border-none bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-5">
            <div className="flex-shrink-0">{image}</div>
            <div className="flex-1 min-w-0 space-y-4">
              {name}
              {description}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-muted/50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-5">
            {category}
            {status}
            <div className="col-span-2">{alcohol}</div>
            {tagsField}
            {allergensField}
            {bgColor}
            {productionColor}
          </div>
        </CardContent>
      </Card>
    </>
  );
};
