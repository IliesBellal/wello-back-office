import { ColorPresetPicker } from '@/components/shared/ColorPresetPicker';

/** Valeur stockée par défaut en base : la caisse la traite comme « pas de couleur ». */
const CATEGORY_DEFAULT_COLOR = '#ffffff';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Vrai si la catégorie a une vraie couleur (ni vide, ni le blanc par défaut). */
const hasCategoryColor = (value?: string | null): boolean =>
  !!value && HEX_COLOR.test(value) && value.toLowerCase() !== CATEGORY_DEFAULT_COLOR;

interface CategoryColorPickerProps {
  /** Couleur courante (#RRGGBB). Vide ou blanc = aucune couleur. */
  value?: string | null;
  /** Appelée avec la couleur choisie ; rejeter la promesse annule l'affichage du choix. */
  onChange: (hex: string) => Promise<void>;
  disabled?: boolean;
  /** Nom de la catégorie, pour l'accessibilité du bouton. */
  categoryName: string;
}

/**
 * Sélecteur de couleur de fond d'une catégorie caisse : le sélecteur commun
 * ([ColorPresetPicker]) où « Aucune » enregistre le blanc, que la caisse
 * traite comme « pas de couleur ».
 */
export function CategoryColorPicker({
  value,
  onChange,
  disabled,
  categoryName,
}: CategoryColorPickerProps) {
  return (
    <ColorPresetPicker
      value={hasCategoryColor(value) ? value : null}
      onChange={onChange}
      onClear={() => onChange(CATEGORY_DEFAULT_COLOR)}
      disabled={disabled}
      label={`la catégorie ${categoryName}`}
      description="Couleur affichée sur la caisse pour cette catégorie."
    />
  );
}
