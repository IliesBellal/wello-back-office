import { describeAttributeRule } from '@/lib/importAttributes';
import { formatPrice } from '@/utils/priceInputUtils';
import type { ImportPreviewAttribute } from '@/types/import';

/** « Cheddar +1,00 € » ; une option gratuite ne montre pas de montant. */
const describeOption = (title: string, extraPrice: number): string =>
  extraPrice > 0 ? `${title} +${formatPrice(extraPrice)}` : title;

interface ImportProductAttributesProps {
  attributes: ImportPreviewAttribute[];
}

/**
 * Groupes d'options d'un produit, avec leurs options et leurs suppléments :
 * ce que l'import créera réellement (quantités, tailles, suppléments).
 */
export const ImportProductAttributes = ({ attributes }: ImportProductAttributesProps) => {
  if (attributes.length === 0) return null;

  return (
    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
      {attributes.map((attribute) => (
        <li key={attribute.external_id}>
          <span className="font-medium text-foreground">{attribute.name}</span> (
          {describeAttributeRule(attribute)}) :{' '}
          {(attribute.options ?? []).map((option) => describeOption(option.title, option.extra_price)).join(' · ')}
        </li>
      ))}
    </ul>
  );
};
