import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Loader2,
  QrCode,
  RotateCcw,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { qk } from "@/lib/queryKeys";
import { cdsService, CdsApiException } from "@/services/cdsService";
import { CdsMediaDurationField } from "./CdsMediaDurationField";
import {
  CDS_MEDIA_DURATION_MAX,
  CDS_MEDIA_DURATION_MIN,
  cdsMediaKindLabels,
  type CdsMediaItem,
  type CdsMediaKind,
} from "@/types/cds";

const KIND_ICON: Record<CdsMediaKind, typeof ImageIcon> = {
  image: ImageIcon,
  video: Video,
  qr: QrCode,
};

interface CdsMediaRotationProps {
  displayId: string;
  /**
   * Durée par défaut de l'écran, telle que SAISIE dans le formulaire (donc
   * éventuellement pas encore enregistrée). Sert à afficher la durée effective
   * des médias qui la suivent : la modifier met la liste à jour en direct.
   */
  defaultDuration: number;
}

const formatLoop = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} s`;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
};

export function CdsMediaRotation({
  displayId,
  defaultDuration,
}: CdsMediaRotationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrPayload, setQrPayload] = useState("");
  // Texte et non nombre : un champ vide veut dire « durée par défaut ».
  const [qrDuration, setQrDuration] = useState("");
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const { data: media = [], isLoading } = useQuery({
    queryKey: qk.cds.media(displayId),
    queryFn: () => cdsService.listMedia(displayId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: qk.cds.media(displayId) });

  const onMutationError = (fallback: string) => (error: unknown) => {
    toast({
      title: "Erreur",
      description: error instanceof CdsApiException ? error.message : fallback,
      variant: "destructive",
    });
  };

  // Un média ajouté suit la durée par défaut : c'est presque toujours ce que
  // veut un restaurateur qui enchaîne dix visuels d'une même campagne, et il
  // peut ensuite ajuster celui qui mérite plus de temps.
  const uploadMutation = useMutation({
    mutationFn: (file: File) => cdsService.uploadMedia(displayId, file),
    onSuccess: () => {
      toast({ title: "Média ajouté" });
      invalidate();
    },
    onError: onMutationError("Impossible d'ajouter ce média."),
  });

  const qrDurationValue =
    qrDuration.trim() === "" ? undefined : Math.round(Number(qrDuration));
  const qrDurationInvalid =
    qrDurationValue !== undefined &&
    (!Number.isFinite(qrDurationValue) ||
      qrDurationValue < CDS_MEDIA_DURATION_MIN ||
      qrDurationValue > CDS_MEDIA_DURATION_MAX);

  const createQrMutation = useMutation({
    mutationFn: () =>
      cdsService.createQrMedia(displayId, {
        kind: "qr",
        qr_payload: qrPayload.trim(),
        duration_seconds: qrDurationValue,
      }),
    onSuccess: () => {
      toast({ title: "QR code ajouté" });
      setQrDialogOpen(false);
      setQrPayload("");
      setQrDuration("");
      invalidate();
    },
    onError: onMutationError("Impossible d'ajouter ce QR code."),
  });

  const durationMutation = useMutation({
    mutationFn: ({
      mediaId,
      seconds,
    }: {
      mediaId: string;
      seconds: number | null;
    }) => cdsService.updateMediaDuration(displayId, mediaId, seconds),
    onSuccess: invalidate,
    onError: onMutationError("Impossible de modifier la durée."),
  });

  const resetAllMutation = useMutation({
    mutationFn: () => cdsService.resetMediaDurations(displayId),
    onSuccess: ({ reset }) => {
      toast({
        title: "Durées réinitialisées",
        description:
          reset === 0
            ? "Aucun média n’avait de durée personnalisée."
            : `${reset} média${reset > 1 ? "s suivent" : " suit"} désormais la durée par défaut.`,
      });
      setConfirmResetOpen(false);
      invalidate();
    },
    onError: onMutationError("Impossible de réinitialiser les durées."),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      cdsService.reorderMedia(displayId, orderedIds),
    onSuccess: invalidate,
    onError: onMutationError("Impossible de réordonner la rotation."),
  });

  const deleteMutation = useMutation({
    mutationFn: (mediaId: string) => cdsService.deleteMedia(displayId, mediaId),
    onSuccess: () => {
      toast({ title: "Média supprimé" });
      invalidate();
    },
    onError: onMutationError("Impossible de supprimer ce média."),
  });

  // Réordonnancement par flèches plutôt qu'en glisser-déposer : la liste
  // compte quelques éléments, et @dnd-kit exigerait un contexte de tri complet
  // pour un gain nul ici. À revoir si la rotation grossit.
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= media.length) return;

    const reordered = [...media];
    [reordered[index], reordered[target]] = [
      reordered[target],
      reordered[index],
    ];
    reorderMutation.mutate(reordered.map((item) => item.id));
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
    // Réinitialise l'input : sans cela, resélectionner le même fichier après
    // une erreur ne déclencherait aucun évènement `change`.
    event.target.value = "";
  };

  const describeMedia = (item: CdsMediaItem): string => {
    if (item.kind === "qr") return item.qr_payload ?? "";
    return item.url?.split("/").pop()?.split("?")[0] ?? "";
  };

  // Durée effective d'un média, avec la valeur SAISIE du défaut : la liste
  // reflète le formulaire en direct, avant même l'enregistrement.
  const effectiveDuration = (item: CdsMediaItem): number =>
    item.custom_duration ? item.duration_seconds : defaultDuration;

  const timedItems = media.filter((item) => item.kind !== "video");
  const videoCount = media.length - timedItems.length;
  const loopSeconds = timedItems.reduce(
    (total, item) => total + effectiveDuration(item),
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setQrDialogOpen(true)}
        >
          <QrCode className="w-4 h-4 mr-2" />
          Ajouter un QR code
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Les médias défilent en boucle dans l'ordre ci-dessous. Une vidéo est
        jouée en entier et sans son ; une image ou un QR code s'affiche pendant
        sa durée.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">
          Chargement des médias...
        </p>
      ) : media.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun média. Le bandeau restera vide et les zones de commandes
          occuperont tout l'écran.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {media.map((item, index) => {
              const Icon = KIND_ICON[item.kind];
              const isSaving =
                durationMutation.isPending &&
                durationMutation.variables?.mediaId === item.id;

              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3"
                >
                  <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate text-sm font-medium">
                      {describeMedia(item)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cdsMediaKindLabels[item.kind]}
                    </p>
                  </div>

                  {item.kind === "video" ? (
                    // Une vidéo n'a pas de durée réglable : elle est jouée en entier.
                    <span className="text-xs text-muted-foreground">
                      Lecture complète
                    </span>
                  ) : (
                    <CdsMediaDurationField
                      value={
                        item.custom_duration ? item.duration_seconds : null
                      }
                      defaultValue={defaultDuration}
                      disabled={isSaving}
                      onCommit={(seconds) =>
                        durationMutation.mutate({ mediaId: item.id, seconds })
                      }
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
                    disabled={
                      index === media.length - 1 || reorderMutation.isPending
                    }
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
            {/*
              Durée totale d'un tour : c'est ce que le restaurateur veut savoir
              pour juger si sa rotation est trop longue ou trop courte. Les
              vidéos sont jouées en entier, leur durée n'est pas connue ici.
            */}
            <p className="text-xs text-muted-foreground">
              Un tour complet :{" "}
              <strong className="text-foreground">
                {formatLoop(loopSeconds)}
              </strong>
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
                  ? "Aucun média n’a de durée personnalisée"
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
        description={`Les ${customCount} durée${customCount > 1 ? "s" : ""} personnalisée${customCount > 1 ? "s" : ""} ${customCount > 1 ? "seront effacées" : "sera effacée"} : chaque image et chaque QR code suivra la durée par défaut (${defaultDuration} s). Cette action est irréversible.`}
        isDangerous
        isLoading={resetAllMutation.isPending}
        onConfirm={() => resetAllMutation.mutate()}
      />

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un QR code</DialogTitle>
            <DialogDescription>
              Le contenu sera encodé en QR code et affiché dans la rotation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cds-qr-payload">Contenu (URL ou texte)</Label>
              <Input
                id="cds-qr-payload"
                value={qrPayload}
                onChange={(event) => setQrPayload(event.target.value)}
                placeholder="https://exemple.fr/notre-carte"
              />
              <p className="text-xs text-muted-foreground">
                Un lien court donne un QR code plus simple, donc plus lisible de
                loin.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cds-qr-duration">
                Durée d'affichage (secondes)
              </Label>
              <Input
                id="cds-qr-duration"
                type="number"
                min={CDS_MEDIA_DURATION_MIN}
                max={CDS_MEDIA_DURATION_MAX}
                value={qrDuration}
                placeholder={`Durée par défaut (${defaultDuration} s)`}
                onChange={(event) => setQrDuration(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Laissez vide pour suivre la durée par défaut. Un QR code mérite
                souvent plus de temps qu'une image : le temps de sortir son
                téléphone.
              </p>
              {qrDurationInvalid && (
                <p className="text-xs text-destructive">
                  La durée doit être comprise entre {CDS_MEDIA_DURATION_MIN} et{" "}
                  {CDS_MEDIA_DURATION_MAX} secondes.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQrDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => createQrMutation.mutate()}
              disabled={
                createQrMutation.isPending ||
                qrPayload.trim().length === 0 ||
                qrDurationInvalid
              }
            >
              {createQrMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
