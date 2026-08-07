import { ArrowLeft, Keyboard } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ImportManualStubProps {
  onBack: () => void;
}

/**
 * Porte « saisie à la main », en attente de son formulaire.
 *
 * Elle est visible plutôt que masquée : c'est la façon la plus naturelle
 * d'entrer quelques produits pour qui n'a aucun fichier, et la cacher
 * laisserait croire que seul l'import de fichier est possible.
 */
export const ImportManualStub = ({ onBack }: ImportManualStubProps) => (
  <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-12 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
      <Keyboard className="h-6 w-6 text-muted-foreground" />
    </div>
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Saisie manuelle — bientôt disponible</h3>
      <p className="text-sm text-muted-foreground">
        Vous pourrez saisir plusieurs produits d’affilée dans un tableau, sans passer par un
        fichier. En attendant, deux options : télécharger le modèle vierge et le remplir dans
        Excel, ou créer vos produits un par un depuis « Nouveau Produit ».
      </p>
    </div>
    <Button variant="outline" onClick={onBack}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Revenir aux options d’import
    </Button>
  </div>
);
