import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import type { DuplicateNameDialogProps } from '@/hooks/useDuplicateNameConfirm';

/**
 * Propose de créer malgré un nom déjà utilisé. Alimentée par
 * `useDuplicateNameConfirm`, qui rejoue la requête initiale à l'identique —
 * l'API n'accepte le doublon que si le 2e appel est rigoureusement le même.
 */
export const DuplicateNameDialog = ({
  pending,
  isConfirming,
  onConfirm,
  onDismiss,
}: DuplicateNameDialogProps) => (
  <AlertDialog open={pending !== null} onOpenChange={(open) => { if (!open) onDismiss(); }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Nom déjà utilisé</AlertDialogTitle>
        <AlertDialogDescription>
          {pending?.message} Vous pouvez conserver ce nom et créer un doublon, ou annuler pour
          revenir au formulaire et en choisir un autre.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isConfirming}>Annuler</AlertDialogCancel>
        <AlertDialogAction
          onClick={(event) => {
            // Sans ça Radix ferme la boîte avant la fin de la requête et
            // l'indicateur de chargement n'est jamais visible.
            event.preventDefault();
            onConfirm();
          }}
          disabled={isConfirming}
        >
          {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Créer quand même
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
