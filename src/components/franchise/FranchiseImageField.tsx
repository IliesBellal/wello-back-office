import { useRef } from "react";
import { Loader2, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FranchiseImageFieldProps {
  label: string;
  url: string | null;
  isLogo?: boolean;
  uploading: boolean;
  onFile: (file: File) => void;
}

/** Même champ que les images ScanNOrder d'un établissement (bannière en 4:1). */
export function FranchiseImageField({ label, url, isLogo = false, uploading, onFile }: FranchiseImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const open = () => !uploading && inputRef.current?.click();

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") open();
        }}
        role="button"
        tabIndex={0}
        className={cn(
          "relative flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 transition-colors",
          uploading ? "cursor-wait" : "cursor-pointer hover:border-primary hover:bg-muted/50",
        )}
      >
        {url ? (
          <img
            src={url}
            alt={label}
            className={isLogo ? "h-20 w-20 rounded-lg object-contain" : "aspect-[4/1] w-full rounded-lg object-cover"}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Cliquez pour télécharger</p>
            <p className="text-xs text-muted-foreground">PNG, JPG ou WebP (max 5 Mo)</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
