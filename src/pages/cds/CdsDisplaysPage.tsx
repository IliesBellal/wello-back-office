import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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
import { Tv, MoreHorizontal, Pencil, Ban, Trash2, KeyRound, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { qk } from '@/lib/queryKeys';
import { cdsService, CdsApiException } from '@/services/cdsService';
import { CdsRenameSheet } from '@/components/settings/cds/CdsRenameSheet';
import { CdsEnrollmentCodeDialog } from '@/components/settings/cds/CdsEnrollmentCodeDialog';
import { CdsStatusBadge } from '@/components/settings/cds/CdsStatusBadge';
import type { CdsDisplay, CdsEnrollmentCode } from '@/types/cds';

type PendingAction =
  | { type: 'revoke'; display: CdsDisplay }
  | { type: 'delete-code'; code: CdsEnrollmentCode }
  | null;

const formatLastSeen = (value: string | null): string => {
  if (!value) return '—';
  return formatDistanceToNow(parseISO(value), { addSuffix: true, locale: fr });
};

const formatDate = (value: string): string => {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
};

export default function CdsDisplaysPage() {
  const { canManageCds } = usePermissions();

  // Gate en wrapper mince : le retour anticipé ne doit jamais se glisser
  // entre deux appels de hooks du composant de contenu.
  if (!canManageCds) {
    return <Navigate to="/" replace />;
  }

  return <CdsDisplaysPageContent />;
}

function CdsDisplaysPageContent() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [editingDisplay, setEditingDisplay] = useState<CdsDisplay | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const { data, isLoading } = useQuery({
    queryKey: qk.cds.displays,
    queryFn: () => cdsService.listDisplays(),
  });

  const displays = data?.displays ?? [];
  const activeUsed = data?.active_used ?? 0;
  const activeMax = data?.active_max ?? 0;
  // Le plafond vient du serveur, jamais d'une constante dupliquée ici : c'est
  // lui qui refuse la génération, le front ne fait qu'anticiper son verdict.
  const capReached = activeMax > 0 && activeUsed >= activeMax;

  const { data: enrollmentCodes = [] } = useQuery({
    queryKey: qk.cds.enrollmentCodes,
    queryFn: () => cdsService.listEnrollmentCodes(),
  });

  const pendingCodes = enrollmentCodes.filter(
    (code) => !code.used_at && new Date(code.expires_at).getTime() > Date.now(),
  );

  const revokeMutation = useMutation({
    mutationFn: (displayId: string) => cdsService.revokeDisplay(displayId),
    onSuccess: () => {
      toast({ title: 'Écran révoqué' });
      queryClient.invalidateQueries({ queryKey: qk.cds.displays });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description:
          error instanceof CdsApiException ? error.message : "Impossible de révoquer l'écran.",
        variant: 'destructive',
      });
    },
  });

  const deleteCodeMutation = useMutation({
    mutationFn: (codeId: string) => cdsService.deleteEnrollmentCode(codeId),
    onSuccess: () => {
      toast({ title: 'Code supprimé' });
      queryClient.invalidateQueries({ queryKey: qk.cds.enrollmentCodes });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le code.',
        variant: 'destructive',
      });
    },
  });

  const handleAddDisplay = () => {
    // Message explicite plutôt que bouton muet : sans cela, le restaurateur
    // clique et ne comprend pas pourquoi rien ne se passe (décisions D4/D15).
    if (capReached) {
      toast({
        title: "Limite d'écrans atteinte",
        description: `Vous utilisez ${activeUsed} écran(s) sur ${activeMax}. Révoquez un écran existant pour en ajouter un nouveau.`,
        variant: 'destructive',
      });
      return;
    }
    setEnrollmentDialogOpen(true);
  };

  const handleConfirmPendingAction = async () => {
    if (!pendingAction) return;

    if (pendingAction.type === 'revoke') {
      await revokeMutation.mutateAsync(pendingAction.display.display_id);
    } else {
      await deleteCodeMutation.mutateAsync(pendingAction.code.id);
    }

    setPendingAction(null);
  };

  const confirmDialogProps = (() => {
    if (!pendingAction) {
      return { title: '', description: '', isDangerous: false, isLoading: false };
    }

    if (pendingAction.type === 'revoke') {
      return {
        title: "Révoquer l'écran",
        description: `Cette action est irréversible. L'écran "${pendingAction.display.name}" sera déconnecté immédiatement et devra être ré-enrôlé avec un nouveau code. Sa place se libère pour un autre écran.`,
        isDangerous: true,
        isLoading: revokeMutation.isPending,
      };
    }

    return {
      title: "Supprimer le code d'enrôlement",
      description: 'Ce code ne pourra plus être utilisé pour enrôler un écran.',
      isDangerous: true,
      isLoading: deleteCodeMutation.isPending,
    };
  })();

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">Mes écrans</h1>
              {activeMax > 0 && (
                <span
                  className={
                    capReached
                      ? 'text-sm font-medium text-destructive'
                      : 'text-sm font-medium text-muted-foreground'
                  }
                >
                  {activeUsed} / {activeMax}
                </span>
              )}
            </div>
            <Button className="bg-gradient-primary" onClick={handleAddDisplay} disabled={capReached}>
              <KeyRound className="w-4 h-4 mr-2" />
              Ajouter un écran
            </Button>
          </div>
        }
        description="Gérez vos écrans d'affichage client (commandes en préparation et prêtes)"
      >
        {capReached && (
          <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">
              Limite de {activeMax} écrans atteinte. Révoquez un écran existant pour en ajouter un
              nouveau.
            </p>
          </div>
        )}

        {isLoading ? (
          <p className="text-muted-foreground">Chargement des écrans...</p>
        ) : displays.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <Tv className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun écran enrôlé</p>
            <Button onClick={handleAddDisplay}>
              <KeyRound className="w-4 h-4 mr-2" />
              Ajouter un premier écran
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
                {displays.map((display) => (
                  <TableRow key={display.display_id}>
                    <TableCell className="font-medium">{display.name}</TableCell>
                    <TableCell>
                      <CdsStatusBadge status={display.status} />
                    </TableCell>
                    <TableCell className={display.hardware_model ? '' : 'text-muted-foreground'}>
                      {display.hardware_model ?? '—'}
                    </TableCell>
                    <TableCell className={display.app_version ? '' : 'text-muted-foreground'}>
                      {display.app_version ?? '—'}
                    </TableCell>
                    <TableCell
                      className={display.last_heartbeat_at ? 'text-sm' : 'text-sm text-muted-foreground'}
                    >
                      {formatLastSeen(display.last_heartbeat_at)}
                    </TableCell>
                    <TableCell className={display.last_ip ? 'text-sm' : 'text-sm text-muted-foreground'}>
                      {display.last_ip ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/*
                            Les paramètres sont par écran (décision D2) : on y
                            entre depuis la ligne, pas depuis une page globale.
                          */}
                          <DropdownMenuItem
                            disabled={display.status === 'revoked'}
                            onClick={() => navigate(`/cds/displays/${display.display_id}/settings`)}
                          >
                            <Settings2 className="w-4 h-4 mr-2" />
                            Configurer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingDisplay(display);
                              setRenameOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Renommer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={display.status === 'revoked'}
                            onClick={() => setPendingAction({ type: 'revoke', display })}
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
                    <TableHead>Nom</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Expire le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className={code.name ? 'text-sm font-medium' : 'text-sm text-muted-foreground'}>
                        {code.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(code.created_at)}</TableCell>
                      <TableCell className="text-sm">{formatDate(code.expires_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingAction({ type: 'delete-code', code })}
                          title="Supprimer le code"
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

      <CdsRenameSheet open={renameOpen} onOpenChange={setRenameOpen} display={editingDisplay} />

      <CdsEnrollmentCodeDialog open={enrollmentDialogOpen} onOpenChange={setEnrollmentDialogOpen} />

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
