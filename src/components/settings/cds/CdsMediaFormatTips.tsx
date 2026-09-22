import { Lightbulb } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CDS_MAX_IMAGE_MB,
  CDS_MAX_VIDEO_MB,
  cdsBannerSpecs,
  type CdsLayoutMode,
} from "@/types/cds";

interface CdsMediaFormatTipsProps {
  layout: CdsLayoutMode;
}

/**
 * Conseils de format pour remplir le bandeau au mieux.
 *
 * Les dimensions changent avec la disposition : un bandeau vertical à droite est
 * un cadre portrait (≈ 3:8), un bandeau horizontal en bas est un cadre
 * panoramique (≈ 9:1). Un visuel 16:9 ordinaire y serait recadré de façon
 * brutale, d'où l'intérêt de prévenir AVANT l'export plutôt qu'après.
 *
 * Rien à afficher sans bandeau.
 */
export function CdsMediaFormatTips({ layout }: CdsMediaFormatTipsProps) {
  if (layout === "no_marketing") return null;

  const spec = cdsBannerSpecs[layout];
  const isBottom = layout === "marketing_bottom";

  return (
    <Alert>
      <Lightbulb className="h-4 w-4" />
      <AlertTitle>Formats recommandés pour ce bandeau</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
          <li>
            <strong>
              {spec.width} × {spec.height} px
            </strong>{" "}
            — format {spec.orientation} ({spec.ratio}), pour un écran 1920 ×
            1080. Exportez à cette taille exacte : un fichier plus grand ne
            s'affiche pas mieux et alourdit inutilement le boîtier.
          </li>
          <li>
            Le média <strong>remplit le cadre</strong> et est recadré s'il n'a
            pas le même rapport : gardez textes et logos au centre, avec une
            marge de sécurité d'environ 5 % sur les bords.
          </li>
          <li>
            <strong>Images</strong> : JPEG, PNG ou WebP, {CDS_MAX_IMAGE_MB} Mo
            maximum.
          </li>
          <li>
            <strong>Vidéos</strong> : MP4 (H.264) ou WebM, {CDS_MAX_VIDEO_MB} Mo
            maximum, mêmes dimensions, 30 images/s. Elles sont lues{" "}
            <strong>sans son</strong> : supprimez la piste audio pour alléger le
            fichier. Une vidéo est jouée en entier, préférez des boucles de 10 à
            30 secondes.
          </li>
          <li>
            <strong>Textes</strong> : caractères d'au moins 40 px et fort
            contraste, l'écran se lit à plusieurs mètres.
          </li>
          <li>
            <strong>QR code</strong> : environ {spec.qrSide} px de côté à
            l'écran.
            {isBottom
              ? " C’est petit pour un scan à distance : préférez un bandeau vertical si le QR code est l’élément principal, et un lien court pour un code plus lisible."
              : " Un lien court donne un code plus simple, donc plus lisible de loin."}
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}
