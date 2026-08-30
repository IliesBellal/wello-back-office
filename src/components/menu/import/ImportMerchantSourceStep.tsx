import { AlertCircle, ArrowLeft, Building2, Loader2 } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface ImportMerchantSourceStepProps {
  sourceMerchantId: string | null;
  error: string | null;
  isAnalyzing: boolean;
  onSourceChange: (merchantId: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

/**
 * Troisième porte : copier le catalogue d'un autre établissement auquel
 * l'utilisateur a accès.
 *
 * La liste vient de `authData.session.merchants` — déjà exactement le
 * périmètre d'établissements accessibles au compte courant, la même source
 * que le sélecteur d'établissement du header. Seuls `id`/`business_name` sont
 * utilisés : le `token` de chaque établissement sert au bascule de session
 * complète du header, jamais à une lecture cross-marchand scopée comme
 * celle-ci — l'API vérifie l'accès elle-même, côté serveur, à partir de
 * l'identité de l'utilisateur courant.
 */
export const ImportMerchantSourceStep = ({
  sourceMerchantId,
  error,
  isAnalyzing,
  onSourceChange,
  onSubmit,
  onBack,
}: ImportMerchantSourceStepProps) => {
  const { authData } = useAuth();

  const otherMerchants = (authData?.session.merchants ?? []).filter(
    (merchant) => merchant.id !== authData?.session.merchant_id,
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {otherMerchants.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vous n'avez accès à aucun autre établissement avec ce compte.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          <Label>Depuis quel établissement ?</Label>
          <RadioGroup
            value={sourceMerchantId ?? undefined}
            onValueChange={onSourceChange}
            className="space-y-2"
          >
            {otherMerchants.map((merchant) => (
              <Label
                key={merchant.id}
                htmlFor={`source-merchant-${merchant.id}`}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border border-border bg-card p-4 transition-colors',
                  sourceMerchantId === merchant.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/40',
                )}
              >
                <RadioGroupItem
                  value={merchant.id}
                  id={`source-merchant-${merchant.id}`}
                  className="mt-0.5"
                  disabled={isAnalyzing}
                />
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{merchant.business_name}</p>
                  {merchant.address && (
                    <p className="truncate text-xs text-muted-foreground">{merchant.address}</p>
                  )}
                </div>
              </Label>
            ))}
          </RadioGroup>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-sm text-muted-foreground">
        Rien n'est enregistré à cette étape : vous verrez d'abord le détail de ce qui sera créé.
      </p>

      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onBack} disabled={isAnalyzing}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <Button onClick={onSubmit} disabled={!sourceMerchantId || isAnalyzing}>
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyse du catalogue…
            </>
          ) : (
            'Analyser le catalogue'
          )}
        </Button>
      </div>
    </div>
  );
};
