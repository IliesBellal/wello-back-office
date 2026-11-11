/**
 * Navigation depuis l'assistant (demandes de page et liens des cartes).
 *
 * Sur mobile, le panneau plein écran cache la page : toute redirection le
 * referme aussitôt et affiche « Vous êtes sur … » avec un bouton pour revenir
 * à la conversation (conservée). Sur ordinateur, la bulle laisse voir la page :
 * rien ne change.
 */
import { createContext, useContext } from 'react';
import { NAV_ITEMS } from '@/config/navConfig';

export interface AssistantNavigation {
  /** Ouvre `path` ; `label` nomme la page dans le message de redirection. */
  go: (path: string, label?: string) => void;
}

export const AssistantNavContext = createContext<AssistantNavigation | null>(null);

export function useAssistantNavigation(): AssistantNavigation | null {
  return useContext(AssistantNavContext);
}

/** Titre d'une page d'après son chemin (navConfig), à défaut le chemin. */
export function pageTitleFor(path: string): string {
  const pathname = path.split('?')[0];
  for (const item of NAV_ITEMS) {
    if (item.href === pathname) return item.title;
    const child = item.children?.find((c) => c.href === pathname);
    if (child) return child.title;
  }
  return 'la page demandée';
}
