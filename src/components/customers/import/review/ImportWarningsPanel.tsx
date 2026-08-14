import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { CustomerImportWarning } from '@/types/customerImport';

interface ImportWarningsPanelProps {
  warnings: CustomerImportWarning[];
}

/**
 * Intitulés lisibles des familles d'avertissement émises par l'API
 * (internal/modules/customers/importer/{values,preview}.go).
 */
const WARNING_TITLES: Record<string, string> = {
  missing_contact: 'Ni email ni téléphone',
  missing_name: 'Ni nom ni prénom',
  invalid_email: 'Emails illisibles (ignorés)',
  invalid_phone: 'Téléphones peu plausibles',
  unparseable_birthdate: 'Dates de naissance illisibles',
  unparseable_registration_date: "Dates d'inscription illisibles",
  duplicate_conflict: 'Conflits email/téléphone',
  intra_file_shared_phone: 'Téléphone partagé par plusieurs lignes du fichier',
};

/**
 * Avertissements de la prévisualisation.
 *
 * Informatifs : ils n'empêchent jamais d'enregistrer (contrairement aux
 * statuts `duplicate`/`conflict`/`already_imported`, qui ont leurs propres
 * sections). Regroupement replié par famille, comme côté produit.
 */
export const ImportWarningsPanel = ({ warnings }: ImportWarningsPanelProps) => {
  const groups = useMemo(() => {
    const byCode = new Map<string, CustomerImportWarning[]>();
    for (const warning of warnings) {
      const existing = byCode.get(warning.code);
      if (existing) existing.push(warning);
      else byCode.set(warning.code, [warning]);
    }
    return [...byCode.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [warnings]);

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun point d’attention.</p>;
  }

  return (
    <Accordion type="multiple" className="rounded-lg border px-4">
      {groups.map(([code, entries]) => (
        <AccordionItem key={code} value={code}>
          <AccordionTrigger className="text-sm">
            <span className="flex items-center gap-2 text-left">
              <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground" />
              {WARNING_TITLES[code] ?? code}
              <span className="text-muted-foreground">({entries.length})</span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ul className="max-h-56 space-y-1 overflow-y-auto pb-2">
              {entries.slice(0, 100).map((warning, index) => (
                <li key={`${warning.ref}-${index}`} className="text-sm text-muted-foreground">
                  {warning.message}
                </li>
              ))}
              {entries.length > 100 && (
                <li className="text-sm italic text-muted-foreground">
                  … et {entries.length - 100} autre(s).
                </li>
              )}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};
