import { ChevronRight, Download, FileSpreadsheet, Keyboard, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ImportDoorPickerProps {
  onChooseProvider: () => void;
  onChooseManual: () => void;
  onDownloadTemplate: () => void;
  isDownloadingTemplate: boolean;
}

/**
 * Première étape : les trois façons d'entrer des produits en masse.
 *
 * Les libellés sont écrits du point de vue du restaurateur — « ma caisse
 * actuelle », pas « provider » — parce que c'est lui qui choisit ici.
 */
export const ImportDoorPicker = ({
  onChooseProvider,
  onChooseManual,
  onDownloadTemplate,
  isDownloadingTemplate,
}: ImportDoorPickerProps) => (
  <div className="grid gap-4 md:grid-cols-3">
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
        <FileSpreadsheet className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 space-y-1">
        <h3 className="font-semibold">J’importe depuis ma caisse actuelle</h3>
        <p className="text-sm text-muted-foreground">
          Vous avez un export de votre logiciel de caisse, ou un modèle Wello déjà rempli ?
          Envoyez-le, nous vous montrerons ce qui sera créé avant d’enregistrer quoi que ce soit.
        </p>
      </div>
      <Button className="w-full" onClick={onChooseProvider}>
        Envoyer un fichier
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </Card>

    <Card className="flex flex-col gap-4 p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
        <Download className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 space-y-1">
        <h3 className="font-semibold">Je pars d’un modèle vierge</h3>
        <p className="text-sm text-muted-foreground">
          Téléchargez notre fichier Excel, remplissez-le tranquillement, puis revenez
          l’importer par la première porte en choisissant « Modèle Wello Resto rempli ».
        </p>
      </div>
      <Button variant="outline" className="w-full" onClick={onDownloadTemplate} disabled={isDownloadingTemplate}>
        {isDownloadingTemplate ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Préparation…
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Télécharger le modèle
          </>
        )}
      </Button>
    </Card>

    <Card className="flex flex-col gap-4 p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
        <Keyboard className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 space-y-1">
        <h3 className="font-semibold">Je saisis mes produits à la main</h3>
        <p className="text-sm text-muted-foreground">
          Remplissez un tableau, une ligne par produit, sans passer par un fichier. Pratique pour
          une dizaine de produits ou pour compléter une carte existante.
        </p>
      </div>
      <Button variant="outline" className="w-full" onClick={onChooseManual}>
        Saisir mes produits
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </Card>
  </div>
);
