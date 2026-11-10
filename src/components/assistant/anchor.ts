/**
 * L'assistant est monté une seule fois au niveau de l'application (il garde
 * la conversation d'une page à l'autre) mais ne s'affiche que sur les pages du
 * back-office : DashboardLayout rend <AssistantAnchor />, qui signale sa
 * présence. Changer de page démonte puis remonte l'ancre dans le même rendu,
 * sans clignotement.
 */
import { useEffect, useSyncExternalStore } from 'react';

let count = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function AssistantAnchor(): null {
  useEffect(() => {
    count++;
    emit();
    return () => {
      count--;
      emit();
    };
  }, []);
  return null;
}

export function useAssistantAnchored(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => count > 0,
    () => false,
  );
}
