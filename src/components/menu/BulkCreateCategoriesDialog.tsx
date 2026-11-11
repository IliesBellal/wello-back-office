import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface BulkCreateCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Noms des catégories existantes, pour ne pas créer de doublon. */
  existingNames: string[];
  /** Crée les catégories ; renvoie les noms créés et ceux en échec. */
  onSubmit: (names: string[]) => Promise<{ created: number; failed: string[] }>;
}

const normalize = (name: string) => name.trim().toLocaleLowerCase('fr');

/**
 * Création de plusieurs catégories caisse d'un coup : un nom par ligne.
 * Les lignes vides, les doublons et les noms déjà pris sont écartés ; le
 * récapitulatif affiché avant la validation dit exactement ce qui sera créé.
 */
export function BulkCreateCategoriesDialog({
  open,
  onOpenChange,
  existingNames,
  onSubmit,
}: BulkCreateCategoriesDialogProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toCreate, alreadyExisting, duplicates } = useMemo(() => {
    const taken = new Set(existingNames.map(normalize));
    const seen = new Set<string>();
    const toCreate: string[] = [];
    const alreadyExisting: string[] = [];
    let duplicates = 0;
    for (const raw of text.split('\n')) {
      const name = raw.trim();
      if (!name) continue;
      const key = normalize(name);
      if (seen.has(key)) {
        duplicates += 1;
        continue;
      }
      seen.add(key);
      if (taken.has(key)) {
        alreadyExisting.push(name);
      } else {
        toCreate.push(name);
      }
    }
    return { toCreate, alreadyExisting, duplicates };
  }, [text, existingNames]);

  const handleOpenChange = (next: boolean) => {
    if (isSubmitting) return;
    if (!next) setText('');
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (toCreate.length === 0) return;
    setIsSubmitting(true);
    try {
      const result = await onSubmit(toCreate);
      // En cas d'échec partiel, on garde les noms en échec pour réessayer.
      setText(result.failed.join('\n'));
      if (result.failed.length === 0) onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer plusieurs catégories</DialogTitle>
          <DialogDescription>
            Saisissez un nom par ligne, dans l'ordre où vous voulez les voir en caisse.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          autoFocus
          rows={8}
          placeholder={'Entrées\nPlats\nDesserts\nBoissons'}
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={isSubmitting}
        />

        <p className="text-sm text-muted-foreground">
          {toCreate.length === 0
            ? 'Aucune catégorie à créer.'
            : `${toCreate.length} catégorie${toCreate.length > 1 ? 's' : ''} à créer.`}
          {alreadyExisting.length > 0 &&
            ` Déjà existante${alreadyExisting.length > 1 ? 's' : ''} (ignorée${
              alreadyExisting.length > 1 ? 's' : ''
            }) : ${alreadyExisting.join(', ')}.`}
          {duplicates > 0 && ` ${duplicates} doublon${duplicates > 1 ? 's' : ''} ignoré${duplicates > 1 ? 's' : ''}.`}
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={toCreate.length === 0 || isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
