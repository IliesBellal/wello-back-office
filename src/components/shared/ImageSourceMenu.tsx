import { useState, type ReactNode } from "react";
import { Images, Upload } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImageBankDialog } from "@/components/shared/ImageBankDialog";
import type { PickedImageUrl } from "@/lib/imageInput";
import type { ImageBankFormat } from "@/services/imageBankService";

interface ImageSourceMenuProps {
  /** Élément cliquable (zone d'image, bouton…) qui ouvre le menu. */
  children: ReactNode;
  /** « Depuis cet appareil » : ouvrir le sélecteur de fichier habituel. */
  onDevice: () => void;
  /** « Depuis la banque d'images » : URL choisie dans le popup. */
  onPick: (picked: PickedImageUrl) => void;
  /** Format proposé à l'ouverture du popup. */
  format?: ImageBankFormat;
  disabled?: boolean;
  align?: "start" | "center" | "end";
}

/**
 * Menu déroulant commun à tous les champs d'image (hors logos) :
 * « Depuis la banque d'images » ou « Depuis cet appareil ».
 */
export function ImageSourceMenu({ children, onDevice, onPick, format = "square", disabled, align = "start" }: ImageSourceMenuProps) {
  const [bankOpen, setBankOpen] = useState(false);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild disabled={disabled}>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-60">
          <DropdownMenuItem onSelect={() => setBankOpen(true)}>
            <Images className="mr-2 h-4 w-4" />
            Depuis la banque d'images
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onDevice()}>
            <Upload className="mr-2 h-4 w-4" />
            Depuis cet appareil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ImageBankDialog
        open={bankOpen}
        onOpenChange={setBankOpen}
        format={format}
        onSelect={(imageUrl) => onPick({ imageUrl })}
      />
    </>
  );
}
