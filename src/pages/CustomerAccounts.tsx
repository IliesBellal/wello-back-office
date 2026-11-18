import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageContainer } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountBalanceBadge, CustomerAccountPanel, centsToInput, parseEuros } from "@/components/customers/CustomerAccountPanel";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCents } from "@/lib/money";
import {
  accountCustomerName,
  agingToCsv,
  getCustomerAccountSettings,
  getCustomerAccountsAging,
  getCustomerAccountsMonthly,
  listCustomerAccounts,
  updateCustomerAccountSettings,
  type CashMode,
  type CustomerAccountAging,
  type CustomerAccountMonth,
  type CustomerAccountSettings,
  type CustomerAccountSummary,
} from "@/services/customerAccountsService";
import { Download, Loader2, Wallet } from "lucide-react";

const formatDate = (seconds: number): string =>
  seconds > 0 ? new Date(seconds * 1000).toLocaleDateString("fr-FR") : "—";

const MONTH_LABELS = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];

/** Réglages du compte client de l'établissement. */
const SettingsCard = ({ canEdit }: { canEdit: boolean }) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CustomerAccountSettings | null>(null);
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCustomerAccountSettings()
      .then((s) => {
        setSettings(s);
        setLimit(centsToInput(s.credit_limit));
      })
      .catch(() => toast({ title: "Erreur", description: "Réglages indisponibles.", variant: "destructive" }));
  }, [toast]);

  if (!settings) return <Skeleton className="h-40 w-full" />;

  const update = (patch: Partial<CustomerAccountSettings>) => setSettings({ ...settings, ...patch });

  const save = async () => {
    const cents = parseEuros(limit);
    if (cents === null) {
      toast({ title: "Plafond invalide", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const saved = await updateCustomerAccountSettings({ ...settings, credit_limit: cents });
      setSettings(saved);
      setLimit(centsToInput(saved.credit_limit));
      toast({ title: "Réglages enregistrés" });
    } catch {
      toast({ title: "Erreur", description: "Réglages non enregistrés.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Réglages</CardTitle>
        <CardDescription>Plafond d'ardoise par défaut, espèces et relances automatiques.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="credit-limit">Plafond d'ardoise par client (€)</Label>
          <Input id="credit-limit" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} disabled={!canEdit} />
          <p className="text-xs text-muted-foreground">0 € = ardoise désactivée. Un plafond propre peut être fixé dans la fiche d'un client.</p>
        </div>
        <div className="space-y-2">
          <Label>Versements en espèces au-delà de 1 000 €</Label>
          <Select value={settings.cash_mode} onValueChange={(v) => update({ cash_mode: v as CashMode })} disabled={!canEdit}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BLOCK">Refuser</SelectItem>
              <SelectItem value="WARN">Accepter un client non-résident (jusqu'à 15 000 €)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            La loi limite à 1 000 € les espèces d'un résident fiscal français, 15 000 € pour un non-résident. La caisse
            demande alors de le confirmer.
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="reminder-enabled">Relancer les ardoises</Label>
            <Switch id="reminder-enabled" checked={settings.reminder_enabled} onCheckedChange={(v) => update({ reminder_enabled: v })} disabled={!canEdit} />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>Tous les</span>
            <Input
              className="w-20"
              type="number"
              min={1}
              max={365}
              value={settings.reminder_days}
              onChange={(e) => update({ reminder_days: Number(e.target.value) || 0 })}
              disabled={!canEdit || !settings.reminder_enabled}
              aria-label="Jours entre deux relances"
            />
            <span>jours, au plus</span>
            <Input
              className="w-16"
              type="number"
              min={1}
              max={20}
              value={settings.reminder_max}
              onChange={(e) => update({ reminder_max: Number(e.target.value) || 0 })}
              disabled={!canEdit || !settings.reminder_enabled}
              aria-label="Nombre maximal de relances"
            />
            <span>fois</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="reminder-sms">Aussi par SMS (crédits SMS de l'établissement)</Label>
            <Switch id="reminder-sms" checked={settings.reminder_sms} onCheckedChange={(v) => update({ reminder_sms: v })} disabled={!canEdit || !settings.reminder_enabled} />
          </div>
          <p className="text-xs text-muted-foreground">
            Email au client à 10 h, à partir du délai depuis la plus ancienne commande non réglée.
            {settings.online_payment_available ? " Le lien de paiement en ligne est joint." : " Le paiement en ligne n'est pas activé pour cet établissement."}
          </p>
        </div>
        {canEdit && (
          <div className="md:col-span-3">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer les réglages
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/** Balance âgée des ardoises, avec export CSV. */
const AgingTab = ({ onOpen }: { onOpen: (c: CustomerAccountSummary) => void }) => {
  const [rows, setRows] = useState<CustomerAccountAging[] | null>(null);
  useEffect(() => {
    getCustomerAccountsAging().then(setRows).catch(() => setRows([]));
  }, []);

  if (!rows) return <Skeleton className="h-40 w-full" />;
  const total = rows.reduce(
    (t, r) => ({ debt: t.debt + r.debt, a: t.a + r.days_0_30, b: t.b + r.days_31_60, c: t.c + r.days_61_plus }),
    { debt: 0, a: 0, b: 0, c: 0 },
  );

  const exportCsv = () => {
    const blob = new Blob(["﻿" + agingToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `balance_agee_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Balance âgée</CardTitle>
          <CardDescription>Chaque versement solde d'abord les commandes les plus anciennes.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Plus ancienne commande due</TableHead>
              <TableHead className="text-right">0–30 j</TableHead>
              <TableHead className="text-right">31–60 j</TableHead>
              <TableHead className="text-right">+ de 60 j</TableHead>
              <TableHead className="text-right">Total dû</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Aucune ardoise en cours.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.customer.customer_id} className="cursor-pointer" onClick={() => onOpen(r.customer)}>
                <TableCell className="font-medium">{accountCustomerName(r.customer)}</TableCell>
                <TableCell>{formatDate(r.oldest_unpaid)}</TableCell>
                <TableCell className="text-right">{formatCents(r.days_0_30)}</TableCell>
                <TableCell className="text-right">{formatCents(r.days_31_60)}</TableCell>
                <TableCell className="text-right text-destructive">{formatCents(r.days_61_plus)}</TableCell>
                <TableCell className="text-right font-medium">{formatCents(r.debt)}</TableCell>
              </TableRow>
            ))}
            {rows.length > 0 && (
              <TableRow className="font-medium">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right">{formatCents(total.a)}</TableCell>
                <TableCell className="text-right">{formatCents(total.b)}</TableCell>
                <TableCell className="text-right">{formatCents(total.c)}</TableCell>
                <TableCell className="text-right">{formatCents(total.debt)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

/** Mouvements et soldes de fin de mois, pour le rapprochement comptable. */
const MonthlyTab = () => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [months, setMonths] = useState<CustomerAccountMonth[] | null>(null);
  useEffect(() => {
    setMonths(null);
    getCustomerAccountsMonthly(year).then(setMonths).catch(() => setMonths([]));
  }, [year]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Par mois</CardTitle>
          <CardDescription>
            Soldes de fin de mois à rapprocher des comptes 4191 (avances) et 411 (ardoises).
          </CardDescription>
        </div>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {!months ? (
          <Skeleton className="m-4 h-40" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mois</TableHead>
                <TableHead className="text-right">Versements</TableHead>
                <TableHead className="text-right">Consommé</TableHead>
                <TableHead className="text-right">Remboursé</TableHead>
                <TableHead className="text-right">Abandonné</TableHead>
                <TableHead className="text-right">Variation</TableHead>
                <TableHead className="text-right">Avances fin de mois</TableHead>
                <TableHead className="text-right">Ardoises fin de mois</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((m, i) => (
                <TableRow key={m.month}>
                  <TableCell>{MONTH_LABELS[i] ?? m.month}</TableCell>
                  <TableCell className="text-right">{formatCents(m.deposits)}</TableCell>
                  <TableCell className="text-right">{formatCents(m.consumed)}</TableCell>
                  <TableCell className="text-right">{formatCents(m.refunds)}</TableCell>
                  <TableCell className="text-right">{formatCents(m.write_offs)}</TableCell>
                  <TableCell className={`text-right ${m.net_change < 0 ? "text-destructive" : ""}`}>{formatCents(m.net_change)}</TableCell>
                  <TableCell className="text-right">{formatCents(m.end_credit)}</TableCell>
                  <TableCell className="text-right">{formatCents(m.end_debt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Comptes clients (avance et ardoise) : réglages, comptes en cours, balance
 * âgée et totaux mensuels. Les versements et remboursements se font en caisse.
 */
const CustomerAccounts = () => {
  const { toast } = useToast();
  const { canManageSettings, canViewFinancials } = usePermissions();
  const [accounts, setAccounts] = useState<CustomerAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CustomerAccountSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAccounts(await listCustomerAccounts());
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les comptes clients.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalDebt = accounts.filter((a) => a.balance < 0).reduce((sum, a) => sum - a.balance, 0);
  const totalCredit = accounts.filter((a) => a.balance > 0).reduce((sum, a) => sum + a.balance, 0);

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div>
            <h1 className="text-3xl font-bold text-foreground">Comptes clients</h1>
            <p className="text-sm text-muted-foreground">
              Avances versées et ardoises en cours. Les versements et remboursements se font en caisse, depuis la fiche du client.
            </p>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Ardoises à encaisser</CardDescription>
              <CardTitle className="text-2xl">{formatCents(totalDebt)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avances à consommer</CardDescription>
              <CardTitle className="text-2xl">{formatCents(totalCredit)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="accounts" className="mt-4">
          <TabsList>
            <TabsTrigger value="accounts">Comptes en cours</TabsTrigger>
            {canViewFinancials && <TabsTrigger value="aging">Balance âgée</TabsTrigger>}
            {canViewFinancials && <TabsTrigger value="monthly">Par mois</TabsTrigger>}
            <TabsTrigger value="settings">Réglages</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="space-y-2 p-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
                    <Wallet className="h-8 w-8" />
                    <p>Aucun compte client en cours : ni avance ni ardoise.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Téléphone</TableHead>
                        <TableHead>Dernier mouvement</TableHead>
                        <TableHead className="text-right">Solde</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((account) => (
                        <TableRow key={account.customer_id} className="cursor-pointer" onClick={() => setSelected(account)}>
                          <TableCell className="font-medium">{accountCustomerName(account)}</TableCell>
                          <TableCell>{account.phone || "—"}</TableCell>
                          <TableCell>{formatDate(account.last_movement)}</TableCell>
                          <TableCell className="text-right">
                            <AccountBalanceBadge balance={account.balance} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {canViewFinancials && (
            <TabsContent value="aging">
              <AgingTab onOpen={setSelected} />
            </TabsContent>
          )}
          {canViewFinancials && (
            <TabsContent value="monthly">
              <MonthlyTab />
            </TabsContent>
          )}
          <TabsContent value="settings">
            <SettingsCard canEdit={canManageSettings} />
          </TabsContent>
        </Tabs>
      </PageContainer>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            void load();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? accountCustomerName(selected) : ""}</DialogTitle>
            <DialogDescription>Compte client : avance et ardoise.</DialogDescription>
          </DialogHeader>
          {selected && <CustomerAccountPanel customerId={selected.customer_id} />}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CustomerAccounts;
