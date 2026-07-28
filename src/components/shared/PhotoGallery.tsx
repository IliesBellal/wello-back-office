import { useMemo, useState } from 'react';
import { Camera } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface PhotoGalleryPhoto {
  id?: string;
  url?: string;
  photo_url?: string;
  alt?: string | null;
  label?: string | null;
  caption?: string | null;
}

interface PhotoGalleryProps {
  photos: PhotoGalleryPhoto[];
  emptyLabel?: string;
  className?: string;
}

const normalizePhotoUrl = (photo: PhotoGalleryPhoto): string => photo.url ?? photo.photo_url ?? '';

export function PhotoGallery({ photos, emptyLabel = 'Aucune photo disponible', className }: PhotoGalleryProps) {
  const normalizedPhotos = useMemo(
    () =>
      photos
        .map((photo, index) => ({ ...photo, url: normalizePhotoUrl(photo), index }))
        .filter((photo) => photo.url),
    [photos]
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (normalizedPhotos.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500',
          className
        )}
      >
        <Camera className="mr-2 h-4 w-4" />
        <span>{emptyLabel}</span>
      </div>
    );
  }

  const activePhoto = activeIndex !== null ? normalizedPhotos[activeIndex] : null;

  return (
    <>
      <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3', className)}>
        {normalizedPhotos.map((photo, index) => {
          const label = photo.label || photo.alt || `Photo ${index + 1}`;
          return (
            <button
              key={photo.id ?? `${photo.url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="group overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
            >
              <div className="relative aspect-square w-full bg-slate-100">
                <img
                  src={photo.url}
                  alt={label}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    const target = event.currentTarget;
                    target.style.display = 'none';
                    const sibling = target.nextElementSibling as HTMLElement | null;
                    if (sibling) sibling.style.display = 'flex';
                  }}
                />
                <div className="hidden h-full w-full items-center justify-center gap-2 text-xs text-slate-500">
                  <Camera className="h-4 w-4" />
                  <span>Image indisponible</span>
                </div>
              </div>
              {(photo.caption || photo.label) && (
                <div className="space-y-1 px-2 py-2">
                  <p className="line-clamp-1 text-xs font-medium text-slate-900">{photo.label}</p>
                  {photo.caption && <p className="line-clamp-2 text-xs text-slate-500">{photo.caption}</p>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <Dialog open={activePhoto !== null} onOpenChange={(open) => !open && setActiveIndex(null)}>
        <DialogContent className="max-w-4xl overflow-hidden border-black bg-black p-0">
          {activePhoto && (
            <img
              src={activePhoto.url}
              alt={activePhoto.label || activePhoto.alt || 'Aperçu photo'}
              className="max-h-[85vh] w-full bg-black object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PhotoGallery;
