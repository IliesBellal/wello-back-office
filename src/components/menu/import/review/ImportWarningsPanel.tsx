import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { ImportPreviewWarning } from '@/types/import';

interface ImportWarningsPanelProps {
  warnings: ImportPreviewWarning[];
}

/** Intitulés lisibles des familles d'avertissement émises par l'API. */
const WARNING_TITLES: Record<string, string> = {
  tva_rate_unresolved: 'Taux de TVA non reconnus',
  tva_rate_missing: 'Taux de TVA absents du fichier',
  product_needs_category: 'Produits sans catégorie',
  product_name_collision: 'Noms déjà utilisés',
  product_removed_from_menu: 'Produits sans prix, retirés de la carte',
  label_dropped: 'Libellés non retenus',
  tag_synthesized: 'Libellés absents du fichier',
};

/**
 * Avertissements de la prévisualisation.
 *
 * Informatifs : ils n'empêchent jamais d'enregistrer. Ce qui bloque est traité
 * dans les sections dédiées ; le reste mérite d'être vu sans être imposé, d'où
 * le regroupement replié par famille.
 */
export const ImportWarningsPanel = ({ warnings }: ImportWarningsPanelProps) => {
  const groups = useMemo(() => {
    const byCode = new Map<string, ImportPreviewWarning[]>();
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
