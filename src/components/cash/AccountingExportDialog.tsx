import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AccountingExportOptions,
  AccountingExportRecord,
  AccountingExportRefusedError,
  financialReportsService,
} from '@/services/financialReportsService';

interface AccountingExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange: { from: Date; to: Date };
}

// Libellés des canaux (orders.order_source) pour la liste des exports
// archivés ; les canaux proposés au filtre viennent de l'API.
const CHANNEL_LABELS: Record<string, string> = {
  WELLO_RESTO_POS: 'Caisse',
  KIOSK: 'Borne de commande',
  SCANNORDER: 'ScanNOrder',
  UBER_EATS: 'Uber Eats',
  DELIVEROO: 'Deliveroo',
};

const formatDay = (value: Date | string) => {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return format(date, 'dd/MM/yyyy', { locale: fr });
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
};

/**
 * Export comptable (PDF) de la période. En clôture automatique, les canaux de
 * commande sont filtrables (tous cochés par défaut) ; en clôture manuelle,
 * l'export est le rapport standard, non configurable. Chaque export est archivé
 * côté API et retéléchargeable depuis la liste (nouveau lien d'une heure).
 */
export const AccountingExportDialog = ({ open, onOpenChange, dateRange }: AccountingExportDialogProps) => {
  const [options, setOptions] = useState<AccountingExportOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [exports, setExports] = useState<AccountingExportRecord[]>([]);
  const [exportsLoading, setExportsLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const isAutoClosing = options?.closing_mode === 'AUTO';
  const availableChannels = useMemo(() => options?.channels ?? [], [options]);

  const loadExports = useCallback(async () => {
    setExportsLoading(true);
    try {
      setExports(await financialReportsService.listAccountingExports());
    } catch {
      setExports([]);
    } finally {
      setExportsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setOptionsLoading(true);
    financialReportsService
      .getAccountingExportOptions(dateRange.from)
      .then((result) => {
        if (cancelled) return;
        setOptions(result);
        setSelectedChannels(new Set(result.channels.map((channel) => channel.value)));
      })
      .catch(() => {
        if (!cancelled) setOptions(null);
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    loadExports();
    return () => {
      cancelled = true;
    };
  }, [open, dateRange.from, loadExports]);

  const toggleChannel = (value: string, checked: boolean) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (checked) next.add(value);
      else next.delete(value);
      return next;
    });
  };

  const handleGenerate = async () => {
    // Tous les canaux cochés = aucun filtre (y compris les rares commandes
    // sans canal connu) : on n'envoie alors pas la liste.
    const channels =
      isAutoClosing && selectedChannels.size < availableChannels.length
        ? availableChannels.map((channel) => channel.value).filter((value) => selectedChannels.has(value))
        : undefined;

    setGenerating(true);
    try {
      const result = await financialReportsService.exportGlobal(dateRange.from, dateRange.to, channels);
      window.open(result.download_url, '_blank');
      toast.success('Export comptable généré.');
      loadExports();
    } catch (error) {
      if (error instanceof AccountingExportRefusedError) {
        toast.error(error.message);
      } else {
        toast.error("Impossible de générer l'export comptable.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (record: AccountingExportRecord) => {
    setDownloadingId(record.id);
    try {
      const link = await financialReportsService.getAccountingExportLink(record.id);
      window.open(link.download_url, '_blank');
    } catch {
      toast.error("Impossible de télécharger cet export.");
    } finally {
      setDownloadingId(null);
    }
  };

  const canGenerate = !optionsLoading && !generating && (!isAutoClosing || selectedChannels.size > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export comptable</DialogTitle>
          <DialogDescription>
            Période du {formatDay(dateRange.from)} au {formatDay(dateRange.to)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {optionsLoading ? (
            <div className="h-20 rounded-md bg-muted animate-pulse" />
          ) : options === null ? (
            <p className="text-sm text-destructive">Impossible de charger les options d'export.</p>
          ) : isAutoClosing ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold">Canaux de commande</p>
                <p className="text-xs text-muted-foreground">
                  Clôture automatique : choisissez les canaux à inclure. La TVA est ventilée à partir des
                  encaissements de ces commandes.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableChannels.map((channel) => (
                  <div
                    key={channel.value}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <Checkbox
                      id={`export-channel-${channel.value}`}
                      checked={selectedChannels.has(channel.value)}
                      onCheckedChange={(checked) => toggleChannel(channel.value, checked === true)}
                    />
                    <Label htmlFor={`export-channel-${channel.value}`} className="cursor-pointer">
                      {channel.label}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedChannels.size === 0 && (
                <p className="text-xs text-destructive">Sélectionnez au moins un canal.</p>
              )}
            </div>
          ) : (
            <p className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
              Clôture manuelle : l'export reprend la TVA des ventes et les encaissements déclarés lors des
              clôtures de caisse. Il n'est pas filtrable par canal.
            </p>
          )}

          <div className="space-y-2">
            <p className="text-sm font-semibold">Exports générés</p>
            {exportsLoading ? (
              <div className="h-16 rounded-md bg-muted animate-pulse" />
            ) : exports.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun export généré pour le moment.</p>
            ) : (
              <div className="divide-y divide-border rounded-md border border-border">
                {exports.map((record) => (
                  <div key={record.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {formatDay(record.period_from)} → {formatDay(record.period_to)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Généré le {formatDateTime(record.generated_at)} ·{' '}
                        {record.closing_mode === 'AUTO' ? 'Clôture automatique' : 'Clôture manuelle'}
                        {record.closing_mode === 'AUTO' &&
                          ` · ${
                            record.channels.length === 0
                              ? 'Tous les canaux'
                              : record.channels.map((value) => CHANNEL_LABELS[value] ?? value).join(', ')
                          }`}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 shrink-0"
                      onClick={() => handleDownload(record)}
                      disabled={downloadingId === record.id}
                    >
                      <Download className="h-4 w-4" />
                      {downloadingId === record.id ? '...' : 'Télécharger'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button onClick={handleGenerate} disabled={!canGenerate} className="gap-2">
            <FileText className="h-4 w-4" />
            {generating ? 'Génération...' : "Générer l'export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AccountingExportDialog;
