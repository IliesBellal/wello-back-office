import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { Copy, Download, FileText, Lock, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  addCustomItem,
  CashRegisterSummary,
  deleteCustomItem,
  encloseCashRegister,
  getCashRegisterSummary,
  SummaryItem,
} from '@/services/cashRegisterService';
import { CashRegisterHistoryRecord, exportRegisterPDF } from '@/services/cashRegisterHistoryService';
import { CashRegisterTvaDetailsDialog } from '@/components/cash/CashRegisterTvaDetailsDialog';
import { cn } from '@/lib/utils';
import { getCashRegisterStatus } from '@/lib/cashRegisterStatus';

interface ClosureModalProps {
  register: CashRegisterHistoryRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Preset = { code: string; label: string; apiLabel: string };
type TheoreticalView = 'mop' | 'user';

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

const TheoreticalRow = ({
  item,
  onCopyToReal,
  copyDisabled,
}: {
  item: SummaryItem;
  onCopyToReal: (item: SummaryItem) => void;
  copyDisabled: boolean;
}) => (
  <div className="flex items-center justify-between rounded-md border border-blue-100 bg-blue-50/50 px-3 py-2">
    <div>
      <p className="text-sm font-medium">{item.label}</p>
      <p className="text-xs text-muted-foreground">{formatCurrency(item.amount)}</p>
    </div>
    {!copyDisabled && (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onCopyToReal(item)}
        aria-label="Copier vers réel"
        title="Copier la valeur théorique vers réel"
      >
        <Copy className="h-4 w-4 text-blue-600" />
      </Button>
    )}
  </div>
);

const RealItemRow = ({
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
  <div className="flex items-center justify-between rounded-md border border-orange-100 bg-orange-50/50 px-3 py-2">
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{formatCurrency(value)}</p>
    </div>
    {!disabled && (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(id)}
        disabled={deleting}
        aria-label="Supprimer"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    )}
  </div>
);

export const ClosureModal = ({ register, open, onOpenChange, onSuccess }: ClosureModalProps) => {
  const [summary, setSummary] = useState<CashRegisterSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theoreticalView, setTheoreticalView] = useState<TheoreticalView>('mop');
  const [tvaDialogOpen, setTvaDialogOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

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
  const isClosed = register ? getCashRegisterStatus(register) !== 'open' : false;

  const loadSummary = useCallback(async () => {
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
  }, [register]);

  useEffect(() => {
    if (!open || !register) return;
    setTheoreticalView('mop');
    loadSummary();
  }, [open, loadSummary, register]);

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

  const theoreticalTotal = useMemo(
    () => (summary?.items ?? []).reduce((acc, item) => acc + item.amount, 0),
    [summary?.items]
  );

  const realTotal = useMemo(
    () => (summary?.custom_items ?? []).reduce((acc, item) => acc + item.value, 0),
    [summary?.custom_items]
  );

  const sumAbsVariance = useMemo(() => realTotal - theoreticalTotal, [realTotal, theoreticalTotal]);

  const theoreticalFinalFund = useMemo(() => {
    if (!summary) return 0;
    if (typeof summary.final_cash_fund === 'number') return summary.final_cash_fund;
    return summary.cash_fund + theoreticalTotal;
  }, [summary, theoreticalTotal]);

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

  const handleCopyToReal = async (item: SummaryItem) => {
    if (!register || !summary) return;

    try {
      const created = await addCustomItem(register.id, {
        label: item.label,
        value: item.amount,
        mop_code: item.mop_code,
      });

      setSummary((prev) =>
        prev
          ? {
              ...prev,
              custom_items: [...prev.custom_items, { ...created, mop_code: created.mop_code ?? item.mop_code }],
            }
          : prev
      );
      toast.success('Valeur théorique copiée vers réel.');
    } catch (e) {
      toast.error('Impossible de copier cette valeur.');
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

  const handleExportPdf = async () => {
    if (!register) return;
    setExportingPdf(true);
    try {
      await exportRegisterPDF(register.id);
    } catch (e) {
      toast.error("Impossible d'exporter le PDF de ce registre.");
    } finally {
      setExportingPdf(false);
    }
  };

  const dialogTitle = isEnclosed
    ? `Registre de caisse #${register?.register_number || register?.id || ''}`
    : 'Clôture de caisse';

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
            <DialogTitle>{dialogTitle}</DialogTitle>
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
            <div className="space-y-4">
              {isEnclosed && (
                <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900">
                  <div className="flex items-center gap-2 font-semibold">
                    <Lock className="h-4 w-4" />
                    Registre clôturé
                  </div>
                  <p className="mt-1">
                    Clôturé par {register?.closed_by_name || '-'}
                  </p>
                  {summary.enclose_comment && (
                    <p className="mt-1 rounded bg-white/60 px-2 py-1">{summary.enclose_comment}</p>
                  )}
                </div>
              )}

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* --- THÉORIQUE --- */}
                <Card className="border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-blue-700">Théorique</CardTitle>
                    <p className="text-xs text-muted-foreground">Montants enregistrés sur le registre</p>
                    <div className="flex gap-1 rounded-md bg-blue-50 p-1 w-fit">
                      <button
                        type="button"
                        onClick={() => setTheoreticalView('mop')}
                        className={cn(
                          'rounded px-2 py-1 text-xs font-medium transition',
                          theoreticalView === 'mop' ? 'bg-white shadow-sm text-blue-700' : 'text-blue-700/60'
                        )}
                      >
                        Par mode de paiement
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheoreticalView('user')}
                        className={cn(
                          'rounded px-2 py-1 text-xs font-medium transition',
                          theoreticalView === 'user' ? 'bg-white shadow-sm text-blue-700' : 'text-blue-700/60'
                        )}
                      >
                        Par utilisateur
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {theoreticalView === 'mop' ? (
                      (summary.items ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucun montant théorique.</p>
                      ) : (
                        (summary.items ?? []).map((item) => (
                          <TheoreticalRow
                            key={item.mop_code}
                            item={item}
                            onCopyToReal={handleCopyToReal}
                            copyDisabled={isEnclosed}
                          />
                        ))
                      )
                    ) : (summary.users_summary ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Aucun détail de paiements par serveur disponible.
                      </p>
                    ) : (
                      (summary.users_summary ?? []).map((server) => {
                        const total = (server.items ?? []).reduce((acc, item) => acc + item.amount, 0);
                        return (
                          <details key={server.user_id} className="rounded-md border border-blue-100">
                            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                              {server.user_name || 'Serveur inconnu'} — {formatCurrency(total)}
                            </summary>
                            <div className="space-y-1 px-3 pb-2">
                              {(server.items ?? []).map((item) => (
                                <div
                                  key={`${server.user_id}-${item.mop_code}`}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-muted-foreground">{item.label}</span>
                                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                {/* --- RÉEL --- */}
                <Card className="border-orange-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base text-orange-700">Réel</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {isEnclosed
                            ? 'Lecture seule du montant déclaré'
                            : 'Ajoutez ou corrigez les valeurs observées'}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {summary.custom_items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun montant réel saisi.</p>
                    ) : (
                      summary.custom_items.map((item) => (
                        <RealItemRow
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
                    {!isEnclosed && (
                      <Button
                        variant="outline"
                        className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
                        onClick={() => setAddDialogOpen(true)}
                      >
                        + Nouvelle entrée
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total théorique</p>
                  <p className="text-lg font-semibold text-blue-700">{formatCurrency(theoreticalTotal)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Écart</p>
                  <p className={cn('text-lg font-semibold', sumAbsVariance === 0 ? 'text-green-600' : 'text-red-600')}>
                    {sumAbsVariance > 0 ? '+' : ''}
                    {formatCurrency(sumAbsVariance)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            {summary && (
              <Button variant="outline" onClick={() => setTvaDialogOpen(true)} className="gap-2">
                <FileText className="h-4 w-4" />
                Détail TVA
              </Button>
            )}
            {isEnclosed && (
              <Button variant="outline" onClick={handleExportPdf} disabled={exportingPdf} className="gap-2">
                <Download className="h-4 w-4" />
                {exportingPdf ? 'Export...' : 'Exporter PDF'}
              </Button>
            )}
            {!isEnclosed && (
              <Button
                onClick={startEncloseFlow}
                disabled={!summary || !isClosed || closing || loading}
              >
                Clôturer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle entrée réelle</DialogTitle>
            <DialogDescription>
              Sélectionnez un moyen de paiement puis saisissez le montant en euros.
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

      <CashRegisterTvaDetailsDialog
        registerId={register?.id ?? null}
        open={tvaDialogOpen}
        onOpenChange={setTvaDialogOpen}
      />
    </>
  );
};

export default ClosureModal;
