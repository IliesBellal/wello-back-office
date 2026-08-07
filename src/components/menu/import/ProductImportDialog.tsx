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
import { useProductImport } from '@/hooks/useProductImport';

import { ImportDoneStep } from './ImportDoneStep';
import { ImportDoorPicker } from './ImportDoorPicker';
import { ImportManualStub } from './ImportManualStub';
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
  'manual-stub': {
    title: 'Saisie manuelle',
    description: 'Cette porte arrive bientôt.',
  },
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
export const ProductImportDialog = ({ open, onOpenChange, onImported }: ProductImportDialogProps) => {
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
  // d'une session précédente exposerait un jeton peut-être expiré.
  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

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

      case 'manual-stub':
        return <ImportManualStub onBack={back} />;

      default:
        return (
          <ImportDoorPicker
            onChooseProvider={() => goToDoor('provider')}
            onChooseManual={() => goToDoor('manual-stub')}
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
      <DialogContent className="flex h-[90vh] max-w-7xl flex-col">
        <DialogHeader>
          <DialogTitle>{heading.title}</DialogTitle>
          <DialogDescription>{heading.description}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-1 py-2">{body}</div>
      </DialogContent>
    </Dialog>
  );
};
