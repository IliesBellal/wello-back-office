/**
 * Préparation des photos de carte avant envoi (porte photo de l'import).
 *
 * L'API n'accepte que du JPEG (type réel vérifié), 7 Mo par photo, 20 Mo au
 * total, 10 photos (internal/modules/menu/import_ai_handler.go). Chaque photo
 * est donc redessinée ici :
 * - l'orientation est appliquée : le modèle ne lit pas les métadonnées EXIF,
 *   une photo « droite » pour le téléphone lui arriverait couchée ;
 * - le grand côté est ramené à 2576 px, la définition maximale lue par le
 *   modèle (au-delà, l'API réduit de toute façon) : envoi plus rapide, rien de
 *   perdu ;
 * - le résultat est un JPEG, quel que soit le format d'origine lisible par le
 *   navigateur. Safari convertit déjà le HEIC d'un iPhone en JPEG quand le
 *   champ n'accepte que JPEG/PNG.
 */

export const MAX_MENU_PHOTOS = 10;
export const MENU_PHOTO_ACCEPT = 'image/jpeg,image/png';

const MAX_LONG_EDGE = 2576;
const MAX_PHOTO_BYTES = 7 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const JPEG_QUALITIES = [0.9, 0.8, 0.7];

export class MenuPhotoError extends Error {}

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new MenuPhotoError(`« ${file.name} » n’est pas une image lisible (JPEG ou PNG attendu).`));
    };
    image.src = url;
  });

const toJpeg = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new MenuPhotoError('Conversion de la photo impossible.'))),
      'image/jpeg',
      quality,
    );
  });

/**
 * Redessine une photo en JPEG orienté et redimensionné.
 *
 * Passe par un `<img>` plutôt que `createImageBitmap` : les navigateurs
 * appliquent l'orientation EXIF à l'affichage d'une image (propriété CSS
 * `image-orientation: from-image` par défaut), et dessiner cette image sur un
 * canvas conserve ce sens — y compris sur Safari, où les options de
 * `createImageBitmap` sont moins bien prises en charge.
 */
export const normalizeMenuPhoto = async (file: File): Promise<Blob> => {
  const image = await loadImage(file);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!width || !height) {
    throw new MenuPhotoError(`« ${file.name} » est vide.`);
  }

  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const context = canvas.getContext('2d');
  if (!context) throw new MenuPhotoError('Votre navigateur ne permet pas de préparer la photo.');
  // Fond blanc : un PNG transparent deviendrait noir en JPEG.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  for (const quality of JPEG_QUALITIES) {
    const blob = await toJpeg(canvas, quality);
    if (blob.size <= MAX_PHOTO_BYTES) return blob;
  }
  throw new MenuPhotoError(`« ${file.name} » reste trop lourde même compressée.`);
};

/** Prépare toutes les photos, dans l'ordre, et vérifie le poids total. */
export const normalizeMenuPhotos = async (files: File[]): Promise<Blob[]> => {
  if (files.length === 0) throw new MenuPhotoError('Ajoutez au moins une photo de votre carte.');
  if (files.length > MAX_MENU_PHOTOS) {
    throw new MenuPhotoError(`${MAX_MENU_PHOTOS} photos au maximum par import.`);
  }

  const blobs: Blob[] = [];
  for (const file of files) {
    blobs.push(await normalizeMenuPhoto(file));
  }

  const total = blobs.reduce((sum, blob) => sum + blob.size, 0);
  if (total > MAX_TOTAL_BYTES) {
    throw new MenuPhotoError('Les photos sont trop lourdes ensemble : envoyez-en moins à la fois.');
  }
  return blobs;
};
