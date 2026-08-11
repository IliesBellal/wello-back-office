import { useEffect } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProductImport, type ImportDoor } from '@/hooks/useProductImport';

import { ImportDoneStep } from './ImportDoneStep';
import { ImportDoorPicker } from './ImportDoorPicker';
import { ImportManualStep } from './ImportManualStep';
import { ImportReviewStep } from './ImportReviewStep';
import { ImportProviderStep } from './ImportProviderStep';

interface ProductImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Appelé après un import réussi, pour que la page rafraîchisse sa liste.
   * Le menu n'est pas sur react-query — pas d'invalidation de cache possible,
   * c'est à l'appelant de relancer son chargement.
   */
  onImported?: () => void;
  /**
   * Catégories du menu, proposées en autocomplétion à la saisie manuelle.
   * Évite de créer une catégorie jumelle sur une faute de frappe.
   */
  existingCategories?: string[];
  /**
   * Porte ouverte directement à l'ouverture, sans passer par l'écran de choix.
   * Sert au raccourci « Créer plusieurs produits » du menu, qui mène tout de
   * suite à la saisie manuelle plutôt qu'à reproposer les trois options.
   */
  initialDoor?: ImportDoor;
}

const STEP_TITLES: Record<string, { title: string; description: string }> = {
  choose: {
    title: 'Importer des produits',
    description: 'Trois façons d’ajouter vos produits en une fois.',
  },
  provider: {
    title: 'Importer un fichier',
    description: 'Indiquez d’où vient le fichier, puis envoyez-le.',
  },
  preview: {
    title: 'Vérifier avant d’enregistrer',
    description: 'Rien n’est enregistré tant que vous n’avez pas validé.',
  },
  done: {
    title: 'Import terminé',
    description: 'Voici ce qui a été ajouté à votre menu.',
  },
  manual: {
    title: 'Saisir mes produits',
    description: 'Une ligne par produit — rien n’est enregistré avant vérification.',
  },
};

/**
 * Calibre de la modale par étape : les grilles denses (saisie manuelle,
 * vérification) ont besoin de toute la largeur, les étapes plus légères
 * (choix, dépôt de fichier, résumé final) n'ont pas à occuper le même espace.
 */
const STEP_DIALOG_CLASS: Record<string, string> = {
  choose: 'max-w-4xl max-h-[85vh]',
  provider: 'max-w-2xl max-h-[85vh]',
  manual: 'max-w-7xl h-[90vh]',
  preview: 'max-w-7xl h-[90vh]',
  done: 'max-w-2xl max-h-[85vh]',
};

/**
 * Parcours d'import de produits.
 *
 * Modale large plutôt que page dédiée : le parcours part de la liste des
 * produits, y revient, et dure le temps d'un fichier. Une route imposerait de
 * gérer la persistance du jeton entre navigations et la perte d'état au
 * rafraîchissement, pour un gain nul. Le calibre reprend celui d'`OrganizeModal`,
 * déjà utilisé pour les surfaces denses, et bascule en plein écran sur mobile
 * comme le fait `ProductCreateSheet`.
 */
export const ProductImportDialog = ({
  open,
  onOpenChange,
  onImported,
  existingCategories,
  initialDoor,
}: ProductImportDialogProps) => {
  const isMobile = useIsMobile();
  const wizard = useProductImport();
  const {
    state,
    isUploading,
    isDownloadingTemplate,
    goToDoor,
    back,
    reset,
    setProvider,
    setFile,
    submitFile,
    downloadTemplate,
  } = wizard;

  // Repartir de zéro à chaque ouverture : réutiliser une prévisualisation
  // d'une session précédente exposerait un jeton peut-être expiré. Une porte
  // initiale saute directement l'écran de choix.
  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    if (initialDoor) goToDoor(initialDoor);
  }, [open, initialDoor, reset, goToDoor]);

  // Le menu vient d'être modifié en base : prévenir la page pour qu'elle
  // recharge, sans attendre la fermeture — l'utilisateur peut enchaîner sur un
  // second fichier et doit voir un état à jour derrière lui.
  const importedProductCount = state.result?.summary.products.created;
  useEffect(() => {
    if (importedProductCount !== undefined) {
      onImported?.();
    }
  }, [importedProductCount, onImported]);

  const heading = STEP_TITLES[state.step] ?? STEP_TITLES.choose;

  const body = (() => {
    switch (state.step) {
      case 'provider':
        return (
          <ImportProviderStep
            provider={state.provider}
            file={state.file}
            error={state.error}
            isUploading={isUploading}
            onProviderChange={setProvider}
            onFileChange={setFile}
            onSubmit={submitFile}
            onBack={back}
          />
        );

      case 'preview':
        // L'étape n'est atteignable qu'avec un résultat en main ; la garde
        // n'est là que pour satisfaire le typage.
        return state.preview ? <ImportReviewStep preview={state.preview} wizard={wizard} /> : null;

      case 'done':
        return state.result ? (
          <ImportDoneStep
            result={state.result}
            onClose={() => onOpenChange(false)}
            onImportAnother={back}
          />
        ) : null;

      case 'manual':
        return <ImportManualStep wizard={wizard} existingCategories={existingCategories} />;

      default:
        return (
          <ImportDoorPicker
            onChooseProvider={() => goToDoor('provider')}
            onChooseManual={() => goToDoor('manual')}
            onDownloadTemplate={() => downloadTemplate()}
            isDownloadingTemplate={isDownloadingTemplate}
          />
        );
    }
  })();

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!h-screen !max-h-screen !w-screen !gap-0 !rounded-none !p-0 flex flex-col [&_button[aria-label='Close']]:hidden">
          <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4 py-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
            <h2 className="flex-1 text-center text-sm font-semibold">{heading.title}</h2>
            <div className="w-8" />
          </div>
          <div className="flex-1 overflow-y-auto p-4">{body}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`flex flex-col ${STEP_DIALOG_CLASS[state.step] ?? STEP_DIALOG_CLASS.choose}`}
      >
        <DialogHeader>
          <DialogTitle>{heading.title}</DialogTitle>
          <DialogDescription>{heading.description}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-1 py-2">{body}</div>
      </DialogContent>
    </Dialog>
  );
};
