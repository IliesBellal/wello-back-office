import { useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, ArrowLeft, Camera, ImagePlus, Loader2, Trash2, X } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MAX_MENU_PHOTOS, MENU_PHOTO_ACCEPT } from '@/lib/menuPhotos';
import type { UseProductImport } from '@/hooks/useProductImport';
import type { ImportPhotoDraftStatus } from '@/types/import';

interface ImportPhotoStepProps {
  wizard: UseProductImport;
}

const PHOTO_DRAFT_STATUS_LABELS: Record<ImportPhotoDraftStatus, string> = {
  pending: 'En attente',
  processing: 'Lecture en cours',
  ready: 'Prêt à vérifier',
  failed: 'Échec de lecture',
  committed: 'Importé',
  expired: 'Abandonné',
};

/**
 * Porte photo, étape 1 : choisir les photos de la carte.
 *
 * Les photos sont préparées dans le navigateur au moment de l'envoi (voir
 * `normalizeMenuPhotos`) : JPEG orienté, 2576 px au plus. Le champ n'accepte
 * que JPEG et PNG, ce qui fait convertir le HEIC par Safari sur iPhone.
 */
export const ImportPhotoStep = ({ wizard }: ImportPhotoStepProps) => {
  const {
    state,
    photoDrafts,
    isUploadingPhotos,
    addPhotos,
    removePhoto,
    submitPhotos,
    resumePhotoDraft,
    abandonPhotoDraft,
    back,
  } = wizard;
  const pickerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Aperçus locaux, libérés quand la sélection change.
  const previews = useMemo(() => state.photos.map((file) => URL.createObjectURL(file)), [state.photos]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const credits = photoDrafts?.credits;
  const noCredit = credits !== undefined && credits.remaining <= 0;
  const openDrafts = photoDrafts?.drafts ?? [];

  const onFiles = (list: FileList | null) => {
    if (list && list.length > 0) addPhotos(Array.from(list));
  };

  return (
    <div className="flex flex-col gap-5">
      {openDrafts.length > 0 && (
        <Card className="space-y-3 p-4">
          <p className="text-sm font-medium">Lectures en cours ou à vérifier</p>
          <ul className="space-y-2">
            {openDrafts.map((draft) => (
              <li key={draft.id} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-muted-foreground">
                  {format(new Date(draft.created_at), 'd MMM à HH:mm', { locale: fr })}
                </span>
                <span>
                  {draft.photos_done}/{draft.photos_total} photo(s) lue(s)
                </span>
                <Badge variant={draft.status === 'failed' ? 'destructive' : 'secondary'}>
                  {PHOTO_DRAFT_STATUS_LABELS[draft.status]}
                </Badge>
                <span className="flex-1" />
                <Button size="sm" variant="outline" onClick={() => resumePhotoDraft(draft.id)}>
                  Reprendre
                </Button>
                {draft.status !== 'processing' && draft.status !== 'pending' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Abandonner ce brouillon"
                    onClick={() => abandonPhotoDraft(draft.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          Une photo par page de carte, bien éclairée, sans reflet, carte entière dans le cadre. La
          lecture prend environ une minute par photo ; vous pourrez tout vérifier et corriger avant
          l’import.
        </p>
        {credits && (
          <p>
            {noCredit
              ? 'Vous avez utilisé tous vos imports par photo.'
              : `Il vous reste ${credits.remaining} import(s) par photo. Une lecture qui échoue entièrement ne compte pas.`}
          </p>
        )}
      </div>

      <input
        ref={pickerRef}
        type="file"
        accept={MENU_PHOTO_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          onFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept={MENU_PHOTO_ACCEPT}
        capture="environment"
        className="hidden"
        onChange={(event) => {
          onFiles(event.target.files);
          event.target.value = '';
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => pickerRef.current?.click()}
          disabled={isUploadingPhotos || state.photos.length >= MAX_MENU_PHOTOS}
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          Choisir des photos
        </Button>
        <Button
          variant="outline"
          onClick={() => cameraRef.current?.click()}
          disabled={isUploadingPhotos || state.photos.length >= MAX_MENU_PHOTOS}
        >
          <Camera className="mr-2 h-4 w-4" />
          Prendre une photo
        </Button>
        <span className="self-center text-sm text-muted-foreground">
          {state.photos.length}/{MAX_MENU_PHOTOS}
        </span>
      </div>

      {state.photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {state.photos.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative overflow-hidden rounded-md border">
              <img src={previews[index]} alt={`Photo ${index + 1}`} className="aspect-[3/4] w-full object-cover" />
              <span className="absolute left-1 top-1 rounded bg-background/80 px-1.5 text-xs font-medium">
                {index + 1}
              </span>
              <button
                type="button"
                aria-label={`Retirer la photo ${index + 1}`}
                className="absolute right-1 top-1 rounded-full bg-background/80 p-1 hover:bg-background"
                onClick={() => removePhoto(index)}
                disabled={isUploadingPhotos}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <Button variant="ghost" onClick={back} disabled={isUploadingPhotos}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <Button onClick={submitPhotos} disabled={isUploadingPhotos || state.photos.length === 0 || noCredit}>
          {isUploadingPhotos ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Préparation et envoi…
            </>
          ) : (
            `Lire ${state.photos.length > 1 ? `mes ${state.photos.length} photos` : 'ma photo'}`
          )}
        </Button>
      </div>
    </div>
  );
};
