import { Copy, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ManualCustomerRow, ManualCustomerTextField } from '@/lib/manualCustomerImport';

interface ImportManualRowProps {
  row: ManualCustomerRow;
  index: number;
  isLast: boolean;
  errors: Partial<Record<ManualCustomerTextField, string>> | undefined;
  disabled: boolean;
  onChange: (rowId: string, field: ManualCustomerTextField, value: string) => void;
  onToggleConsent: (rowId: string, value: boolean) => void;
  onDuplicate: (rowId: string) => void;
  onRemove: (rowId: string) => void;
  /** Entrée sur la dernière ligne en ajoute une : c'est ce qui rend la saisie fluide. */
  onAppendRow: () => void;
}

/**
 * Une ligne de la grille de saisie manuelle.
 *
 * Regroupée en cinq colonnes visuelles (identité, contact, adresse/société,
 * naissance, notes) plutôt qu'à plat sur onze champs — même principe que
 * `ImportManualRow` côté produit (qui empile nom/description et prix/TVA),
 * adapté ici à des champs client sans prix ni TVA.
 */
export const ImportManualRow = ({
  row,
  index,
  isLast,
  errors,
  disabled,
  onChange,
  onToggleConsent,
  onDuplicate,
  onRemove,
  onAppendRow,
}: ImportManualRowProps) => {
  const handleEnter = () => {
    if (isLast) onAppendRow();
  };

  const field = (
    name: ManualCustomerTextField,
    label: string,
    options: { placeholder?: string; className?: string } = {},
  ) => {
    const error = errors?.[name];

    return (
      <div className={options.className}>
        <Input
          value={row[name]}
          placeholder={options.placeholder}
          disabled={disabled}
          aria-label={`${label} — client ${index + 1}`}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(row.id, name, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleEnter();
            }
          }}
          className={cn('h-9', error && 'border-destructive focus-visible:ring-destructive')}
        />
        {error && <p className="mt-0.5 px-1 text-xs text-destructive">{error}</p>}
      </div>
    );
  };

  return (
    <TableRow className={cn('align-top', errors && 'bg-destructive/5')}>
      <TableCell className="p-2 text-center text-xs text-muted-foreground">
        <span className="inline-block pt-2.5 tabular-nums">{index + 1}</span>
      </TableCell>

      {/* Identité : nom au-dessus, prénom et nom de famille côte à côte en dessous. */}
      <TableCell className="space-y-1.5 p-2">
        {field('name', 'Nom', { placeholder: 'Jean Dupont' })}
        <div className="flex gap-1.5">
          {field('firstName', 'Prénom', { placeholder: 'Jean', className: 'flex-1' })}
          {field('lastName', 'Nom de famille', { placeholder: 'Dupont', className: 'flex-1' })}
        </div>
      </TableCell>

      {/* Contact : email au-dessus, téléphone en dessous — l'un des deux est obligatoire. */}
      <TableCell className="space-y-1.5 p-2">
        {field('email', 'Email', { placeholder: 'jean.dupont@email.fr' })}
        {field('phone', 'Téléphone', { placeholder: '0612345678' })}
      </TableCell>

      <TableCell className="space-y-1.5 p-2">
        {field('address', 'Adresse', { placeholder: '12 rue de la Paix' })}
        {field('businessName', 'Raison sociale', { placeholder: 'Facultatif' })}
      </TableCell>

      <TableCell className="p-2">{field('birthdate', 'Date de naissance', { placeholder: 'JJ/MM/AAAA' })}</TableCell>

      <TableCell className="space-y-1.5 p-2">
        {field('additionalInfo', 'Infos complémentaires', { placeholder: 'Note libre' })}
        {field('deliveryNotes', 'Notes de livraison', { placeholder: 'Consignes' })}
      </TableCell>

      <TableCell className="p-2 text-center">
        <div className="flex flex-col items-center gap-1 pt-1">
          <Checkbox
            checked={row.advertisingConsent}
            onCheckedChange={(checked) => onToggleConsent(row.id, checked === true)}
            disabled={disabled}
            aria-label={`Consentement marketing — client ${index + 1}`}
          />
          <span className="text-[11px] text-muted-foreground">
            {row.advertisingConsent ? 'Oui' : 'Non'}
          </span>
        </div>
      </TableCell>

      <TableCell className="p-2">
        <div className="flex items-center gap-1 pt-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={disabled}
            aria-label={`Dupliquer le client ${index + 1}`}
            title="Dupliquer (garde adresse et consentement)"
            onClick={() => onDuplicate(row.id)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            disabled={disabled}
            aria-label={`Supprimer le client ${index + 1}`}
            onClick={() => onRemove(row.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};
