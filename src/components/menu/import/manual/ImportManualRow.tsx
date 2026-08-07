import { Copy, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ManualRow, ManualRowField } from '@/lib/manualImport';

interface ImportManualRowProps {
  row: ManualRow;
  index: number;
  isLast: boolean;
  errors: Partial<Record<ManualRowField, string>> | undefined;
  disabled: boolean;
  categoryListId: string;
  rateListId: string;
  onChange: (rowId: string, field: ManualRowField, value: string) => void;
  onDuplicate: (rowId: string) => void;
  onRemove: (rowId: string) => void;
  /** Entrée sur la dernière ligne en ajoute une : c'est ce qui rend la saisie fluide. */
  onAppendRow: () => void;
}

interface CellProps {
  field: ManualRowField;
  value: string;
  error?: string;
  placeholder?: string;
  align?: 'left' | 'right';
  listId?: string;
  disabled: boolean;
  onChange: (field: ManualRowField, value: string) => void;
  onEnter: () => void;
  label: string;
}

const Cell = ({
  field,
  value,
  error,
  placeholder,
  align = 'left',
  listId,
  disabled,
  onChange,
  onEnter,
  label,
}: CellProps) => (
  <TableCell className="p-1 align-top">
    <Input
      value={value}
      list={listId}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={label}
      aria-invalid={Boolean(error)}
      onChange={(event) => onChange(field, event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onEnter();
        }
      }}
      className={cn(
        'h-9',
        align === 'right' && 'text-right font-mono',
        error && 'border-destructive focus-visible:ring-destructive',
      )}
    />
    {error && <p className="mt-0.5 px-1 text-xs text-destructive">{error}</p>}
  </TableCell>
);

/**
 * Une ligne de la grille de saisie.
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
  rateListId,
  onChange,
  onDuplicate,
  onRemove,
  onAppendRow,
}: ImportManualRowProps) => {
  const handleChange = (field: ManualRowField, value: string) => onChange(row.id, field, value);
  const handleEnter = () => {
    if (isLast) onAppendRow();
  };

  const cell = (
    field: ManualRowField,
    label: string,
    options: { placeholder?: string; align?: 'left' | 'right'; listId?: string } = {},
  ) => (
    <Cell
      field={field}
      value={row[field]}
      error={errors?.[field]}
      label={`${label} — ligne ${index + 1}`}
      disabled={disabled}
      onChange={handleChange}
      onEnter={handleEnter}
      {...options}
    />
  );

  return (
    <TableRow className={errors ? 'bg-destructive/5' : undefined}>
      <TableCell className="p-1 text-center align-top text-xs text-muted-foreground">
        <span className="inline-block pt-2.5 tabular-nums">{index + 1}</span>
      </TableCell>

      {cell('name', 'Nom', { placeholder: 'Pizza Margherita' })}
      {cell('description', 'Description', { placeholder: 'Tomate, mozzarella' })}
      {cell('category', 'Catégorie', { placeholder: 'Pizzas', listId: categoryListId })}

      {cell('priceIn', 'Prix sur place', { placeholder: '9,50', align: 'right' })}
      {cell('priceTakeAway', 'Prix à emporter', { placeholder: '9,50', align: 'right' })}
      {cell('priceDelivery', 'Prix en livraison', { placeholder: '10,50', align: 'right' })}

      {cell('tvaIn', 'TVA sur place', { placeholder: '10', align: 'right', listId: rateListId })}
      {cell('tvaTakeAway', 'TVA à emporter', { placeholder: '10', align: 'right', listId: rateListId })}
      {cell('tvaDelivery', 'TVA en livraison', { placeholder: '10', align: 'right', listId: rateListId })}

      {cell('tags', 'Tags', { placeholder: 'Végétarien, Signature' })}

      <TableCell className="p-1 align-top">
        <div className="flex items-center gap-1 pt-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={disabled}
            aria-label={`Dupliquer la ligne ${index + 1}`}
            title="Dupliquer (garde catégorie, prix, TVA et tags)"
            onClick={() => onDuplicate(row.id)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            disabled={disabled}
            aria-label={`Supprimer la ligne ${index + 1}`}
            onClick={() => onRemove(row.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};
