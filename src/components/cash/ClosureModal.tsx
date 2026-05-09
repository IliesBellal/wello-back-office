import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  addCustomItem,
  CashRegisterSummary,
  deleteCustomItem,
  encloseCashRegister,
  getCashRegisterSummary,
  SummaryItem,
} from '@/services/cashRegisterService';
import { CashRegisterHistoryRecord } from '@/services/cashRegisterHistoryService';
import { cn } from '@/lib/utils';

interface ClosureModalProps {
  register: CashRegisterHistoryRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Preset = { code: string; label: string; apiLabel: string };

const PRESETS: Preset[] = [
  { code: 'CB', label: 'Carte Bancaire', apiLabel: 'CB' },
  { code: 'CASH', label: 'Espèces', apiLabel: 'ES' },
  { code: 'TR', label: 'Ticket Resto', apiLabel: 'TR' },
  { code: 'CHEQUE', label: 'Chèque', apiLabel: 'CHEQUE' },
  { code: 'OTHER', label: 'Autre', apiLabel: '' },
];

const formatCurrency = (cents: number) => `${(cents / 100).toFixed(2)} €`;

const parseEuroToCents = (value: string): number => {
  const normalized = value.replace(',', '.').trim();
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
};

const PaymentSummaryRow = ({
  item,
  realAmount,
}: {
  item: SummaryItem;
  realAmount: number;
}) => {
  const variance = realAmount - item.amount;
  return (
    <div className="grid grid-cols-4 items-center gap-2 py-2 text-sm">
      <span className="font-medium">{item.label}</span>
      <span className="text-right text-muted-foreground">{formatCurrency(item.amount)}</span>
      <span className="text-right">{formatCurrency(realAmount)}</span>
      <span
        className={cn(
          'text-right font-semibold',
          variance === 0 ? 'text-green-600' : variance > 0 ? 'text-blue-600' : 'text-red-600'
        )}
      >
        {variance > 0 ? '+' : ''}{formatCurrency(variance)}
      </span>
    </div>
  );
};

const CustomItemRow = ({
  id,
  label,
  value,
  deleting,
  onDelete,
  disabled,
}: {
  id: string;
  label: string;
  value: number;
  deleting: boolean;
  onDelete: (id: string) => void;
  disabled: boolean;
}) => (
  <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{formatCurrency(value)}</p>
    </div>
    <Button
      variant="ghost"
      size="icon"
      onClick={() => onDelete(id)}
      disabled={disabled || deleting}
      aria-label="Supprimer"
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  </div>
);

export const ClosureModal = ({ register, open, onOpenChange, onSuccess }: ClosureModalProps) => {
  const [summary, setSummary] = useState<CashRegisterSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('recap');

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('CB');
  const [customLabel, setCustomLabel] = useState('');
  const [amountEuro, setAmountEuro] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [deletingItemIds, setDeletingItemIds] = useState<Set<string>>(new Set());

  const [warningOpen, setWarningOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [comment, setComment] = useState('');

  const isEnclosed = Boolean(summary?.enclosed);

  const loadSummary = async () => {
    if (!register) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getCashRegisterSummary(register.id);
      setSummary(data);
    } catch (e) {
      setError('Impossible de charger le récapitulatif de clôture.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !register) return;
    loadSummary();
  }, [open, register?.id]);

  const theoreticalByMop = useMemo(() => {
    const result = new Map<string, number>();
    (summary?.items ?? []).forEach((item) => {
      result.set(item.mop_code, (result.get(item.mop_code) ?? 0) + item.amount);
    });
    return result;
  }, [summary?.items]);

  const realByMop = useMemo(() => {
    const result = new Map<string, number>();
    (summary?.custom_items ?? []).forEach((item) => {
      const code = item.mop_code ?? 'OTHER';
      result.set(code, (result.get(code) ?? 0) + item.value);
    });
    return result;
  }, [summary?.custom_items]);

  const unmatchedRealAmount = useMemo(() => {
    let total = 0;
    (summary?.custom_items ?? []).forEach((item) => {
      const code = item.mop_code ?? 'OTHER';
      if (!theoreticalByMop.has(code)) {
        total += item.value;
      }
    });
    return total;
  }, [summary?.custom_items, theoreticalByMop]);

  const sumAbsVariance = useMemo(() => {
    const allCodes = new Set<string>([
      ...Array.from(theoreticalByMop.keys()),
      ...Array.from(realByMop.keys()),
    ]);

    let total = 0;
    allCodes.forEach((code) => {
      const theoretical = theoreticalByMop.get(code) ?? 0;
      const real = realByMop.get(code) ?? 0;
      total += (real - theoretical);
    });

    return total;
  }, [realByMop, theoreticalByMop]);

  const theoreticalFinalFund = useMemo(() => {
    if (!summary) return 0;
    if (typeof summary.final_cash_fund === 'number') return summary.final_cash_fund;
    const theoreticalTotal = (summary.items ?? []).reduce((acc, item) => acc + item.amount, 0);
    return summary.cash_fund + theoreticalTotal;
  }, [summary]);

  const handleAddCustomItem = async () => {
    if (!register || !summary) return;

    const valueInCents = parseEuroToCents(amountEuro);
    const selected = PRESETS.find((preset) => preset.code === selectedPreset);
    const isOther = selectedPreset === 'OTHER';
    const label = isOther ? customLabel.trim() : selected?.apiLabel ?? '';
    const mopCode = isOther ? undefined : selectedPreset;

    if (!label) {
      toast.error('Veuillez renseigner un libellé.');
      return;
    }
    if (valueInCents <= 0) {
      toast.error('Veuillez renseigner un montant valide.');
      return;
    }

    setAddingItem(true);
    try {
      const created = await addCustomItem(register.id, {
        label,
        value: valueInCents,
        mop_code: mopCode,
      });

      setSummary((prev) =>
        prev
          ? {
              ...prev,
              custom_items: [...prev.custom_items, { ...created, mop_code: created.mop_code ?? mopCode }],
            }
          : prev
      );

      setAmountEuro('');
      setCustomLabel('');
      setSelectedPreset('CB');
      setAddDialogOpen(false);
      toast.success('Montant réel ajouté.');
    } catch (e) {
      toast.error("Impossible d'ajouter le montant réel.");
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteCustomItem = async (itemId: string) => {
    if (!register) return;

    setDeletingItemIds((prev) => new Set(prev).add(itemId));
    try {
      await deleteCustomItem(register.id, itemId);
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              custom_items: prev.custom_items.filter((item) => item.id !== itemId),
            }
          : prev
      );
      toast.success('Montant supprimé.');
    } catch (e) {
      toast.error('Suppression impossible.');
    } finally {
      setDeletingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const startEncloseFlow = () => {
    if (Math.abs(sumAbsVariance) > 500) {
      setWarningOpen(true);
      return;
    }
    setCommentDialogOpen(true);
  };

  const handleEnclose = async () => {
    if (!register || !summary) return;

    setClosing(true);
    try {
      await encloseCashRegister(register.id, { comment: comment.trim() });
      setSummary({
        ...summary,
        enclosed: true,
        enclose_comment: comment.trim() || undefined,
      });
      setCommentDialogOpen(false);
      toast.success('Clôture validée.');
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      toast.error('Erreur lors de la clôture finale.');
    } finally {
      setClosing(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setComment('');
            setWarningOpen(false);
            setCommentDialogOpen(false);
            setAddDialogOpen(false);
          }
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Clôture de caisse</DialogTitle>
            <DialogDescription>
              {register?.register_number || register?.id}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="space-y-3 py-6">
              <div className="h-16 rounded-md bg-muted animate-pulse" />
              <div className="h-16 rounded-md bg-muted animate-pulse" />
              <div className="h-16 rounded-md bg-muted animate-pulse" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="py-6 space-y-3">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" onClick={loadSummary}>
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          ) : summary ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="recap">Récapitulatif</TabsTrigger>
                <TabsTrigger value="servers">Détails par Serveur</TabsTrigger>
              </TabsList>

              <TabsContent value="recap" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Fond de caisse</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-md border border-border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Initial</p>
                      <p className="text-lg font-semibold">{formatCurrency(summary.cash_fund)}</p>
                    </div>
                    <div className="rounded-md border border-border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Final théorique</p>
                      <p className="text-lg font-semibold">{formatCurrency(theoreticalFinalFund)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base">Comparaison par mode de paiement</CardTitle>
                      {!isEnclosed && (
                        <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
                          Ajouter un montant réel
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-2 border-b border-border pb-2 text-xs font-medium text-muted-foreground">
                      <span>Moyen</span>
                      <span className="text-right">Théorique</span>
                      <span className="text-right">Réel</span>
                      <span className="text-right">Écart</span>
                    </div>

                    {(summary.items ?? []).map((item) => (
                      <PaymentSummaryRow
                        key={item.mop_code}
                        item={item}
                        realAmount={realByMop.get(item.mop_code) ?? 0}
                      />
                    ))}

                    {unmatchedRealAmount > 0 && (
                      <PaymentSummaryRow
                        key="OTHER"
                        item={{ mop_code: 'OTHER', label: 'Autre', amount: 0 }}
                        realAmount={unmatchedRealAmount}
                      />
                    )}

                    <div className="mt-3 border-t border-border pt-3 flex items-center justify-between text-sm">
                      <span className="font-semibold">Écart total</span>
                      <Badge variant={Math.abs(sumAbsVariance) > 500 ? 'destructive' : Math.abs(sumAbsVariance) > 0 ? 'warning' : 'positive'}>
                        {formatCurrency(sumAbsVariance)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Montants réels saisis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {summary.custom_items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun montant réel saisi.</p>
                    ) : (
                      summary.custom_items.map((item) => (
                        <CustomItemRow
                          key={item.id}
                          id={item.id}
                          label={item.label}
                          value={item.value}
                          deleting={deletingItemIds.has(item.id)}
                          onDelete={handleDeleteCustomItem}
                          disabled={isEnclosed}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="servers" className="space-y-4">
                {summary.users_summary && summary.users_summary.length > 0 ? (
                  summary.users_summary.map((server) => {
                    const total = (server.items ?? []).reduce((acc, item) => acc + item.amount, 0);
                    return (
                      <Card key={server.user_id}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">
                            {(server.user_name || 'Serveur inconnu')} ({server.user_id})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {(server.items ?? []).map((item) => (
                            <div key={`${server.user_id}-${item.mop_code}`} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{item.label}</span>
                              <span className="font-medium">{formatCurrency(item.amount)}</span>
                            </div>
                          ))}
                          <div className="border-t border-border pt-2 mt-2 flex items-center justify-between text-sm font-semibold">
                            <span>Total</span>
                            <span>{formatCurrency(total)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card>
                    <CardContent className="py-6">
                      <p className="text-sm text-muted-foreground">
                        Aucun détail de paiements par serveur disponible pour ce registre.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <Button
              onClick={startEncloseFlow}
              disabled={!summary || isEnclosed || closing || loading}
            >
              {isEnclosed ? 'Déjà clôturé' : 'Clôturer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un montant réel</DialogTitle>
            <DialogDescription>
              Sélectionnez un preset puis saisissez le montant en euros.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.code}
                  type="button"
                  variant={selectedPreset === preset.code ? 'default' : 'outline'}
                  onClick={() => setSelectedPreset(preset.code)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {selectedPreset === 'OTHER' && (
              <div className="space-y-2">
                <Label htmlFor="custom-label">Libellé</Label>
                <Input
                  id="custom-label"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="Ex: Bon cadeau"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="custom-amount">Montant (EUR)</Label>
              <Input
                id="custom-amount"
                type="number"
                step="0.01"
                value={amountEuro}
                onChange={(e) => setAmountEuro(e.target.value)}
                placeholder="Ex: 10.50"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddCustomItem} disabled={addingItem}>
              {addingItem ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={warningOpen}
        onOpenChange={setWarningOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Écart important détecté
            </AlertDialogTitle>
            <AlertDialogDescription>
              L'écart total est de {formatCurrency(sumAbsVariance)}.
              Voulez-vous continuer la clôture ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setWarningOpen(false);
                setCommentDialogOpen(true);
              }}
            >
              Continuer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Commentaire de clôture</DialogTitle>
            <DialogDescription>
              Le commentaire est optionnel et sera envoyé avec l'enclosure.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="closure-comment">Commentaire</Label>
            <Textarea
              id="closure-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ajouter un commentaire si nécessaire..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCommentDialogOpen(false)}>
              Retour
            </Button>
            <Button onClick={handleEnclose} disabled={closing}>
              {closing ? 'Clôture...' : 'Confirmer la clôture'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClosureModal;
