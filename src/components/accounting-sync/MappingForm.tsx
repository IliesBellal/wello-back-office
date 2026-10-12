import { useMemo, useState } from 'react';
import { BookOpen, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  PAYMENT_MOP_OPTIONS,
  VAT_RATE_KEYS,
  accountingErrorCode,
  accountingErrorMessage,
  accountingSyncService,
  mappingOrSuggestion,
  validateMapping,
  type AccountingConnection,
  type AccountingMapping,
  type AccountingProvider,
} from '@/services/accountingSyncService';

type Table = 'sales_accounts' | 'vat_accounts' | 'payment_accounts';

interface AccountFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  hint?: string;
  onChange: (value: string) => void;
}

const AccountField = ({ id, label, value, placeholder, hint, onChange }: AccountFieldProps) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      inputMode="numeric"
      autoComplete="off"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/\s/g, ''))}
    />
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const hasOverrides = (m: AccountingMapping): boolean =>
  (['sales_accounts', 'vat_accounts', 'payment_accounts'] as Table[]).some((t) =>
    Object.keys(m[t] ?? {}).some((k) => k !== 'default' && !(t === 'payment_accounts' && k === 'ES')),
  );

interface MappingFormProps {
  connection: AccountingConnection;
  provider?: AccountingProvider;
  /** Appelé après l'enregistrement (la page se recharge). */
  onSaved: () => void;
  /** Annuler la modification (connexion déjà active) ; absent à la première configuration. */
  onCancel?: () => void;
}

/**
 * Étape 2 : la correspondance de comptes. WelloResto envoie des montants
 * (ventes HT et TVA par taux, encaissements par moyen de paiement) ; ce
 * formulaire dit sur quels comptes de VOTRE plan comptable les imputer. Le
 * logiciel vérifie à l'enregistrement que le journal et les comptes existent.
 * Les valeurs proposées sont celles du plan comptable général : à confirmer
 * avec le comptable.
 */
export const MappingForm = ({ connection, provider, onSaved, onCancel }: MappingFormProps) => {
  const firstSetup = connection.status !== 'active';
  const [mapping, setMapping] = useState<AccountingMapping>(() =>
    mappingOrSuggestion(connection.mapping, provider?.suggested_mapping),
  );
  const [showDetails, setShowDetails] = useState<boolean>(() => hasOverrides(mapping));
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [unknownAccounts, setUnknownAccounts] = useState(false);

  const providerName = connection.provider_name || provider?.name || 'le logiciel';
  const localProblem = useMemo(() => validateMapping(mapping), [mapping]);

  const setField = (table: Table, key: string, value: string) =>
    setMapping((m) => ({ ...m, [table]: { ...(m[table] ?? {}), [key]: value } }));

  const handleSave = async () => {
    const invalid = validateMapping(mapping);
    if (invalid) {
      setProblem(invalid);
      setUnknownAccounts(false);
      return;
    }
    setProblem(null);
    setUnknownAccounts(false);
    setSaving(true);
    try {
      await accountingSyncService.saveMapping(mapping);
      toast.success(firstSetup ? 'Synchronisation activée.' : 'Correspondance enregistrée.');
      onSaved();
    } catch (e) {
      const code = accountingErrorCode(e);
      setUnknownAccounts(code === 'unknown_accounts');
      if (code === 'credentials_rejected') {
        setProblem(`${providerName} a refusé la connexion : le jeton est expiré ou a été révoqué. Déconnectez puis reconnectez.`);
      } else {
        setProblem(accountingErrorMessage(e, "Enregistrement impossible. Réessayez dans un instant."));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {firstSetup && (
        <Alert>
          <BookOpen className="h-4 w-4" />
          <AlertTitle>Dernière étape : vos comptes comptables</AlertTitle>
          <AlertDescription className="space-y-1">
            <p>
              Indiquez les numéros de compte de votre plan comptable sur lesquels imputer vos ventes. Les valeurs
              proposées sont celles du plan comptable général ; <strong>faites-les confirmer par votre comptable</strong>.
              Les comptes et le journal doivent déjà exister dans {providerName}.
            </p>
            <p>
              La synchronisation commencera avec la journée <strong>d'aujourd'hui</strong> (envoyée demain matin,
              après la clôture). Les jours précédents ne sont pas envoyés.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="map-journal">Journal de ventes</Label>
          <Input
            id="map-journal"
            autoComplete="off"
            value={mapping.journal_code}
            placeholder="VE"
            onChange={(e) => setMapping((m) => ({ ...m, journal_code: e.target.value.trim() }))}
          />
          <p className="text-xs text-muted-foreground">Le code du journal dans {providerName}, par exemple VE.</p>
        </div>
        <AccountField
          id="map-sales"
          label="Compte de ventes (HT)"
          value={mapping.sales_accounts.default ?? ''}
          placeholder="707000"
          hint="Produits de la restauration, crédité du chiffre d'affaires hors taxe."
          onChange={(v) => setField('sales_accounts', 'default', v)}
        />
        <AccountField
          id="map-vat"
          label="Compte de TVA collectée"
          value={mapping.vat_accounts.default ?? ''}
          placeholder="445710"
          hint="Crédité de la TVA de la journée."
          onChange={(v) => setField('vat_accounts', 'default', v)}
        />
        <AccountField
          id="map-payment"
          label="Compte d'encaissement par défaut"
          value={mapping.payment_accounts.default ?? ''}
          placeholder="580000"
          hint="Débité des encaissements (carte, titres-restaurant, plateformes…) sans compte propre."
          onChange={(v) => setField('payment_accounts', 'default', v)}
        />
        <AccountField
          id="map-cash"
          label="Compte des espèces"
          value={mapping.payment_accounts.ES ?? ''}
          placeholder="531000"
          hint="Caisse. Laissez vide pour utiliser le compte par défaut."
          onChange={(v) => setField('payment_accounts', 'ES', v)}
        />
        <AccountField
          id="map-diff"
          label="Compte d'écart"
          value={mapping.difference_account}
          placeholder="471000"
          hint="Reçoit la différence entre ventes et encaissements du jour (commande non réglée, acompte). Un compte d'attente, à apurer par le comptable."
          onChange={(v) => setMapping((m) => ({ ...m, difference_account: v }))}
        />
      </div>

      <div className="space-y-3">
        <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={() => setShowDetails((s) => !s)}>
          {showDetails ? 'Masquer le détail par taux et par moyen de paiement' : 'Détailler par taux de TVA et par moyen de paiement'}
        </Button>
        {showDetails && (
          <div className="space-y-5 rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">
              Facultatif. Un champ laissé vide utilise le compte par défaut ci-dessus.
            </p>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Comptes de ventes par taux de TVA</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {VAT_RATE_KEYS.map((rate) => (
                  <AccountField
                    key={`s-${rate}`}
                    id={`map-sales-${rate}`}
                    label={`Ventes à ${rate.replace('.', ',')} %`}
                    value={mapping.sales_accounts[rate] ?? ''}
                    onChange={(v) => setField('sales_accounts', rate, v)}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Comptes de TVA collectée par taux</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {VAT_RATE_KEYS.map((rate) => (
                  <AccountField
                    key={`v-${rate}`}
                    id={`map-vat-${rate}`}
                    label={`TVA à ${rate.replace('.', ',')} %`}
                    value={mapping.vat_accounts[rate] ?? ''}
                    onChange={(v) => setField('vat_accounts', rate, v)}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Comptes d'encaissement par moyen de paiement</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {PAYMENT_MOP_OPTIONS.filter((o) => o.key !== 'ES').map((o) => (
                  <AccountField
                    key={`p-${o.key}`}
                    id={`map-pay-${o.key}`}
                    label={o.label}
                    value={mapping.payment_accounts[o.key] ?? ''}
                    onChange={(v) => setField('payment_accounts', o.key, v)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {problem && (
        <Alert variant="destructive">
          <AlertDescription className="space-y-1">
            <p>{problem}</p>
            {unknownAccounts && (
              <p className="text-xs">
                Créez ces éléments dans {providerName} (ou demandez-le à votre comptable), puis enregistrez à nouveau.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}
      {!problem && localProblem && <p className="text-xs text-muted-foreground">{localProblem}</p>}

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={saving || !!localProblem} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Vérification chez ' + providerName + '...' : firstSetup ? 'Enregistrer et activer' : 'Enregistrer'}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Annuler
          </Button>
        )}
      </div>
    </div>
  );
};
