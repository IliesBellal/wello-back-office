import { useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CUSTOMER_IMPORT_PROVIDERS, type CustomerImportProviderSlug } from '@/types/customerImport';

/**
 * Style des champs posés directement sur le fond gris de la modale d'import
 * (hors tableau) — même correctif que `menu/import/fieldStyles.ts`, gardé
 * indépendant pour ne pas dépendre du module produit.
 */
const IMPORT_FIELD_CLASS = 'bg-white';

interface CustomerImportProviderStepProps {
  provider: CustomerImportProviderSlug;
  file: File | null;
  error: string | null;
  isUploading: boolean;
  onProviderChange: (provider: CustomerImportProviderSlug) => void;
  onFileChange: (file: File | null) => void;
  onSubmit: () => void;
  onBack: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

/**
 * Vérifie que le fichier correspond à l'extension attendue par le provider
 * choisi — wello-generic veut du .xlsx, zelty du .csv. Un même bouton
 * « Analyser » pour les deux ne doit pas laisser passer l'un dans l'autre :
 * le parser xlsx échouerait sur un CSV avec un message générique, quand
 * l'erreur est ici évidente et évitable avant l'envoi.
 */
const matchesExpectedExtension = (file: File, extension: '.xlsx' | '.csv'): boolean => {
  const name = file.name.toLowerCase();
  if (extension === '.xlsx') {
    return (
      name.endsWith('.xlsx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  }
  return name.endsWith('.csv') || file.type === 'text/csv';
};

/**
 * Deuxième étape : d'où vient le fichier, et lequel.
 *
 * Même patron que `ImportProviderStep` côté produit : dépôt sur toute la
 * surface de l'étape, choix du logiciel avec une valeur par défaut. La seule
 * différence est la validation d'extension, qui dépend ici du provider
 * choisi (.xlsx pour le modèle Wello, .csv pour Zelty) plutôt que d'un
 * format unique.
 */
export const CustomerImportProviderStep = ({
  provider,
  file,
  error,
  isUploading,
  onProviderChange,
  onFileChange,
  onSubmit,
  onBack,
}: CustomerImportProviderStepProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  // Un survol d'enfant déclenche dragleave sur le parent : on compte les
  // entrées et sorties plutôt que de basculer un booléen à chaque événement.
  const dragDepth = useRef(0);

  const selected = CUSTOMER_IMPORT_PROVIDERS.find((option) => option.slug === provider);

  const acceptFile = (candidate: File | undefined) => {
    if (!candidate) return;

    if (selected && !matchesExpectedExtension(candidate, selected.extension)) {
      setDropError(
        `« ${candidate.name} » n’est pas un fichier ${selected.extension} — attendu pour « ${selected.label} ».`,
      );
      return;
    }

    setDropError(null);
    onFileChange(candidate);
  };

  const acceptedTypes =
    selected?.extension === '.csv'
      ? '.csv,text/csv'
      : '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        if (isUploading) return;
        dragDepth.current += 1;
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        // Sans ça le navigateur ouvre le fichier au lieu de nous le passer.
        event.preventDefault();
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setIsDragging(false);
        if (isUploading) return;
        acceptFile(event.dataTransfer.files?.[0]);
      }}
      className={cn(
        'relative mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-lg transition-colors',
        isDragging && 'ring-2 ring-primary ring-offset-4',
      )}
    >
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-primary/5 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2 rounded-lg bg-card px-6 py-4 shadow-lg">
            <Upload className="h-6 w-6 text-primary" />
            <p className="text-sm font-medium">Déposez votre fichier ici</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="customer-import-provider">D’où vient ce fichier ?</Label>
        <Select
          value={provider}
          onValueChange={(value) => onProviderChange(value as CustomerImportProviderSlug)}
          disabled={isUploading}
        >
          <SelectTrigger id="customer-import-provider" className={IMPORT_FIELD_CLASS}>
            <SelectValue placeholder="Choisir un logiciel" />
          </SelectTrigger>
          <SelectContent>
            {CUSTOMER_IMPORT_PROVIDERS.map((option) => (
              <SelectItem key={option.slug} value={option.slug}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected && <p className="text-sm text-muted-foreground">{selected.description}</p>}
      </div>

      <div className="space-y-2">
        <Label>Fichier à importer</Label>

        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes}
          className="hidden"
          onChange={(event) => {
            setDropError(null);
            acceptFile(event.target.files?.[0] ?? undefined);
            // Permet de re-sélectionner le même fichier après une correction.
            event.target.value = '';
          }}
        />

        {file ? (
          <div className="flex items-center gap-3 rounded-md border border-border bg-card p-4">
            <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Retirer le fichier"
              onClick={() => onFileChange(null)}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              'flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-border bg-card p-8 text-center transition-colors hover:border-primary hover:bg-muted/40 disabled:opacity-50',
              isDragging && 'border-primary',
            )}
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">
              Glissez votre fichier ici, ou cliquez pour le choisir
            </span>
            <span className="text-xs text-muted-foreground">
              Format {selected?.extension ?? '.xlsx'}, 10 Mo maximum
            </span>
          </button>
        )}
      </div>

      {(dropError || error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{dropError ?? error}</AlertDescription>
        </Alert>
      )}

      <p className="text-sm text-muted-foreground">
        Rien n’est enregistré à cette étape : vous verrez d’abord le détail de ce qui sera créé.
      </p>

      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onBack} disabled={isUploading}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <Button onClick={onSubmit} disabled={!file || isUploading}>
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyse du fichier…
            </>
          ) : (
            'Analyser le fichier'
          )}
        </Button>
      </div>
    </div>
  );
};
