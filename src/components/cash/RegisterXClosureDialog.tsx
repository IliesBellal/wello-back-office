import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CashRegisterHistoryRecord, closeRegisterX } from '@/services/cashRegisterHistoryService';
import { toast } from 'sonner';

interface RegisterXClosureDialogProps {
  register: CashRegisterHistoryRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const RegisterXClosureDialog = ({
  register,
  open,
  onOpenChange,
  onSuccess,
}: RegisterXClosureDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('verification');
  const [observedAmount, setObservedAmount] = useState('');
  const [adjustments, setAdjustments] = useState<Array<{ reason: string; amount: string }>>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [newZNumber, setNewZNumber] = useState('');

  if (!register) return null;

  const expectedAmount = register.total_revenue;
  const observed = parseFloat(observedAmount) * 100 || 0;
  const variance = observed - expectedAmount;
  const variancePercent = ((variance / expectedAmount) * 100).toFixed(2);

  const totalAdjustments = adjustments.reduce((sum, adj) => sum + (parseFloat(adj.amount) * 100 || 0), 0);
  const finalAmount = observed + totalAdjustments;
  const finalVariance = finalAmount - expectedAmount;

  const handleAddAdjustment = () => {
    setAdjustments([...adjustments, { reason: '', amount: '' }]);
  };

  const handleRemoveAdjustment = (index: number) => {
    setAdjustments(adjustments.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setObservedAmount('');
    setAdjustments([]);
    setShowSuccess(false);
    setNewZNumber('');
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!observedAmount) {
      toast.error('Veuillez entrer le montant observé');
      return;
    }

    setLoading(true);
    try {
      const result = await closeRegisterX({
        register_id: register.id,
        cash_drawer_amount: expectedAmount,
        observed_amount: observed,
        adjustments: adjustments
          .filter((adj) => adj.reason && adj.amount)
          .map((adj) => ({
            reason: adj.reason,
            amount: parseFloat(adj.amount) * 100,
          })),
      });

      setNewZNumber(result.z_register_number);
      setShowSuccess(true);
      toast.success('Registre X clôturé avec succès');
      onSuccess?.();
    } catch (error) {
      toast.error('Erreur lors de la clôture');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Clôture réussie
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Registre X :</span>
                    <span className="font-medium">{register.register_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nouveau registre Z :</span>
                    <span className="font-medium text-green-700">{newZNumber}</span>
                  </div>
                  <div className="flex justify-between border-t border-green-200 pt-2 mt-2">
                    <span className="text-muted-foreground">Variance finale :</span>
                    <span
                      className={`font-semibold ${
                        finalVariance === 0
                          ? 'text-green-700'
                          : Math.abs(finalVariance) < 1000
                            ? 'text-amber-700'
                            : 'text-red-700'
                      }`}
                    >
                      {finalVariance >= 0 ? '+' : ''}{(finalVariance / 100).toFixed(2)} €
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Fermer
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Clôture du Registre X</DialogTitle>
          <DialogDescription>{register.register_number}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="verification">Vérification</TabsTrigger>
            <TabsTrigger value="cash">Espèces</TabsTrigger>
            <TabsTrigger value="summary">Résumé</TabsTrigger>
          </TabsList>

          <TabsContent value="verification" className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">Informations du registre</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Type :</span>
                      <span className="font-medium">{register.type}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Transactions :</span>
                      <span className="font-medium">{register.transaction_count}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">CA attendu :</span>
                      <span className="font-medium">{(expectedAmount / 100).toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Moyens de paiement :</span>
                      <span className="font-medium">{Object.keys(register.payment_methods).length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cash" className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label className="text-base font-semibold">Montant observé dans le tiroir (€)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={observedAmount}
                    onChange={(e) => setObservedAmount(e.target.value)}
                    className="mt-2 text-lg"
                  />
                </div>

                {observedAmount && (
                  <Alert
                    className={`${
                      variance === 0
                        ? 'bg-green-50 border-green-200'
                        : Math.abs(variance) < 1000
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription
                      className={
                        variance === 0
                          ? 'text-green-700'
                          : Math.abs(variance) < 1000
                            ? 'text-amber-700'
                            : 'text-red-700'
                      }
                    >
                      Variance : {variance >= 0 ? '+' : ''}{(variance / 100).toFixed(2)} € ({variancePercent}%)
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <Label className="text-base font-semibold">Ajustements</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddAdjustment}
                    >
                      Ajouter
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {adjustments.map((adj, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          placeholder="Raison (ex: Pourboire)"
                          value={adj.reason}
                          onChange={(e) => {
                            const newAdj = [...adjustments];
                            newAdj[idx].reason = e.target.value;
                            setAdjustments(newAdj);
                          }}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="Montant (€)"
                          step="0.01"
                          value={adj.amount}
                          onChange={(e) => {
                            const newAdj = [...adjustments];
                            newAdj[idx].amount = e.target.value;
                            setAdjustments(newAdj);
                          }}
                          className="w-32"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAdjustment(idx)}
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">CA attendu :</span>
                    <span className="font-medium">{(expectedAmount / 100).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Montant observé :</span>
                    <span className="font-medium">{(observed / 100).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Total ajustements :</span>
                    <span className={cn("font-medium", totalAdjustments >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {totalAdjustments >= 0 ? '+' : ''}{(totalAdjustments / 100).toFixed(2)} €
                    </span>
                  </div>
                  <div
                    className={`flex justify-between pt-2 border-t-2 ${
                      finalVariance === 0 ? 'border-green-200' : 'border-amber-200'
                    }`}
                  >
                    <span className="font-semibold">Variance finale :</span>
                    <span
                      className={`font-bold text-lg ${
                        finalVariance === 0
                          ? 'text-green-700'
                          : Math.abs(finalVariance) < 1000
                            ? 'text-amber-700'
                            : 'text-red-700'
                      }`}
                    >
                      {finalVariance >= 0 ? '+' : ''}{(finalVariance / 100).toFixed(2)} €
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose()}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !observedAmount} className="bg-blue-600">
            {loading ? 'Clôture...' : 'Clôturer le registre'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
