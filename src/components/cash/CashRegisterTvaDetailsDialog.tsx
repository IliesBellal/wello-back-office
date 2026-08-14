import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  CashRegisterTvaBreakdown,
  getCashRegisterTvaBreakdown,
} from '@/services/cashRegisterService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CashRegisterTvaDetailsDialogProps {
  registerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCurrency = (cents: number) => `${(cents / 100).toFixed(2)} €`;

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, 'dd MMMM yyyy HH:mm', { locale: fr });
};

export const CashRegisterTvaDetailsDialog = ({
  registerId,
  open,
  onOpenChange,
}: CashRegisterTvaDetailsDialogProps) => {
  const [breakdown, setBreakdown] = useState<CashRegisterTvaBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!registerId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getCashRegisterTvaBreakdown(registerId);
      setBreakdown(data);
    } catch (e) {
      setError('Impossible de charger le détail TVA.');
    } finally {
      setLoading(false);
    }
  }, [registerId]);

  useEffect(() => {
    if (!open || !registerId) return;
    load();
  }, [open, registerId, load]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détail TVA</DialogTitle>
          <DialogDescription>
            {breakdown ? `Registre #${breakdown.cash_report_id}` : registerId}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-6">
            <div className="h-16 rounded-md bg-muted animate-pulse" />
            <div className="h-16 rounded-md bg-muted animate-pulse" />
          </div>
        ) : error ? (
          <div className="space-y-3 py-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={load}>
              Réessayer
            </Button>
          </div>
        ) : breakdown ? (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/20 p-3 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Période : </span>
                {formatDate(breakdown.period_from)} → {formatDate(breakdown.period_to)}
              </p>
              <p>
                <span className="text-muted-foreground">Rapport : </span>
                {breakdown.cash_report_type} (#{breakdown.cash_report_id})
              </p>
              <p>
                <span className="text-muted-foreground">Fond de caisse : </span>
                {formatCurrency(breakdown.cash_fund)}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">HT</p>
                <p className="text-lg font-semibold">{formatCurrency(breakdown.HT)}</p>
              </div>
              <div className="rounded-md border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">TVA</p>
                <p className="text-lg font-semibold">{formatCurrency(breakdown.TVA)}</p>
              </div>
              <div className="rounded-md border-2 border-primary bg-primary/5 p-3 text-center">
                <p className="text-xs text-muted-foreground">TTC</p>
                <p className="text-lg font-semibold text-primary">{formatCurrency(breakdown.TTC)}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Détail par mode</h4>
              {breakdown.cash_report.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune donnée TVA sur ce registre.</p>
              ) : (
                <Accordion type="multiple" defaultValue={breakdown.cash_report.map((g) => g.delivery_type_id)}>
                  {breakdown.cash_report.map((group) => (
                    <AccordionItem key={group.delivery_type_id} value={group.delivery_type_id}>
                      <AccordionTrigger>{group.delivery_type_label || group.delivery_type_id}</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-4 gap-2 border-b border-border pb-2 text-xs font-medium text-muted-foreground">
                          <span>Catégorie TVA</span>
                          <span className="text-right">HT</span>
                          <span className="text-right">TVA</span>
                          <span className="text-right">TTC</span>
                        </div>
                        {group.tva_categories.map((cat, index) => {
                          const isZero = cat.HT === 0 && cat.TTC === 0 && cat.TVA === 0;
                          return (
                            <div
                              key={`${cat.tva_title}-${index}`}
                              className={cn(
                                'grid grid-cols-4 gap-2 py-2 text-sm',
                                isZero && 'text-muted-foreground/50'
                              )}
                            >
                              <span>{cat.tva_title} ({cat.tva_rate}%)</span>
                              <span className="text-right">{formatCurrency(cat.HT)}</span>
                              <span className="text-right">{formatCurrency(cat.TVA)}</span>
                              <span className="text-right">{formatCurrency(cat.TTC)}</span>
                            </div>
                          );
                        })}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CashRegisterTvaDetailsDialog;
