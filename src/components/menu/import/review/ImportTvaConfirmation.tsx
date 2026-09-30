import { Checkbox } from '@/components/ui/checkbox';

interface ImportTvaConfirmationProps {
  confirmed: boolean;
  disabled: boolean;
  onChange: (confirmed: boolean) => void;
}

/**
 * Porte photo : confirmation des prix et taux de TVA (`tva_confirmed`), exigée
 * au commit. En fin de page, juste avant le bouton d'import : on confirme
 * après avoir tout relu.
 */
export const ImportTvaConfirmation = ({ confirmed, disabled, onChange }: ImportTvaConfirmationProps) => (
  <label className="flex items-start gap-3 rounded-lg border bg-card p-4 text-sm">
    <Checkbox
      checked={confirmed}
      disabled={disabled}
      onCheckedChange={(checked) => onChange(checked === true)}
      className="mt-0.5"
    />
    <span>
      <span className="font-medium">J’ai vérifié les prix et les taux de TVA de chaque produit.</span>
      <span className="block text-muted-foreground">
        Une carte n’indique jamais la TVA : les taux proposés sont déduits de ce qu’est le produit.
        10 % pour ce qui se consomme tout de suite ; 5,5 % à emporter et en livraison pour les
        boissons fermées et les produits emballés ; 20 % pour l’alcool.
      </span>
    </span>
  </label>
);
