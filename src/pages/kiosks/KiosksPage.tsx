import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer, ConfirmDialog } from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MonitorSmartphone, MoreHorizontal, Pencil, Power, PowerOff, Ban, Trash2, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { qk } from '@/lib/queryKeys';
import { kioskService } from '@/services/kioskService';
import { KioskFormSheet } from '@/components/settings/kiosks/KioskFormSheet';
import { EnrollmentCodeDialog } from '@/components/settings/kiosks/EnrollmentCodeDialog';
import { KioskStatusBadge } from '@/components/settings/kiosks/KioskStatusBadge';
import type { EnrollmentCode, KioskEntry } from '@/types/kiosks';

type PendingAction =
  | { type: 'toggle'; kiosk: KioskEntry }
  | { type: 'revoke'; kiosk: KioskEntry }
  | { type: 'delete-code'; code: EnrollmentCode }
  | null;

const formatLastSeen = (value: string | null): string => {
  if (!value) return '—';
  return formatDistanceToNow(parseISO(value), { addSuffix: true, locale: fr });
};

const formatDate = (value: string): string => {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
};

export default function KiosksPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<KioskEntry | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const { data: kiosks = [], isLoading } = useQuery({
    queryKey: qk.kiosks.all,
    queryFn: () => kioskService.getKiosks(),
  });

  const { data: enrollmentCodes = [] } = useQuery({
    queryKey: qk.kiosks.enrollmentCodes,
    queryFn: () => kioskService.listEnrollmentCodes(),
  });

  const pendingCodes = enrollmentCodes.filter(
    (code) => !code.used_at && new Date(code.expires_at).getTime() > Date.now(),
  );

  const toggleMutation = useMutation({
    mutationFn: (kiosk: KioskEntry) =>
      kiosk.enabled ? kioskService.disableKiosk(kiosk.id) : kioskService.enableKiosk(kiosk.id),
    onSuccess: (_, kiosk) => {
      toast({ title: kiosk.enabled ? 'Borne désactivée' : 'Borne activée' });
      queryClient.invalidateQueries({ queryKey: qk.kiosks.all });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: "Impossible de modifier l'état de la borne.",
        variant: 'destructive',
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => kioskService.revokeKiosk(id),
    onSuccess: () => {
      toast({ title: 'Borne révoquée' });
      queryClient.invalidateQueries({ queryKey: qk.kiosks.all });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de révoquer la borne.',
        variant: 'destructive',
      });
    },
  });

  const deleteCodeMutation = useMutation({
    mutationFn: (id: string) => kioskService.deleteEnrollmentCode(id),
    onSuccess: () => {
      toast({ title: 'Code supprimé' });
      queryClient.invalidateQueries({ queryKey: qk.kiosks.enrollmentCodes });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le code.',
        variant: 'destructive',
      });
    },
  });

  const handleRename = (kiosk: KioskEntry) => {
    setEditingKiosk(kiosk);
    setFormOpen(true);
  };

  const handleConfirmPendingAction = async () => {
    if (!pendingAction) return;

    if (pendingAction.type === 'toggle') {
      await toggleMutation.mutateAsync(pendingAction.kiosk);
    } else if (pendingAction.type === 'revoke') {
      await revokeMutation.mutateAsync(pendingAction.kiosk.id);
    } else {
      await deleteCodeMutation.mutateAsync(pendingAction.code.id);
    }

    setPendingAction(null);
  };

  const confirmDialogProps = (() => {
    if (!pendingAction) {
      return { title: '', description: '', isDangerous: false, isLoading: false };
    }

    if (pendingAction.type === 'toggle') {
      const { kiosk } = pendingAction;
      return {
        title: kiosk.enabled ? 'Désactiver la borne' : 'Activer la borne',
        description: kiosk.enabled
          ? `Désactiver la borne "${kiosk.name}" ? Elle ne pourra plus prendre de commandes.`
          : `Activer la borne "${kiosk.name}" ?`,
        isDangerous: kiosk.enabled,
        isLoading: toggleMutation.isPending,
      };
    }

    if (pendingAction.type === 'revoke') {
      return {
        title: 'Révoquer la borne',
        description: `Cette action est irréversible. La borne "${pendingAction.kiosk.name}" sera déconnectée immédiatement.`,
        isDangerous: true,
        isLoading: revokeMutation.isPending,
      };
    }

    return {
      title: "Supprimer le code d'enrôlement",
      description: 'Ce code ne pourra plus être utilisé pour enrôler une borne.',
      isDangerous: true,
      isLoading: deleteCodeMutation.isPending,
    };
  })();

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-3xl font-bold text-foreground">Mes bornes</h1>
            <Button className="bg-gradient-primary" onClick={() => setEnrollmentDialogOpen(true)}>
              <KeyRound className="w-4 h-4 mr-2" />
              Générer un code d'enrôlement
            </Button>
          </div>
        }
        description="Gérez vos bornes de commande en libre-service"
      >
        {isLoading ? (
          <p className="text-muted-foreground">Chargement des bornes...</p>
        ) : kiosks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <MonitorSmartphone className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">Aucune borne enrôlée</p>
            <Button onClick={() => setEnrollmentDialogOpen(true)}>
              <KeyRound className="w-4 h-4 mr-2" />
              Générer un premier code d'enrôlement
            </Button>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Matériel</TableHead>
                  <TableHead>Version app</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kiosks.map((kiosk) => (
                  <TableRow key={kiosk.id}>
                    <TableCell className="font-medium">{kiosk.name}</TableCell>
                    <TableCell>
                      <KioskStatusBadge status={kiosk.status} />
                    </TableCell>
                    <TableCell className={kiosk.hardware_model ? '' : 'text-muted-foreground'}>
                      {kiosk.hardware_model ?? '—'}
                    </TableCell>
                    <TableCell className={kiosk.app_version ? '' : 'text-muted-foreground'}>
                      {kiosk.app_version ?? '—'}
                    </TableCell>
                    <TableCell className={kiosk.last_heartbeat_at ? 'text-sm' : 'text-sm text-muted-foreground'}>
                      {formatLastSeen(kiosk.last_heartbeat_at)}
                    </TableCell>
                    <TableCell className={kiosk.last_ip ? 'text-sm' : 'text-sm text-muted-foreground'}>
                      {kiosk.last_ip ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRename(kiosk)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Renommer
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPendingAction({ type: 'toggle', kiosk })}>
                            {kiosk.enabled ? (
                              <PowerOff className="w-4 h-4 mr-2" />
                            ) : (
                              <Power className="w-4 h-4 mr-2" />
                            )}
                            {kiosk.enabled ? 'Désactiver' : 'Activer'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={kiosk.status === 'revoked'}
                            onClick={() => setPendingAction({ type: 'revoke', kiosk })}
                          >
                            <Ban className="w-4 h-4 mr-2" />
                            Révoquer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {pendingCodes.length > 0 && (
          <div className="mt-8 space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Codes en attente</h2>
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Expire le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="text-sm">{formatDate(code.created_at)}</TableCell>
                      <TableCell className="text-sm">{formatDate(code.expires_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingAction({ type: 'delete-code', code })}
                          title="Révoquer le code"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </PageContainer>

      <KioskFormSheet open={formOpen} onOpenChange={setFormOpen} kiosk={editingKiosk} />

      <EnrollmentCodeDialog open={enrollmentDialogOpen} onOpenChange={setEnrollmentDialogOpen} />

      <ConfirmDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        title={confirmDialogProps.title}
        description={confirmDialogProps.description}
        isDangerous={confirmDialogProps.isDangerous}
        isLoading={confirmDialogProps.isLoading}
        onConfirm={handleConfirmPendingAction}
      />
    </DashboardLayout>
  );
}
