/**
 * Image à placer sur un produit, une option, une catégorie, une bannière…
 *
 * - `File` : fichier choisi « Depuis cet appareil », envoyé en multipart ;
 * - `{ imageUrl }` : image choisie « Depuis la banque d'images » (ou dans
 *   « Mes images »), envoyée en JSON `{ "image_url": … }` au même endpoint.
 *   L'API reprend telle quelle une URL de la banque et copie une image de
 *   l'établissement (voir ib-welloresto-api/docs/banque-images.md).
 */
export interface PickedImageUrl {
  imageUrl: string;
}

export type ImageInput = File | PickedImageUrl;

export const isImageFile = (input: ImageInput): input is File =>
  typeof File !== "undefined" && input instanceof File;

/** URL à afficher en aperçu pour une image choisie par URL, sinon null. */
export const pickedImageUrl = (input: ImageInput | null | undefined): string | null =>
  input && !isImageFile(input) ? input.imageUrl : null;

/** Fichier à prévisualiser (objet URL), sinon null. */
export const pickedImageFile = (input: ImageInput | null | undefined): File | null =>
  input && isImageFile(input) ? input : null;

/** Libellé pour les logs d'API. */
export const describeImageInput = (input: ImageInput): Record<string, unknown> =>
  isImageFile(input) ? { fileName: input.name, fileSize: input.size } : { imageUrl: input.imageUrl };

const STORAGE_ORIGIN = "https://storage.welloresto.fr";

/**
 * Miniature servie par Cloudflare Image Transformations pour une image de
 * notre stockage (docs/images-redimensionnement.md côté API). Les autres URLs
 * sont renvoyées telles quelles. Prévoir un repli sur l'original (onError) :
 * les transformations peuvent ne pas être actives sur un environnement.
 */
export const thumbnailUrl = (url: string, width = 400): string => {
  if (!url.startsWith(`${STORAGE_ORIGIN}/`) || url.startsWith(`${STORAGE_ORIGIN}/cdn-cgi/`)) {
    return url;
  }
  const path = url.slice(STORAGE_ORIGIN.length + 1);
  return `${STORAGE_ORIGIN}/cdn-cgi/image/width=${width},format=auto/${path}`;
};

/**
 * Corps de requête d'upload : FormData (fichier, champ `field`) ou JSON
 * `{ image_url }` (image choisie dans la banque ou dans « Mes images »).
 */
export const toUploadBody = (input: ImageInput, field = "photo"): FormData | { image_url: string } => {
  if (isImageFile(input)) {
    const formData = new FormData();
    formData.append(field, input);
    return formData;
  }
  return { image_url: input.imageUrl };
};

/** URL d'une image de la banque Wello Resto (fichier partagé, jamais copié). */
export const isImageBankUrl = (url: string | null | undefined): boolean =>
  !!url && url.includes("/wello_resto_images_storage/image_bank/");
