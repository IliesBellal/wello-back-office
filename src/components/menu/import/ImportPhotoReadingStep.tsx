import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, RotateCcw, XCircle } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { UseProductImport } from '@/hooks/useProductImport';

interface ImportPhotoReadingStepProps {
  wizard: UseProductImport;
}

/**
 * Porte photo, étape 2 : la lecture des photos par l'IA.
 *
 * La lecture tourne côté serveur ; cet écran l'interroge toutes les 2,5 s. On
 * peut le quitter : le brouillon se reprend depuis l'étape photo. Quand toutes
 * les photos sont lues, le hook passe seul à la vérification ; sinon on laisse
 * choisir entre relancer les photos en échec et continuer avec les autres.
 */
export const ImportPhotoReadingStep = ({ wizard }: ImportPhotoReadingStepProps) => {
  const { state, photoDraft, isRetryingPhotos, retryPhotos, reviewPhotoDraft, back } = wizard;

  if (!photoDraft) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement de la lecture…
      </div>
    );
  }

  const running = photoDraft.status === 'pending' || photoDraft.status === 'processing';
  const failedPhotos = photoDraft.photos.filter((photo) => photo.status === 'failed');
  const percent = photoDraft.photos_total
    ? Math.round((photoDraft.photos_done / photoDraft.photos_total) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {running
              ? 'Lecture de votre carte en cours…'
              : photoDraft.status === 'ready'
                ? 'Lecture terminée'
                : 'La lecture n’a pas abouti'}
          </span>
          <span className="tabular-nums text-muted-foreground">
            {photoDraft.photos_done}/{photoDraft.photos_total} photo(s) lue(s)
          </span>
        </div>
        <Progress value={percent} />
        {running && (
          <p className="text-sm text-muted-foreground">
            Comptez environ une minute par photo. Vous pouvez fermer cette fenêtre : la lecture
            continue, et vous la retrouverez en revenant sur « J’ai des photos de ma carte ».
          </p>
        )}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photoDraft.photos.map((photo) => (
          <li key={photo.photo} className="space-y-1">
            <div className="relative overflow-hidden rounded-md border">
              {photo.url ? (
                <img src={photo.url} alt={`Photo ${photo.photo}`} className="aspect-[3/4] w-full object-cover" />
              ) : (
                <div className="aspect-[3/4] w-full bg-muted" />
              )}
              <span className="absolute left-1 top-1 rounded bg-background/80 px-1.5 text-xs font-medium">
                {photo.photo}
              </span>
              <span className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5">
                {photo.status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                {photo.status === 'failed' && <XCircle className="h-4 w-4 text-destructive" />}
                {photo.status === 'pending' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </span>
            </div>
            {photo.error && <p className="text-xs text-destructive">{photo.error}</p>}
          </li>
        ))}
      </ul>

      {(photoDraft.error || state.error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error || photoDraft.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Button variant="ghost" onClick={back}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        {!running && (
          <div className="flex flex-wrap items-center gap-2">
            {failedPhotos.length > 0 && (
              <Button variant="outline" onClick={retryPhotos} disabled={isRetryingPhotos}>
                {isRetryingPhotos ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Relancer {failedPhotos.length > 1 ? `les ${failedPhotos.length} photos` : 'la photo'} en échec
              </Button>
            )}
            {photoDraft.status === 'ready' && photoDraft.preview && (
              <Button onClick={reviewPhotoDraft}>
                Vérifier avec {photoDraft.photos_done} photo(s) lue(s)
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
