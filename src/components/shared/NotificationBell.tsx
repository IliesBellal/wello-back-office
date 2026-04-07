/**
 * NotificationBell
 *
 * Affiche une cloche avec badge de comptage et un popover listant les notifications.
 *
 * Catégories actuellement gérées :
 *  - STOCK_RUPTURE  : ruptures / stocks critiques
 *  - EMAIL_UNVERIFIED : email non vérifié
 *  - PHONE_UNVERIFIED : numéro de téléphone non vérifié
 *
 * TODO (future) :
 *  • Remplacer `mockStockRuptures` par les données venant de l'API dashboard
 *    (champ `alerts.low_stock_items` de GET /pos/stats/dashboard/summary)
 *  • Remplacer `email_verified` et `phone_verified` par les champs correspondants
 *    de l'objet `authData` retourné par l'API auth (ex. authData.email_verified,
 *    authData.phone_verified — à ajouter dans AuthData type quand disponibles)
 */

import { Bell, MailWarning, Phone, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { AuthData } from '@/types/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifType = 'STOCK_RUPTURE' | 'EMAIL_UNVERIFIED' | 'PHONE_UNVERIFIED';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  severity: 'warning' | 'info' | 'danger';
}

// ─── Mock / Derivation helpers ─────────────────────────────────────────────────

/**
 * TODO: Remplacer par `alerts.low_stock_items` provenant de l'API.
 * Renvoie la liste des noms de produits en rupture ou stock critique.
 */
const getMockStockRuptures = (): string[] => {
  // Simulé — plus tard : apiClient.get('/pos/stats/dashboard/summary').alerts.low_stock_items
  return ['Mozzarella', 'Entrecôte 300g', 'Tiramisu'];
};

/**
 * TODO: Remplacer par authData.email_verified (à ajouter dans AuthData) une
 * fois que le backend expose ce champ.
 */
const isEmailVerified = (_authData: AuthData): boolean => {
  // Simulé : toujours non vérifié pour la démo
  return false;
};

/**
 * TODO: Remplacer par authData.phone_verified (à ajouter dans AuthData) une
 * fois que le backend expose ce champ.
 */
const isPhoneVerified = (_authData: AuthData): boolean => {
  // Simulé : toujours non vérifié pour la démo
  return false;
};

// ─── Helpers UI ───────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<Notification['severity'], { icon: string; badge: string; bg: string }> = {
  danger:  { icon: 'text-red-600',    badge: 'bg-red-100 text-red-700',    bg: 'bg-red-50/60 border-red-100' },
  warning: { icon: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700',bg: 'bg-amber-50/60 border-amber-100' },
  info:    { icon: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700',  bg: 'bg-blue-50/50 border-blue-100' },
};

const NOTIF_ICONS: Record<NotifType, typeof Bell> = {
  STOCK_RUPTURE:    AlertTriangle,
  EMAIL_UNVERIFIED: MailWarning,
  PHONE_UNVERIFIED: Phone,
};

// ─── Component ────────────────────────────────────────────────────────────────

interface NotificationBellProps {
  authData: AuthData;
}

export const NotificationBell = ({ authData }: NotificationBellProps) => {
  // ── Construire la liste des notifications ──────────────────────────────────
  const notifications: Notification[] = [];

  // 1. Ruptures de stock
  const stockRuptures = getMockStockRuptures();
  if (stockRuptures.length > 0) {
    notifications.push({
      id: 'stock_rupture',
      type: 'STOCK_RUPTURE',
      title: `${stockRuptures.length} rupture${stockRuptures.length > 1 ? 's' : ''} de stock`,
      description: stockRuptures.join(', '),
      actionLabel: 'Voir les stocks',
      onAction: () => { window.location.href = '/stocks'; },
      severity: 'danger',
    });
  }

  // 2. Email non vérifié
  if (!isEmailVerified(authData)) {
    notifications.push({
      id: 'email_unverified',
      type: 'EMAIL_UNVERIFIED',
      title: 'Email non vérifié',
      description: `Vérifiez votre adresse ${authData.user_mail} pour sécuriser votre compte.`,
      actionLabel: 'Vérifier',
      onAction: () => { window.location.href = '/settings?tab=account'; },
      severity: 'warning',
    });
  }

  // 3. Téléphone non vérifié
  if (!isPhoneVerified(authData)) {
    notifications.push({
      id: 'phone_unverified',
      type: 'PHONE_UNVERIFIED',
      title: 'Numéro de téléphone non vérifié',
      description: 'Ajoutez et vérifiez votre numéro pour activer les alertes SMS.',
      actionLabel: 'Ajouter',
      onAction: () => { window.location.href = '/settings?tab=account'; },
      severity: 'info',
    });
  }

  const count = notifications.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl relative"
          aria-label={`Notifications${count > 0 ? ` (${count})` : ''}`}
        >
          <Bell className="w-4 h-4" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground leading-none">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[340px] p-0 shadow-lg rounded-2xl overflow-hidden">
        {/* En-tête */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-foreground" />
            <span className="text-sm font-semibold text-foreground">Notifications</span>
          </div>
          {count > 0 && (
            <Badge variant="secondary" className="text-xs rounded-full px-2">
              {count}
            </Badge>
          )}
        </div>

        {/* Liste */}
        {count === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center px-4">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <p className="text-sm font-medium text-foreground">Tout est en ordre !</p>
            <p className="text-xs text-muted-foreground">Aucune notification pour le moment.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="p-2 space-y-2">
              {notifications.map((notif) => {
                const Icon = NOTIF_ICONS[notif.type];
                const styles = SEVERITY_STYLES[notif.severity];
                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-xl border transition-colors',
                      styles.bg
                    )}
                  >
                    {/* Icône */}
                    <div className={cn('mt-0.5 shrink-0', styles.icon)}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {notif.description}
                      </p>
                      {notif.actionLabel && notif.onAction && (
                        <button
                          onClick={notif.onAction}
                          className={cn(
                            'inline-flex items-center gap-0.5 mt-1.5 text-xs font-semibold hover:underline',
                            styles.icon
                          )}
                        >
                          {notif.actionLabel}
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
};
