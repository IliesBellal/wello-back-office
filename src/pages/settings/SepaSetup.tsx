/**
 * LOT B chantier 3b — écran de mandat SEPA (§7.4).
 *
 * Flow : POST /billing/sepa/setup renvoie un client_secret de SetupIntent
 * Stripe restreint à sepa_debit ; le mandat est confirmé côté client avec
 * l'IBAN Element, jamais transmis en clair à l'API (Stripe Elements only —
 * PCI/SEPA scope reste entièrement chez Stripe).
 */
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Elements, IbanElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { AlertCircle, CheckCircle2, Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageContainer } from "@/components/shared";
import { SettingsPageContainer } from "@/components/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { getStripe } from "@/lib/stripeClient";
import { billingApi } from "@/services/billingService";

const IBAN_ELEMENT_OPTIONS = {
  supportedCountries: ["SEPA"],
  placeholderCountry: "FR",
  style: {
    base: {
      fontSize: "14px",
      color: "hsl(var(--foreground))",
      "::placeholder": { color: "hsl(var(--muted-foreground))" },
    },
  },
};

export default function SepaSetup() {
  const { canManageSettings } = usePermissions();
  if (!canManageSettings) {
    return <Navigate to="/" replace />;
  }
  return (
    <DashboardLayout>
      <PageContainer
        header={<h1 className="text-3xl font-bold text-foreground">Moyen de paiement</h1>}
        description="Renseignez un mandat de prélèvement SEPA pour activer votre caisse et régler votre abonnement WelloResto."
      >
        <SettingsPageContainer className="max-w-xl">
          <Elements stripe={getStripe()}>
            <SepaSetupCard />
          </Elements>
        </SettingsPageContainer>
      </PageContainer>
    </DashboardLayout>
  );
}

function SepaSetupCard() {
  const stripe = useStripe();
  const elements = useElements();
  const { authData } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [accountHolderName, setAccountHolderName] = useState(authData?.user?.name ?? "");
  const [email, setEmail] = useState(authData?.user?.email ?? "");
  const [mandateAccepted, setMandateAccepted] = useState(false);
  const [ibanComplete, setIbanComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit =
    !!stripe && !!elements && ibanComplete && mandateAccepted && accountHolderName.trim() !== "" && email.trim() !== "" && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    const ibanElement = elements.getElement(IbanElement);
    if (!ibanElement) return;

    setSubmitting(true);
    setError(null);

    try {
      const { client_secret } = await billingApi.createSepaSetup();
      const result = await stripe.confirmSepaDebitSetup(client_secret, {
        payment_method: {
          sepa_debit: ibanElement,
          billing_details: { name: accountHolderName, email },
        },
      });

      if (result.error) {
        setError(result.error.message ?? "Le mandat n'a pas pu être validé. Vérifiez votre IBAN.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      toast.success("Mandat SEPA enregistré.");
      qc.invalidateQueries({ queryKey: qk.billing.activationStatus });
      qc.invalidateQueries({ queryKey: qk.subscriptions.current });
    } catch (err) {
      setError((err as Error)?.message ?? "Une erreur est survenue lors de la configuration du mandat.");
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
          <p className="text-lg font-semibold">Mandat SEPA enregistré</p>
          <p className="text-sm text-muted-foreground">
            Votre moyen de paiement est en cours de validation par votre banque. Votre caisse s'activera automatiquement dès sa confirmation.
          </p>
          <Button className="mt-2" onClick={() => navigate("/settings/subscription")}>
            Voir mon abonnement
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5" />
          Mandat de prélèvement SEPA
        </CardTitle>
        <CardDescription>
          Vos coordonnées bancaires sont transmises directement à Stripe et ne transitent jamais par nos serveurs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="account_holder_name">Titulaire du compte</Label>
            <Input
              id="account_holder_name"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder="Nom complet"
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              required
            />
          </div>
          <div>
            <Label htmlFor="iban">IBAN</Label>
            <div className="mt-1.5 rounded-md border border-input bg-background px-3 py-2.5">
              <IbanElement
                id="iban"
                options={IBAN_ELEMENT_OPTIONS}
                onChange={(e) => setIbanComplete(e.complete)}
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={mandateAccepted}
                onChange={(e) => setMandateAccepted(e.target.checked)}
              />
              <span>
                En fournissant vos informations de paiement et en confirmant ce paiement, vous autorisez (A) WelloResto et
                Stripe, son prestataire de services de paiement, à envoyer des instructions à votre banque pour débiter
                votre compte, et (B) votre banque à débiter votre compte conformément à ces instructions. Vous bénéficiez
                du droit d'être remboursé par votre banque selon les modalités et conditions du mandat SEPA. La demande de
                remboursement doit être présentée dans les 8 semaines suivant la date de débit de votre compte.
              </span>
            </label>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {submitting ? "Validation en cours…" : "Valider le mandat"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
