import { Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Ctrl + Z / Ctrl + Maj + Z', action: 'Annuler / rétablir' },
  { keys: 'Ctrl + S', action: 'Publier le plan' },
  { keys: 'Suppr', action: 'Supprimer la sélection' },
  { keys: 'Ctrl + D', action: 'Dupliquer' },
  { keys: 'Ctrl + C / Ctrl + V', action: 'Copier / coller' },
  { keys: 'Ctrl + A', action: "Tout sélectionner sur l'étage" },
  { keys: 'Flèches', action: 'Déplacer d’un cran de grille (Maj : 1 unité)' },
  { keys: 'Maj + clic', action: 'Ajouter à la sélection' },
  { keys: 'Alt + glisser', action: 'Déplacer sans accrochage à la grille' },
  { keys: 'Glisser sur le fond', action: 'Sélection au rectangle' },
  { keys: 'Espace + glisser', action: 'Déplacer la vue' },
  { keys: 'Molette', action: 'Zoomer' },
  { keys: '+ / − / 0', action: 'Zoom avant / arrière / ajuster' },
  { keys: 'Échap', action: 'Terminer l’outil / désélectionner' },
  { keys: 'Maj (tracé de mur)', action: 'Forcer des angles de 15°' }
];

/** Aide-mémoire des raccourcis de l'éditeur. */
export function ShortcutsHelp() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9" aria-label="Raccourcis clavier" title="Raccourcis clavier">
          <Keyboard className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Raccourcis</h3>
        <dl className="space-y-1.5 text-sm">
          {SHORTCUTS.map(({ keys, action }) => (
            <div key={keys} className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">{action}</dt>
              <dd className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{keys}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
