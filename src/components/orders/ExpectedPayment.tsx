import { Banknote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCents } from '@/lib/money';
import { getPendingCollection, type PendingCollection } from '@/utils/orderPayment';
import { paymentMethodLabel } from '@/utils/paymentMethods';

type ExpectedPaymentOrder = Parameters<typeof getPendingCollection>[0];

const BADGE_CLASS = 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400';

/**
 * Badge « À encaisser · Espèces » pour une liste de commandes : rien tant que
 * le client n'a rien annoncé ou que la commande est soldée.
 */
export const ExpectedPaymentBadge = ({ order }: { order: ExpectedPaymentOrder }) => {
  const pending = getPendingCollection(order);
  if (!pending) return null;
  return (
    <Badge variant="outline" className={`text-xs ${BADGE_CLASS}`}>
      À encaisser · {paymentMethodLabel(pending.mop)}
    </Badge>
  );
};

const noticeLines = (pending: PendingCollection): string[] => {
  const lines = [`À encaisser ${formatCents(pending.amount)} · ${paymentMethodLabel(pending.mop)}`];
  if (pending.tenderAmount !== null && pending.changeDue !== null) {
    lines.push(
      `Le client paiera avec ${formatCents(pending.tenderAmount)} · rendre ${formatCents(pending.changeDue)}`,
    );
  }
  return lines;
};

/**
 * Encart du détail d'une commande, dans la section Paiements : le moyen annoncé
 * par le client, le reste à encaisser et la monnaie à rendre en espèces.
 */
export const ExpectedPaymentNotice = ({ order }: { order: ExpectedPaymentOrder }) => {
  const pending = getPendingCollection(order);
  if (!pending) return null;
  const [title, ...details] = noticeLines(pending);
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${BADGE_CLASS}`}>
      <Banknote className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-0.5">
        <p className="font-medium">{title}</p>
        {details.map((line) => (
          <p key={line} className="text-xs opacity-90">
            {line}
          </p>
        ))}
        <p className="text-xs opacity-75">Paiement annoncé, pas encore encaissé.</p>
      </div>
    </div>
  );
};
