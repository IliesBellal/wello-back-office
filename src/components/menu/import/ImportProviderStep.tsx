import { useRef } from 'react';
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
import { IMPORT_PROVIDERS, type ImportProviderSlug } from '@/types/import';

interface ImportProviderStepProps {
  provider: ImportProviderSlug;
  file: File | null;
  error: string | null;
  isUploading: boolean;
  onProviderChange: (provider: ImportProviderSlug) => void;
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
 * Deuxième étape : d'où vient le fichier, et lequel.
 *
 * Le champ fichier est un `<input type="file">` masqué piloté par un bouton —
 * le design system n'a pas de dropzone, et c'est le patron déjà utilisé pour
 * les images de produits et de catégories.
 */
export const ImportProviderStep = ({
  provider,
  file,
  error,
  isUploading,
  onProviderChange,
  onFileChange,
  onSubmit,
  onBack,
}: ImportProviderStepProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = IMPORT_PROVIDERS.find((option) => option.slug === provider);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="space-y-2">
        <Label htmlFor="import-provider">D’où vient ce fichier ?</Label>
        <Select
          value={provider}
          onValueChange={(value) => onProviderChange(value as ImportProviderSlug)}
          disabled={isUploading}
        >
          <SelectTrigger id="import-provider">
            <SelectValue placeholder="Choisir un logiciel" />
          </SelectTrigger>
          <SelectContent>
            {IMPORT_PROVIDERS.map((option) => (
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
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(event) => {
            onFileChange(event.target.files?.[0] ?? null);
            // Permet de re-sélectionner le même fichier après une correction.
            event.target.value = '';
          }}
        />

        {file ? (
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 p-4">
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
            className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-border p-8 text-center transition-colors hover:border-primary hover:bg-muted/40 disabled:opacity-50"
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">Choisir un fichier Excel</span>
            <span className="text-xs text-muted-foreground">Format .xlsx, 5 Mo maximum</span>
          </button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
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
