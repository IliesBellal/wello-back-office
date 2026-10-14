import { useEffect, useState } from 'react';
import { Loader2, Ban } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCustomerBlockReasons } from '@/hooks/useCustomerBlockReasons';
import {
  blockCustomer,
  describeBlockCustomerError,
  type Customer,
} from '@/services/customersService';

const MAX_COMMENT_LENGTH = 255;

const getDisplayName = (customer: Customer): string => {
  const parts = [customer.first_name, customer.last_name].filter(Boolean);
  return parts.join(' ') || customer.customer_name || 'ce client';
};

interface CustomerBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Fiche à bloquer. Absente : blocage d'un numéro de téléphone — l'API crée la
   * fiche du client si elle n'existe pas encore.
   */
  customer?: Customer | null;
  /** Rappelé après un blocage réussi, pour recharger la liste. */
  onBlocked: () => void;
}

/**
 * Bloque un client pour la commande en ligne (ScanNOrder). Le client bloqué n'est
 * pas prévenu : sa commande est simplement refusée, sans motif affiché. Le blocage
 * vaut pour toutes les fiches qui partagent son téléphone ou son email.
 */
export function CustomerBlockDialog({ open, onOpenChange, customer, onBlocked }: CustomerBlockDialogProps) {
  const { toast } = useToast();
  const { reasons, isLoading: reasonsLoading, isError: reasonsError } = useCustomerBlockReasons(open);

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [reasonId, setReasonId] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulaire vierge à chaque ouverture.
  useEffect(() => {
    if (open) {
      setPhone('');
      setEmail('');
      setFirstName('');
      setLastName('');
      setReasonId('');
      setComment('');
      setIsSubmitting(false);
    }
  }, [open]);

  const selectedReason = reasons.find((r) => r.deletion_reason_id === reasonId);
  const byNumber = !customer;
  const commentMissing = Boolean(selectedReason?.requires_comment) && comment.trim() === '';
  const identityMissing = byNumber && phone.trim() === '' && email.trim() === '';
  const canSubmit = Boolean(reasonId) && !commentMissing && !identityMissing && !isSubmitting;

  // Sans téléphone, le blocage ne peut rien refuser : la commande ScanNOrder
  // identifie le client par son seul téléphone.
  const customerHasNoPhone = Boolean(customer) && !customer?.phone;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const result = await blockCustomer({
        ...(customer
          ? { customer_id: customer.id }
          : {
              phone: phone.trim(),
              email: email.trim(),
              first_name: firstName.trim(),
              last_name: lastName.trim(),
            }),
        reason_id: reasonId,
        comment: comment.trim(),
      });

      const linked = result.blocked_count > 1 ? ` ${result.blocked_count} fiches liées sont bloquées.` : '';
      toast({
        title: result.created ? 'Numéro bloqué' : 'Client bloqué',
        description: `Il ne pourra plus commander en ligne.${linked}`,
      });
      onOpenChange(false);
      onBlocked();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: describeBlockCustomerError(error),
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            {customer ? `Bloquer ${getDisplayName(customer)}` : 'Bloquer un numéro'}
          </DialogTitle>
          <DialogDescription>
            Ce client ne pourra plus passer de commande en ligne dans votre établissement. Il n'en sera
            pas informé : sa commande sera simplement refusée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {byNumber && (
            <>
              <div className="space-y-2">
                <Label htmlFor="block-phone">Téléphone *</Label>
                <Input
                  id="block-phone"
                  inputMode="tel"
                  placeholder="06 12 34 56 78"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="block-first-name">Prénom</Label>
                  <Input id="block-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="block-last-name">Nom</Label>
                  <Input id="block-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="block-email">Email</Label>
                <Input
                  id="block-email"
                  type="email"
                  placeholder="Facultatif"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </>
          )}

          {customerHasNoPhone && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Ce client n'a pas de numéro de téléphone : le blocage ne pourra pas s'appliquer à ses
              commandes en ligne, qui identifient le client par son téléphone.
            </p>
          )}

          <div className="space-y-2">
            <Label>Motif *</Label>
            <Select value={reasonId} onValueChange={setReasonId} disabled={reasonsLoading || reasonsError}>
              <SelectTrigger>
                <SelectValue placeholder={reasonsLoading ? 'Chargement…' : 'Choisir un motif'} />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((reason) => (
                  <SelectItem key={reason.deletion_reason_id} value={reason.deletion_reason_id}>
                    {reason.label || reason.deletion_reason_desc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {reasonsError && (
              <p className="text-xs text-destructive">Impossible de charger les motifs de blocage.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="block-comment">
              Précision{selectedReason?.requires_comment ? ' *' : ' (facultatif)'}
            </Label>
            <Textarea
              id="block-comment"
              value={comment}
              maxLength={MAX_COMMENT_LENGTH}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Visible uniquement par votre équipe"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" variant="destructive" disabled={!canSubmit} onClick={handleSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Blocage…
              </>
            ) : (
              'Bloquer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
