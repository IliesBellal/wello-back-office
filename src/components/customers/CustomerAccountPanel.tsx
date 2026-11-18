import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCents } from "@/lib/money";
import {
  accountBalanceKind,
  accountEntryLabel,
  createCustomerAccountPaymentLink,
  downloadCustomerAccountStatement,
  getCustomerAccount,
  remindCustomerAccount,
  sendCustomerAccountStatement,
  updateCustomerAccountCustomerSettings,
  type CustomerAccount,
} from "@/services/customerAccountsService";
import { Download, Link2, Loader2, Mail, Megaphone } from "lucide-react";

const formatDate = (seconds: number): string =>
  seconds > 0 ? new Date(seconds * 1000).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

/** Montant saisi en euros (« 150,50 ») -> centimes ; null si invalide. */
export const parseEuros = (raw: string): number | null => {
  const value = Number(raw.trim().replace(/\s/g, "").replace(",", "."));
  if (raw.trim() === "" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
};

export const centsToInput = (cents: number): string => (cents / 100).toString().replace(".", ",");

export const AccountBalanceBadge = ({ balance }: { balance: number }) => {
  const kind = accountBalanceKind(balance);
  const variant = kind === "Ardoise" ? "destructive" : kind === "Avance" ? "default" : "secondary";
  return (
    <Badge variant={variant}>
      {kind}
      {kind === "Soldé" ? "" : ` ${formatCents(Math.abs(balance))}`}
    </Badge>
  );
};

const REMINDER_SOURCE: Record<string, string> = { AUTO: "Automatique", MANUAL: "Manuelle" };

const errorMessage = (e: unknown, fallback: string): string => (e instanceof Error && e.message ? e.message : fallback);

/**
 * Compte d'un client (avance et ardoise) : solde, plafond propre, relevé,
 * relance, lien de paiement et historique. Les versements et remboursements
 * se font en caisse.
 */
export const CustomerAccountPanel = ({ customerId }: { customerId: number | string }) => {
  const { toast } = useToast();
  const { canManageCustomers } = usePermissions();
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [error, setError] = useState(false);
  const [useOwnLimit, setUseOwnLimit] = useState(false);
  const [ownLimit, setOwnLimit] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [remindersDisabled, setRemindersDisabled] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const apply = useCallback((a: CustomerAccount) => {
    setAccount(a);
    setUseOwnLimit(a.customer_settings?.credit_limit != null);
    setOwnLimit(centsToInput(a.customer_settings?.credit_limit ?? a.merchant_credit_limit ?? 0));
    setBlocked(a.customer_settings?.credit_blocked ?? false);
    setRemindersDisabled(a.customer_settings?.reminders_disabled ?? false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAccount(null);
    setError(false);
    getCustomerAccount(customerId)
      .then((a) => !cancelled && apply(a))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [customerId, apply]);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  };

  const saveSettings = () =>
    run("settings", async () => {
      const limit = useOwnLimit ? parseEuros(ownLimit) : null;
      if (useOwnLimit && limit === null) {
        toast({ title: "Montant invalide", variant: "destructive" });
        return;
      }
      try {
        apply(await updateCustomerAccountCustomerSettings(customerId, {
            credit_limit: limit,
            credit_blocked: blocked,
            reminders_disabled: remindersDisabled,
          }));
        toast({ title: "Réglages du compte enregistrés" });
      } catch (e) {
        toast({ title: "Erreur", description: errorMessage(e, "Réglages non enregistrés."), variant: "destructive" });
      }
    });

  const download = () =>
    run("download", async () => {
      try {
        await downloadCustomerAccountStatement(customerId, from, to);
      } catch (e) {
        toast({ title: "Relevé indisponible", description: errorMessage(e, ""), variant: "destructive" });
      }
    });

  const send = () =>
    run("send", async () => {
      try {
        const email = await sendCustomerAccountStatement(customerId, from, to);
        toast({ title: "Relevé envoyé", description: email });
      } catch (e) {
        toast({ title: "Relevé non envoyé", description: errorMessage(e, ""), variant: "destructive" });
      }
    });

  const remind = () =>
    run("remind", async () => {
      try {
        const reminder = await remindCustomerAccount(customerId);
        toast({ title: "Relance envoyée", description: reminder.channels === "EMAIL+SMS" ? "Email et SMS" : reminder.channels === "SMS" ? "SMS" : "Email" });
        apply(await getCustomerAccount(customerId));
      } catch (e) {
        toast({ title: "Relance non envoyée", description: errorMessage(e, ""), variant: "destructive" });
      }
    });

  const copyLink = () =>
    run("link", async () => {
      try {
        const url = await createCustomerAccountPaymentLink(customerId);
        await navigator.clipboard.writeText(url);
        toast({ title: "Lien de paiement copié", description: url });
      } catch (e) {
        toast({ title: "Lien indisponible", description: errorMessage(e, ""), variant: "destructive" });
      }
    });

  if (error) {
    return <p className="text-sm text-muted-foreground">Impossible de charger le compte de ce client.</p>;
  }
  if (!account) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const spinner = (key: string) => (busy === key ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null);
  const hasDebt = account.balance < 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <AccountBalanceBadge balance={account.balance} />
        <span className="text-sm text-muted-foreground">
          Peut encore régler {formatCents(account.available)} sur son compte (plafond {formatCents(account.credit_limit)}).
        </span>
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <p className="text-sm font-medium">Ardoise de ce client</p>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="credit-blocked">Ardoise interdite (son avance reste utilisable)</Label>
          <Switch id="credit-blocked" checked={blocked} onCheckedChange={setBlocked} disabled={!canManageCustomers} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="own-limit">
            Plafond propre (sinon celui de l'établissement : {formatCents(account.merchant_credit_limit)})
          </Label>
          <Switch id="own-limit" checked={useOwnLimit} onCheckedChange={setUseOwnLimit} disabled={!canManageCustomers || blocked} />
        </div>
        {useOwnLimit && !blocked && (
          <Input
            inputMode="decimal"
            value={ownLimit}
            onChange={(e) => setOwnLimit(e.target.value)}
            disabled={!canManageCustomers}
            className="max-w-[160px]"
            aria-label="Plafond propre en euros"
          />
        )}
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="reminders-disabled">Ne pas relancer automatiquement ce client</Label>
          <Switch
            id="reminders-disabled"
            checked={remindersDisabled}
            onCheckedChange={setRemindersDisabled}
            disabled={!canManageCustomers}
          />
        </div>
        {canManageCustomers && (
          <Button size="sm" onClick={saveSettings} disabled={busy !== null}>
            {spinner("settings")}Enregistrer
          </Button>
        )}
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <p className="text-sm font-medium">Relevé de compte</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="statement-from" className="text-xs">Du</Label>
            <Input id="statement-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="statement-to" className="text-xs">Au</Label>
            <Input id="statement-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={download} disabled={busy !== null}>
            {spinner("download") ?? <Download className="mr-2 h-4 w-4" />}Télécharger
          </Button>
          <Button variant="outline" size="sm" onClick={send} disabled={busy !== null}>
            {spinner("send") ?? <Mail className="mr-2 h-4 w-4" />}Envoyer au client
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Sans dates : les trois derniers mois.</p>
      </div>

      {hasDebt && (
        <div className="flex flex-wrap gap-2">
          {canManageCustomers && (
            <Button variant="outline" size="sm" onClick={remind} disabled={busy !== null}>
              {spinner("remind") ?? <Megaphone className="mr-2 h-4 w-4" />}Relancer maintenant
            </Button>
          )}
          {account.online_payment_available && (
            <Button variant="outline" size="sm" onClick={copyLink} disabled={busy !== null}>
              {spinner("link") ?? <Link2 className="mr-2 h-4 w-4" />}Copier le lien de paiement
            </Button>
          )}
        </div>
      )}

      {account.reminders?.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Relances</p>
          <ul className="text-sm text-muted-foreground">
            {account.reminders.slice(0, 5).map((r) => (
              <li key={`${r.sent_at}-${r.channels}`}>
                {formatDate(r.sent_at)} · {REMINDER_SOURCE[r.source] ?? r.source} · {r.channels} · {formatCents(Math.abs(r.balance))} dus
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="max-h-[45vh] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Opération</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Solde après</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {account.entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Aucun mouvement.
                </TableCell>
              </TableRow>
            )}
            {account.entries.map((entry, i) => (
              <TableRow key={`${entry.kind}-${entry.operation?.operation_id ?? entry.payment?.payment_id ?? i}`}>
                <TableCell className="whitespace-nowrap">{formatDate(entry.date)}</TableCell>
                <TableCell>
                  <div>{accountEntryLabel(entry)}</div>
                  {(entry.operation?.comment || entry.operation?.user_name) && (
                    <div className="text-xs text-muted-foreground">
                      {[entry.operation?.user_name, entry.operation?.comment].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </TableCell>
                <TableCell className={`text-right ${entry.delta < 0 ? "text-destructive" : "text-emerald-600"}`}>
                  {entry.delta < 0 ? "−" : "+"}
                  {formatCents(Math.abs(entry.delta))}
                </TableCell>
                <TableCell className="text-right">{formatCents(entry.balance_after)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CustomerAccountPanel;
