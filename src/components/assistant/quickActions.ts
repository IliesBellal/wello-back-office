/**
 * Actions rapides de l'accueil de l'assistant : la barre d'actions rapides du
 * tableau de bord, accessible partout et sur mobile. Chaque tuile lance une
 * intention du modèle ; une tuile dont l'intention n'est pas autorisée pour
 * l'utilisateur (droits, page invisible) n'est pas affichée.
 */
import { AlertTriangle, CalendarDays, CreditCard, PackageX, Plus, TrendingUp, type LucideIcon } from 'lucide-react';

export interface QuickAction {
  id: string;
  intentKey: string;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  /** Classes de la pastille d'icône (teinte claire + icône saturée, clair/sombre). */
  tint: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'rupture',
    intentKey: 'menu.product.out_of_stock',
    label: 'Marquer une rupture',
    sublabel: 'Retirer un produit de la vente',
    icon: AlertTriangle,
    tint: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  {
    id: 'create-product',
    intentKey: 'menu.product.create',
    label: 'Créer un produit',
    sublabel: 'Ajouter un plat à la carte',
    icon: Plus,
    tint: 'bg-primary/10 text-primary',
  },
  {
    id: 'planning',
    intentKey: 'info.staff_on_shift',
    label: 'Planning du jour',
    sublabel: 'Qui travaille aujourd’hui',
    icon: CalendarDays,
    tint: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  },
  {
    id: 'registers',
    intentKey: 'nav.cash-registers-history',
    label: 'Caisses du jour',
    sublabel: 'Registres et clôtures',
    icon: CreditCard,
    tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  {
    id: 'revenue',
    intentKey: 'info.revenue',
    label: 'CA du jour',
    sublabel: 'Ventes, commandes, panier',
    icon: TrendingUp,
    tint: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  },
  {
    id: 'out-of-stock',
    intentKey: 'info.out_of_stock_list',
    label: 'Ruptures en cours',
    sublabel: 'Produits indisponibles',
    icon: PackageX,
    tint: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  },
];
