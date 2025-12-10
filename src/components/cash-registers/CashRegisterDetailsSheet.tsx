import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check, Printer, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  CashRegister,
  CashRegisterSummary,
  TvaDetails,
  getCashRegisterSummary,
  getCashRegisterTvaDetails,
  addCustomItem,
  deleteCustomItem,
  encloseCashRegister,
} from "@/services/cashRegisterService";

interface CashRegisterDetailsSheetProps {
  register: CashRegister | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
};

const CashRegisterDetailsSheet = ({
  register,
  open,
  onOpenChange,
  onRefresh,
}: CashRegisterDetailsSheetProps) => {
  const [summary, setSummary] = useState<CashRegisterSummary | null>(null);
  const [tvaDetails, setTvaDetails] = useState<TvaDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemValue, setNewItemValue] = useState("");
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [enclosing, setEnclosing] = useState(false);

  useEffect(() => {
    if (open && register) {
      loadData();
    }
  }, [open, register]);

  const loadData = async () => {
    if (!register) return;
    setLoading(true);
    try {
      const [summaryData, tvaData] = await Promise.all([
        getCashRegisterSummary(register.id),
        getCashRegisterTvaDetails(register.id),
      ]);
      setSummary(summaryData);
      setTvaDetails(tvaData);
    } catch (error) {
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomItem = async () => {
    if (!register || !newItemLabel || !newItemValue) return;
    
    try {
      const valueInCents = Math.round(parseFloat(newItemValue) * 100);
      const newItem = await addCustomItem(register.id, {
        label: newItemLabel,
        value: valueInCents,
      });
      
      setSummary((prev) =>
        prev ? { ...prev, custom_items: [...prev.custom_items, newItem] } : prev
      );
      setNewItemLabel("");
      setNewItemValue("");
      setAddPopoverOpen(false);
      toast.success("Correction ajoutée");
    } catch (error) {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleDeleteCustomItem = async (itemId: string) => {
    if (!register) return;
    
    try {
      await deleteCustomItem(register.id, itemId);
      setSummary((prev) =>
        prev
          ? { ...prev, custom_items: prev.custom_items.filter((i) => i.id !== itemId) }
          : prev
      );
      toast.success("Correction supprimée");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleEnclose = async () => {
    if (!register) return;
    
    setEnclosing(true);
    try {
      const result = await encloseCashRegister(register.id, { comment });
      if (result.status !== "ok") {
        toast.error(result.error || "Erreur lors de la clôture");
        return;
      }
      toast.success("Z de caisse validé");
      onRefresh();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erreur lors de la clôture");
    } finally {
      setEnclosing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate variance
  const theoreticalTotal = summary?.items.reduce((acc, item) => acc + item.amount, 0) || 0;
  const customTotal = summary?.custom_items.reduce((acc, item) => acc + item.value, 0) || 0;
  const cashTheoreticalItem = summary?.items.find((i) => i.mop_code === "CASH");
  const cashDeclaredItem = summary?.custom_items.find((i) => i.label.toLowerCase().includes("espèces"));
  
  const variance = cashDeclaredItem && cashTheoreticalItem 
    ? cashDeclaredItem.value - cashTheoreticalItem.amount 
    : customTotal - theoreticalTotal;

  const isEnclosed = summary?.enclosed || false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto print:max-w-none print:w-full">
        <SheetHeader className="print:mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Clôture de Caisse</SheetTitle>
            <div className="flex items-center gap-2">
              {isEnclosed && (
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimer
                </Button>
              )}
              <Badge variant={isEnclosed ? "secondary" : "default"}>
                {isEnclosed ? "Archivé" : "En cours"}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : summary ? (
          <div className="space-y-6 mt-6">
            {/* Section 1: Totals */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Fond de Caisse</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(summary.cash_fund)}</p>
              </CardContent>
            </Card>

            {/* Section 2: Payment Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ventilation Théorique</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.items.map((item) => (
                  <div key={item.mop_code} className="flex justify-between">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(theoreticalTotal)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Variance Analysis */}
            <Card className={variance === 0 ? "border-green-500" : variance < 0 ? "border-destructive" : "border-blue-500"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Analyse des Écarts</CardTitle>
              </CardHeader>
              <CardContent>
                {variance === 0 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="h-8 w-8" />
                    <span className="text-lg font-semibold">Caisse Juste</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-6 w-6 ${variance < 0 ? "text-destructive" : "text-blue-500"}`} />
                    <span className={`text-xl font-bold ${variance < 0 ? "text-destructive" : "text-blue-500"}`}>
                      {variance > 0 ? "+" : ""}{formatCurrency(variance)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {variance < 0 ? "(Manque)" : "(Excédent)"}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 3: Custom Items */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Corrections / Comptage Réel</CardTitle>
                  {!isEnclosed && (
                    <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Ajouter
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Libellé</Label>
                            <Input
                              value={newItemLabel}
                              onChange={(e) => setNewItemLabel(e.target.value)}
                              placeholder="Ex: Espèces comptées"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Montant (€)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={newItemValue}
                              onChange={(e) => setNewItemValue(e.target.value)}
                              placeholder="Ex: 115.00"
                            />
                          </div>
                          <Button onClick={handleAddCustomItem} className="w-full">
                            Ajouter
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.custom_items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune correction</p>
                ) : (
                  summary.custom_items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                        {!isEnclosed && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer cette correction ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCustomItem(item.id)}>
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Section 4: VAT Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Détails TVA</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {tvaDetails.map((group, idx) => (
                    <AccordionItem key={idx} value={`item-${idx}`}>
                      <AccordionTrigger>{group.delivery_type_label}</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {group.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="grid grid-cols-4 text-sm">
                              <span>{item.tva_title}</span>
                              <span className="text-right">{formatCurrency(item.ht_sum)} HT</span>
                              <span className="text-right">{formatCurrency(item.tva_sum)} TVA</span>
                              <span className="text-right font-medium">{formatCurrency(item.ttc_sum)} TTC</span>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Enclose Comment (if already enclosed) */}
            {isEnclosed && summary.enclose_comment && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Commentaire de clôture</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{summary.enclose_comment}</p>
                </CardContent>
              </Card>
            )}

            {/* Footer Action: Final Closure */}
            {!isEnclosed && (
              <Card className="border-primary print:hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Validation du Z de Caisse</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Commentaire de clôture</Label>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Ajouter un commentaire (optionnel)..."
                    />
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full" disabled={enclosing}>
                        Valider le Z de Caisse
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Valider la clôture définitive ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Le registre sera archivé et ne pourra plus être modifié.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleEnclose} disabled={enclosing}>
                          {enclosing ? "Validation..." : "Confirmer"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};

export default CashRegisterDetailsSheet;
