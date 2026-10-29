import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { qk } from "@/lib/queryKeys";
import { kioskService } from "@/services/kioskService";
import { CdsMediaDurationField } from "@/components/settings/cds/CdsMediaDurationField";
import {
  kioskMarketingMediaKindLabels,
  type KioskMarketingMedia,
  type KioskMarketingMediaKind,
} from "@/types/kiosks";

const KIND_ICON: Record<KioskMarketingMediaKind, typeof ImageIcon> = {
  image: ImageIcon,
  video: Video,
};

interface KioskMarketingRotationProps {
  /**
   * Durée par défaut telle que SAISIE dans le formulaire (donc éventuellement
   * pas encore enregistrée) : la modifier met la liste à jour en direct.
   */
  defaultDuration: number;
}

const formatLoop = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} s`;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
};

/**
 * Rotation du ruban marketing des bornes de commande : images et vidéos
 * affichées en haut de l'écran de menu. Même ergonomie que la rotation du
 * CDS, sans QR code.
 */
export function KioskMarketingRotation({ defaultDuration }: KioskMarketingRotationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const { data: media = [], isLoading } = useQuery({
    queryKey: qk.kiosks.marketingMedia,
    queryFn: () => kioskService.listMarketingMedia(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.kiosks.marketingMedia });

  const onMutationError = (fallback: string) => (error: unknown) => {
    toast({
      title: "Erreur",
      description: error instanceof Error && error.message ? error.message : fallback,
      variant: "destructive",
    });
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => kioskService.uploadMarketingMedia(file),
    onSuccess: () => {
      toast({ title: "Média ajouté" });
      invalidate();
    },
    onError: onMutationError("Impossible d'ajouter ce média."),
  });

  const durationMutation = useMutation({
    mutationFn: ({ mediaId, seconds }: { mediaId: string; seconds: number | null }) =>
      kioskService.updateMarketingMediaDuration(mediaId, seconds),
    onSuccess: invalidate,
    onError: onMutationError("Impossible de modifier la durée."),
  });

  const resetAllMutation = useMutation({
    mutationFn: () => kioskService.resetMarketingMediaDurations(),
    onSuccess: ({ reset }) => {
      toast({
        title: "Durées réinitialisées",
        description:
          reset === 0
            ? "Aucun média n'avait de durée personnalisée."
            : `${reset} média${reset > 1 ? "s suivent" : " suit"} désormais la durée par défaut.`,
      });
      setConfirmResetOpen(false);
      invalidate();
    },
    onError: onMutationError("Impossible de réinitialiser les durées."),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => kioskService.reorderMarketingMedia(orderedIds),
    onSuccess: invalidate,
    onError: onMutationError("Impossible de réordonner la rotation."),
  });

  const deleteMutation = useMutation({
    mutationFn: (mediaId: string) => kioskService.deleteMarketingMedia(mediaId),
    onSuccess: () => {
      toast({ title: "Média supprimé" });
      invalidate();
    },
    onError: onMutationError("Impossible de supprimer ce média."),
  });

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= media.length) return;
    const reordered = [...media];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    reorderMutation.mutate(reordered.map((item) => item.id));
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    // Permet de resélectionner le même fichier après une erreur.
    event.target.value = "";
  };

  const describeMedia = (item: KioskMarketingMedia): string =>
    item.url.split("/").pop()?.split("?")[0] ?? "";

  const timedItems = media.filter((item) => item.kind !== "video");
  const videoCount = media.length - timedItems.length;
  const loopSeconds = timedItems.reduce(
    (total, item) => total + (item.custom_duration ? item.duration_seconds : defaultDuration),
    0,
  );
  const customCount = timedItems.filter((item) => item.custom_duration).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          className="hidden"
          onChange={handleFileSelected}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Ajouter une image ou une vidéo
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Les médias défilent en boucle dans l'ordre ci-dessous. Une vidéo est jouée en entier et sans son ; une image
        s'affiche pendant sa durée. Images : 5 Mo max. Vidéos : 50 Mo max. 20 médias au maximum.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement des médias...</p>
      ) : media.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun média. Le ruban restera masqué sur les bornes de commande.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {media.map((item, index) => {
              const Icon = KIND_ICON[item.kind];
              const isSaving =
                durationMutation.isPending && durationMutation.variables?.mediaId === item.id;

              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3"
                >
                  <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate text-sm font-medium">{describeMedia(item)}</p>
                    <p className="text-xs text-muted-foreground">{kioskMarketingMediaKindLabels[item.kind]}</p>
                  </div>

                  {item.kind === "video" ? (
                    <span className="text-xs text-muted-foreground">Lecture complète</span>
                  ) : (
                    <CdsMediaDurationField
                      value={item.custom_duration ? item.duration_seconds : null}
                      defaultValue={defaultDuration}
                      disabled={isSaving}
                      onCommit={(seconds) => durationMutation.mutate({ mediaId: item.id, seconds })}
                    />
                  )}

                  <Badge variant="outline">{index + 1}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0 || reorderMutation.isPending}
                    onClick={() => move(index, -1)}
                    title="Monter"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === media.length - 1 || reorderMutation.isPending}
                    onClick={() => move(index, 1)}
                    title="Descendre"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(item.id)}
                    disabled={deleteMutation.isPending}
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Un tour complet : <strong className="text-foreground">{formatLoop(loopSeconds)}</strong>
              {videoCount > 0 &&
                ` + ${videoCount} vidéo${videoCount > 1 ? "s" : ""} jouée${videoCount > 1 ? "s" : ""} en entier`}
            </p>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={customCount === 0 || resetAllMutation.isPending}
              onClick={() => setConfirmResetOpen(true)}
              title={
                customCount === 0
                  ? "Aucun média n'a de durée personnalisée"
                  : "Tous les médias suivront la durée par défaut"
              }
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Appliquer la durée par défaut à tous
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        title="Appliquer la durée par défaut à tous ?"
        description={`Les ${customCount} durée${customCount > 1 ? "s" : ""} personnalisée${customCount > 1 ? "s" : ""} ${customCount > 1 ? "seront effacées" : "sera effacée"} : chaque image suivra la durée par défaut (${defaultDuration} s). Cette action est irréversible.`}
        isDangerous
        isLoading={resetAllMutation.isPending}
        onConfirm={() => resetAllMutation.mutate()}
      />
    </div>
  );
}
