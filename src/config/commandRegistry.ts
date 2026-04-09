import { navigationConfig } from './navigationConfig';
import { Search, Settings, LogOut, Moon, Sun, FileText, Plus, AlertTriangle, LayoutGrid } from 'lucide-react';
import { SVGProps } from 'react';

export type IconComponent = React.ComponentType<SVGProps<SVGSVGElement>>;

export type CommandAction = 
  | { type: 'navigate'; path: string }
  | { type: 'callback'; name: string };

export interface CommandRegistry {
  id: string;
  label: string;
  description?: string;
  category: 'Navigation' | 'Settings' | 'Actions' | 'System';
  icon: IconComponent;
  keywords: string[];
  action: CommandAction;
}

/**
 * Auto-generated navigation commands from navigationConfig
 * Extracts all navigation items and creates commands with automatic keywords
 */
const generateNavigationCommands = (): CommandRegistry[] => {
  const commands: CommandRegistry[] = [];

  navigationConfig.forEach((item) => {
    // Add main item if it has a path
    if (item.path) {
      commands.push({
        id: `nav-${item.id}`,
        label: item.label,
        category: 'Navigation',
        icon: item.icon,
        keywords: [item.label.toLowerCase(), item.id.toLowerCase()],
        action: {
          type: 'navigate' as const,
          path: item.path,
        },
      });
    }

    // Add subitems
    item.subItems?.forEach((subItem) => {
      commands.push({
        id: `nav-${subItem.id}`,
        label: subItem.label,
        description: `→ ${item.label}`,
        category: 'Navigation',
        icon: subItem.icon,
        keywords: [
          subItem.label.toLowerCase(),
          subItem.id.toLowerCase(),
          item.label.toLowerCase(),
        ],
        action: {
          type: 'navigate' as const,
          path: subItem.path,
        },
      });
    });
  });

  return commands;
};

/**
 * Manual commands for non-navigation actions
 * Add specific keywords and custom actions here
 */
const manualCommands: CommandRegistry[] = [
  {
    id: 'action-create-product',
    label: 'Créer un produit',
    description: 'Ouvrir le formulaire de création de produit',
    category: 'Actions',
    icon: Plus,
    keywords: ['créer', 'create', 'nouveau', 'new', 'produit', 'product'],
    action: {
      type: 'callback' as const,
      name: 'openCreateProductSheet',
    },
  },
  {
    id: 'action-organize-menu',
    label: 'Vue caisse',
    description: 'Afficher la vue caisse pour organiser les produits',
    category: 'Actions',
    icon: LayoutGrid,
    keywords: ['vue', 'caisse', 'organization', 'organize', 'arrangement', 'disposition', 'layout'],
    action: {
      type: 'callback' as const,
      name: 'openOrganizeModal',
    },
  },
  {
    id: 'action-stock-shortage',
    label: 'Rupture de stock',
    description: 'Aller vers la gestion des ingrédients',
    category: 'Actions',
    icon: AlertTriangle,
    keywords: ['rupture', 'stock', 'shortage', 'ingrédient', 'ingredient', 'component'],
    action: {
      type: 'navigate' as const,
      path: '/menu/components',
    },
  },
  {
    id: 'setting-theme',
    label: 'Activer mode sombre',
    description: 'Basculer entre le mode clair et sombre',
    category: 'Settings',
    icon: Moon,
    keywords: ['sombre', 'dark', 'mode', 'thème', 'theme', 'dark-mode'],
    action: {
      type: 'callback' as const,
      name: 'toggleTheme',
    },
  },
  {
    id: 'action-logout',
    label: 'Déconnexion',
    description: 'Se déconnecter de votre compte',
    category: 'System',
    icon: LogOut,
    keywords: ['déconnexion', 'logout', 'quitter', 'exit', 'sign out'],
    action: {
      type: 'callback' as const,
      name: 'logout',
    },
  },
];

/**
 * Combined registry: auto-generated navigation + manual commands
 * Total registry includes both route-based and callback-based actions
 */
export const commandRegistry: CommandRegistry[] = [
  ...generateNavigationCommands(),
  ...manualCommands,
];

/**
 * Category order for grouping in UI
 */
export const commandCategories = ['Navigation', 'Actions', 'Settings', 'System'] as const;
