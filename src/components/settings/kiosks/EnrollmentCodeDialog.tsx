import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Loader2, TriangleAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { qk } from '@/lib/queryKeys';
import { kioskService, KioskApiException } from '@/services/kioskService';
import type { EnrollmentCodeCreated } from '@/types/kiosks';

interface EnrollmentCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatExpiresIn = (expiresAt: string): string => {
  const minutes = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000));
  return minutes <= 1 ? 'Expire dans 1 minute' : `Expire dans ${minutes} minutes`;
};

export function EnrollmentCodeDialog({ open, onOpenChange }: EnrollmentCodeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<EnrollmentCodeCreated | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => kioskService.generateEnrollmentCode(),
    onSuccess: (data) => {
      setErrorMessage(null);
      setCreated(data);
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof KioskApiException ? error.message : "Impossible de générer le code d'enrôlement.",
      );
    },
  });

  useEffect(() => {
    if (open) {
      setCreated(null);
      setErrorMessage(null);
      mutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      queryClient.invalidateQueries({ queryKey: qk.kiosks.enrollmentCodes });
    }
    onOpenChange(next);
  };

  const handleCopy = () => {
    if (!created) return;
    navigator.clipboard.writeText(created.code);
    toast({ title: 'Copié !', description: 'Le code a été copié dans le presse-papiers.' });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Code d'enrôlement</DialogTitle>
          <DialogDescription>
            Saisissez ce code sur la borne pour l'associer à votre établissement.
          </DialogDescription>
        </DialogHeader>

        {mutation.isPending ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : errorMessage ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <TriangleAlert className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </div>
        ) : created ? (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 py-6 text-center">
              <p className="font-mono text-4xl font-bold tracking-widest">{created.code}</p>
            </div>

            <p className="text-sm text-muted-foreground text-center">{formatExpiresIn(created.expires_at)}</p>

            <Button type="button" variant="outline" className="w-full" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" />
              Copier le code
            </Button>

            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <TriangleAlert className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">Ce code ne sera affiché qu'une seule fois.</p>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
