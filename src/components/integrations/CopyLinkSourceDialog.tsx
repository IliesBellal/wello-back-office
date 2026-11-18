import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SOURCE_NONE, SOURCE_OTHER, SOURCE_PRESETS, normalizeSource, withSource } from '@/lib/sourceLink';

interface CopyLinkSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  onCopy: (link: string) => void;
}

/** Choix de la source ajoutée au lien copié, pour savoir d'où viennent les clients. */
export function CopyLinkSourceDialog({ open, onOpenChange, url, onCopy }: CopyLinkSourceDialogProps) {
  const [choice, setChoice] = useState(SOURCE_NONE);
  const [custom, setCustom] = useState('');

  useEffect(() => {
    if (open) {
      setChoice(SOURCE_NONE);
      setCustom('');
    }
  }, [open]);

  const source = choice === SOURCE_NONE ? '' : choice === SOURCE_OTHER ? normalizeSource(custom) : choice;
  const link = withSource(url, source);
  const canCopy = choice !== SOURCE_OTHER || source !== '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copier le lien</DialogTitle>
          <DialogDescription>
            Repérez d'où viennent vos clients : la source apparaît dans les{' '}
            <a
              href="/dashboard/analysis?tab=scannorder"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
            >
              statistiques
              <ExternalLink className="h-3 w-3" aria-label="s'ouvre dans un nouvel onglet" />
            </a>
            .
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={choice} onValueChange={setChoice} className="grid grid-cols-2 gap-2">
          {SOURCE_PRESETS.map((preset) => (
            <Label
              key={preset.id}
              htmlFor={`src-${preset.id}`}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 font-normal hover:bg-muted/50"
            >
              <RadioGroupItem id={`src-${preset.id}`} value={preset.id} />
              {preset.label}
            </Label>
          ))}
        </RadioGroup>

        {choice === SOURCE_OTHER && (
          <Input
            autoFocus
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Ex. marché de Noël"
            maxLength={40}
          />
        )}

        <code className="block break-all rounded bg-muted px-3 py-2 text-xs">{link}</code>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={!canCopy}
            onClick={() => {
              onCopy(link);
              onOpenChange(false);
            }}
          >
            Copier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
