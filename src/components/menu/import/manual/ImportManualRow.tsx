import { Copy, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ManualRow, ManualRowField } from '@/lib/manualImport';
import type { TvaRate } from '@/types/menu';

interface ImportManualRowProps {
  row: ManualRow;
  index: number;
  isLast: boolean;
  errors: Partial<Record<ManualRowField, string>> | undefined;
  disabled: boolean;
  categoryListId: string;
  /** Taux configurés chez le marchand, par canal — restreint le choix à ce qui existe réellement. */
  ratesIn: TvaRate[];
  ratesTakeAway: TvaRate[];
  ratesDelivery: TvaRate[];
  loadingRates: boolean;
  onChange: (rowId: string, field: ManualRowField, value: string) => void;
  onDuplicate: (rowId: string) => void;
  onRemove: (rowId: string) => void;
  /** Entrée sur la dernière ligne en ajoute une : c'est ce qui rend la saisie fluide. */
  onAppendRow: () => void;
}

/**
 * Une ligne de la grille de saisie.
 *
 * Chaque produit tient sur **deux lignes de champs** empilées dans cinq
 * colonnes : identité, catégorie, puis un bloc prix + TVA par canal de vente.
 * Grouper le prix et son taux évite de compter les colonnes pour savoir à quel
 * canal une case appartient, ce qui arrivait vite quand les neuf champs
 * s'alignaient à plat.
 *
 * Les valeurs restent des chaînes jusqu'à l'envoi : convertir à chaque frappe
 * ferait sauter le curseur et interdirait les états intermédiaires — on ne peut
 * pas taper « 9,50 » sans passer par « 9, ».
 */
export const ImportManualRow = ({
  row,
  index,
  isLast,
  errors,
  disabled,
  categoryListId,
  ratesIn,
  ratesTakeAway,
  ratesDelivery,
  loadingRates,
  onChange,
  onDuplicate,
  onRemove,
  onAppendRow,
}: ImportManualRowProps) => {
  const handleEnter = () => {
    if (isLast) onAppendRow();
  };

  const field = (
    name: ManualRowField,
    label: string,
    options: {
      placeholder?: string;
      align?: 'left' | 'right';
      listId?: string;
      prefix?: string;
    } = {},
  ) => {
    const error = errors?.[name];

    return (
      <div>
        <div className="relative">
          <Input
            value={row[name]}
            list={options.listId}
            placeholder={options.placeholder}
            disabled={disabled}
            aria-label={`${label} — produit ${index + 1}`}
            aria-invalid={Boolean(error)}
            onChange={(event) => onChange(row.id, name, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleEnter();
              }
            }}
            className={cn(
              'h-9',
              options.align === 'right' && 'pr-7 text-right font-mono',
              error && 'border-destructive focus-visible:ring-destructive',
            )}
          />
          {options.prefix && (
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {options.prefix}
            </span>
          )}
        </div>
        {error && <p className="mt-0.5 px-1 text-xs text-destructive">{error}</p>}
      </div>
    );
  };

  /**
   * Sélecteur de taux, verrouillé sur ce que la caisse a réellement configuré
   * pour ce canal — le pendant de `field()`, mais pour la TVA. Un champ texte
   * laissait taper un taux qui n'existe pas, ce que l'écran de vérification ne
   * rattrape pas toujours proprement ; ne proposer que les taux du canal
   * l'empêche à la source, comme le fait déjà la fiche de création de produit.
   */
  const tvaField = (name: ManualRowField, label: string, rates: TvaRate[]) => {
    const error = errors?.[name];

    return (
      <div>
        <Select
          value={row[name]}
          disabled={disabled || loadingRates}
          onValueChange={(value) => onChange(row.id, name, value)}
        >
          <SelectTrigger
            aria-label={`${label} — produit ${index + 1}`}
            aria-invalid={Boolean(error)}
            className={cn('h-9 text-xs', error && 'border-destructive focus-visible:ring-destructive')}
          >
            <SelectValue placeholder={loadingRates ? 'Chargement…' : 'TVA'} />
          </SelectTrigger>
          <SelectContent>
            {rates.map((rate) => (
              <SelectItem key={rate.id} value={String(rate.value)}>
                {rate.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="mt-0.5 px-1 text-xs text-destructive">{error}</p>}
      </div>
    );
  };

  return (
    <TableRow className={cn('align-top', errors && 'bg-destructive/5')}>
      <TableCell className="p-2 text-center text-xs text-muted-foreground">
        <span className="inline-block pt-2.5 tabular-nums">{index + 1}</span>
      </TableCell>

      {/* Identité : nom au-dessus, description en dessous. */}
      <TableCell className="space-y-1.5 p-2">
        {field('name', 'Nom', { placeholder: 'Pizza Margherita' })}
        {field('description', 'Description', { placeholder: 'Tomate, mozzarella, basilic' })}
      </TableCell>

      <TableCell className="p-2">
        {field('category', 'Catégorie', { placeholder: 'Pizzas', listId: categoryListId })}
      </TableCell>

      <TableCell className="space-y-1.5 p-2">
        {field('priceIn', 'Prix sur place', { placeholder: '9,50', align: 'right', prefix: '€' })}
        {tvaField('tvaIn', 'TVA sur place', ratesIn)}
      </TableCell>

      <TableCell className="space-y-1.5 p-2">
        {field('priceTakeAway', 'Prix à emporter', {
          placeholder: '9,50',
          align: 'right',
          prefix: '€',
        })}
        {tvaField('tvaTakeAway', 'TVA à emporter', ratesTakeAway)}
      </TableCell>

      <TableCell className="space-y-1.5 p-2">
        {field('priceDelivery', 'Prix en livraison', {
          placeholder: '10,50',
          align: 'right',
          prefix: '€',
        })}
        {tvaField('tvaDelivery', 'TVA en livraison', ratesDelivery)}
      </TableCell>

      <TableCell className="p-2">
        <div className="flex items-center gap-1 pt-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={disabled}
            aria-label={`Dupliquer le produit ${index + 1}`}
            title="Dupliquer (garde catégorie, prix et TVA)"
            onClick={() => onDuplicate(row.id)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            disabled={disabled}
            aria-label={`Supprimer le produit ${index + 1}`}
            onClick={() => onRemove(row.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};
