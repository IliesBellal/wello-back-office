import { useCallback, useState } from 'react';

/**
 * Codes renvoyés par l'API quand un nom est déjà pris mais que la création
 * reste possible en confirmant. Le 1er appel est refusé et pose une clé de
 * confirmation côté API ; un 2e appel **identique** est accepté.
 *
 * D'où la mécanique de ce hook : on mémorise la requête telle quelle pour
 * pouvoir la rejouer à l'octet près depuis la boîte de dialogue. Reconstruire
 * un payload différent ferait repartir le cycle de confirmation à zéro.
 */
const DUPLICATE_RETRY_LABELS: Record<string, string> = {
  product_name_already_exists_with_retry: 'Un produit porte déjà ce nom.',
  component_name_already_exists_with_retry: 'Un ingrédient porte déjà ce nom.',
  attribute_name_already_exists_with_retry: 'Un attribut de configuration porte déjà ce nom.',
};

const getApiErrorStatus = (error: unknown): string | undefined => {
  if (!(error instanceof Error)) return undefined;
  const body = (error as { responseBody?: unknown }).responseBody;
  if (body && typeof body === 'object' && 'status' in body) {
    const status = (body as { status?: unknown }).status;
    return typeof status === 'string' ? status : undefined;
  }
  return undefined;
};

export interface PendingDuplicateConfirmation {
  message: string;
  retry: () => Promise<unknown>;
}

export interface DuplicateNameDialogProps {
  pending: PendingDuplicateConfirmation | null;
  isConfirming: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

/**
 * Exécute une création et, si l'API demande de confirmer un nom en doublon,
 * propose de rejouer la même requête au lieu d'échouer silencieusement.
 *
 * `runWithDuplicateConfirm` retourne true si l'opération a abouti, false si
 * elle est en attente de confirmation. Les autres erreurs sont propagées à
 * l'appelant (apiClient a déjà affiché le message correspondant).
 */
export const useDuplicateNameConfirm = () => {
  const [pending, setPending] = useState<PendingDuplicateConfirmation | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const runWithDuplicateConfirm = useCallback(async (submit: () => Promise<unknown>) => {
    try {
      await submit();
      return true;
    } catch (error) {
      const status = getApiErrorStatus(error);
      const message = status ? DUPLICATE_RETRY_LABELS[status] : undefined;
      if (!message) throw error;

      setPending({ message, retry: submit });
      return false;
    }
  }, []);

  const onConfirm = useCallback(async () => {
    if (!pending) return;
    setIsConfirming(true);
    try {
      await pending.retry();
      setPending(null);
    } catch {
      // Second refus (clé de confirmation expirée, ou autre erreur) : apiClient
      // a déjà affiché le message, on referme pour rendre la main au formulaire.
      setPending(null);
    } finally {
      setIsConfirming(false);
    }
  }, [pending]);

  const onDismiss = useCallback(() => {
    if (isConfirming) return;
    setPending(null);
  }, [isConfirming]);

  return {
    runWithDuplicateConfirm,
    duplicateDialogProps: { pending, isConfirming, onConfirm, onDismiss } as DuplicateNameDialogProps,
  };
};
