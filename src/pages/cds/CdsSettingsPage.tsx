import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageContainer } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, TriangleAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { qk } from "@/lib/queryKeys";
import { cdsService, CdsApiException } from "@/services/cdsService";
import { CdsMediaRotation } from "@/components/settings/cds/CdsMediaRotation";
import { CdsMediaFormatTips } from "@/components/settings/cds/CdsMediaFormatTips";
import {
  CDS_CHANNELS,
  CDS_MEDIA_DURATION_MAX,
  CDS_MEDIA_DURATION_MIN,
  CDS_MEDIA_DURATION_PRESETS,
  CDS_ORDER_TYPES,
  cdsChannelLabels,
  cdsLayoutHasMarketing,
  cdsLayoutModeLabels,
  cdsOrderTypeLabels,
  type CdsChannel,
  type CdsLayoutMode,
  type CdsOrderType,
  type CdsSettings,
} from "@/types/cds";

export default function CdsSettingsPage() {
  const { canManageCds } = usePermissions();
  const { displayId } = useParams<{ displayId: string }>();

  if (!canManageCds) {
    return <Navigate to="/" replace />;
  }
  if (!displayId) {
    return <Navigate to="/cds/displays" replace />;
  }

  return <CdsSettingsPageContent displayId={displayId} />;
}

function CdsSettingsPageContent({ displayId }: { displayId: string }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: display } = useQuery({
    queryKey: qk.cds.detail(displayId),
    queryFn: () => cdsService.getDisplay(displayId),
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: qk.cds.settings(displayId),
    queryFn: () => cdsService.getSettings(displayId),
  });

  // État local miroir : les filtres se manipulent case par case, on ne veut
  // pas un aller-retour serveur à chaque clic.
  const [draft, setDraft] = useState<CdsSettings | null>(null);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (payload: CdsSettings) =>
      cdsService.updateSettings(displayId, payload),
    onSuccess: () => {
      toast({ title: "Paramètres enregistrés" });
      queryClient.invalidateQueries({ queryKey: qk.cds.settings(displayId) });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description:
          error instanceof CdsApiException
            ? error.message
            : "Impossible d'enregistrer les paramètres.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !draft) {
    return (
      <DashboardLayout>
        <PageContainer
          header={<h1 className="text-3xl font-bold">Paramètres de l'écran</h1>}
        >
          <p className="text-muted-foreground">Chargement des paramètres...</p>
        </PageContainer>
      </DashboardLayout>
    );
  }

  const toggleOrderType = (type: CdsOrderType, checked: boolean) => {
    setDraft({
      ...draft,
      order_types: checked
        ? [...draft.order_types, type]
        : draft.order_types.filter((value) => value !== type),
    });
  };

  const toggleChannel = (channel: CdsChannel, checked: boolean) => {
    setDraft({
      ...draft,
      channels: checked
        ? [...draft.channels, channel]
        : draft.channels.filter((value) => value !== channel),
    });
  };

  // Un groupe vide n'affiche rien du tout : le combiner en ET avec l'autre
  // axe donne l'ensemble vide. On le dit plutôt que de laisser découvrir un
  // écran noir en plein service.
  const noOrderType = draft.order_types.length === 0;
  const noChannel = draft.channels.length === 0;
  const showsNothing = noOrderType || noChannel;

  const hasMarketing = cdsLayoutHasMarketing(draft.layout_mode);
  const defaultDurationValid =
    Number.isInteger(draft.default_media_duration_seconds) &&
    draft.default_media_duration_seconds >= CDS_MEDIA_DURATION_MIN &&
    draft.default_media_duration_seconds <= CDS_MEDIA_DURATION_MAX;

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/cds/displays")}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-3xl font-bold text-foreground">
                {display?.name ?? "Paramètres de l'écran"}
              </h1>
            </div>
            <Button
              className="bg-gradient-primary"
              onClick={() => mutation.mutate(draft)}
              disabled={mutation.isPending || !defaultDurationValid}
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enregistrer
            </Button>
          </div>
        }
        description="Ces réglages ne concernent que cet écran"
      >
        <div className="space-y-6">
          {/* ─── Filtre d'affichage ─────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Commandes affichées</CardTitle>
              <CardDescription>
                Les deux filtres se combinent : une commande apparaît si son
                type <strong>et</strong> sa source sont cochés. Vous pouvez
                ainsi dédier un écran aux livreurs et un autre aux clients du
                comptoir.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">
                    Types de commande
                  </Label>
                  {CDS_ORDER_TYPES.map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <Checkbox
                        id={`cds-type-${type}`}
                        checked={draft.order_types.includes(type)}
                        onCheckedChange={(checked) =>
                          toggleOrderType(type, checked === true)
                        }
                      />
                      <Label
                        htmlFor={`cds-type-${type}`}
                        className="font-normal cursor-pointer"
                      >
                        {cdsOrderTypeLabels[type]}
                      </Label>
                    </div>
                  ))}
                  {noOrderType && (
                    <p className="text-xs text-destructive">
                      Aucun type sélectionné.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Sources</Label>
                  {CDS_CHANNELS.map((channel) => (
                    <div key={channel} className="flex items-center gap-2">
                      <Checkbox
                        id={`cds-channel-${channel}`}
                        checked={draft.channels.includes(channel)}
                        onCheckedChange={(checked) =>
                          toggleChannel(channel, checked === true)
                        }
                      />
                      <Label
                        htmlFor={`cds-channel-${channel}`}
                        className="font-normal cursor-pointer"
                      >
                        {cdsChannelLabels[channel]}
                      </Label>
                    </div>
                  ))}
                  {noChannel && (
                    <p className="text-xs text-destructive">
                      Aucune source sélectionnée.
                    </p>
                  )}
                </div>
              </div>

              {showsNothing ? (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <TriangleAlert className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">
                    Avec ces réglages, l'écran n'affichera aucune commande.
                    Cochez au moins un type et une source.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {draft.order_types.length} type(s) × {draft.channels.length}{" "}
                  source(s)
                </p>
              )}
            </CardContent>
          </Card>

          {/* ─── Affichage ──────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Affichage</CardTitle>
              <CardDescription>
                Répartition des zones de commandes et informations affichées.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>
                  Part des commandes pour « En préparation » —{" "}
                  {draft.preparing_zone_ratio} %
                </Label>
                <Slider
                  className="max-w-md"
                  min={20}
                  max={60}
                  step={5}
                  value={[draft.preparing_zone_ratio]}
                  onValueChange={([value]) =>
                    setDraft({ ...draft, preparing_zone_ratio: value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Le reste revient à la zone « Prêt », qui doit rester la plus
                  lisible de loin.
                </p>
              </div>

              <div className="flex items-start justify-between gap-4 max-w-2xl">
                <div className="space-y-1">
                  <Label htmlFor="cds-wait-time">
                    Afficher le temps d'attente restant
                  </Label>
                  {/*
                    Le ton de cette aide est volontaire : estimated_ready est
                    figé à la création de la commande et jamais recalculé. Le
                    restaurateur doit savoir ce qu'il active.
                  */}
                  <p className="text-xs text-muted-foreground">
                    Estimation calculée à la prise de commande, arrondie à 5
                    minutes et jamais réévaluée ensuite. Au-delà de l'heure
                    prévue, l'écran affiche « Bientôt prêt ». Les commandes sans
                    estimation n'affichent aucun minuteur.
                  </p>
                </div>
                <Switch
                  id="cds-wait-time"
                  checked={draft.show_wait_time}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, show_wait_time: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* ─── Bandeau marketing ──────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Bandeau marketing</CardTitle>
              <CardDescription>
                Position du bandeau, durée d'affichage et contenu de la
                rotation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="cds-layout">Disposition</Label>
                {/*
                  Trois choix exclusifs : le bandeau marketing est à droite (vertical), en
                  bas (horizontal), ou absent. Les deux zones de commandes se partagent
                  ce qui reste.
                */}
                <Select
                  value={draft.layout_mode}
                  onValueChange={(value) =>
                    setDraft({ ...draft, layout_mode: value as CdsLayoutMode })
                  }
                >
                  <SelectTrigger id="cds-layout" className="max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(cdsLayoutModeLabels) as CdsLayoutMode[]).map(
                      (mode) => (
                        <SelectItem key={mode} value={mode}>
                          {cdsLayoutModeLabels[mode]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              {hasMarketing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="cds-default-duration">
                      Durée d'affichage par défaut (secondes)
                    </Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        id="cds-default-duration"
                        type="number"
                        min={CDS_MEDIA_DURATION_MIN}
                        max={CDS_MEDIA_DURATION_MAX}
                        className="w-24"
                        value={
                          Number.isNaN(draft.default_media_duration_seconds)
                            ? ""
                            : draft.default_media_duration_seconds
                        }
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            default_media_duration_seconds:
                              event.target.value === ""
                                ? Number.NaN
                                : Math.round(Number(event.target.value)),
                          })
                        }
                      />
                      {CDS_MEDIA_DURATION_PRESETS.map((seconds) => (
                        <Button
                          key={seconds}
                          type="button"
                          size="sm"
                          variant={
                            draft.default_media_duration_seconds === seconds
                              ? "default"
                              : "outline"
                          }
                          onClick={() =>
                            setDraft({
                              ...draft,
                              default_media_duration_seconds: seconds,
                            })
                          }
                        >
                          {seconds} s
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      S'applique aux images et QR codes sans durée propre ;
                      chacun peut être ajusté individuellement ci-dessous.
                      Enregistrez pour que l'écran en tienne compte.
                    </p>
                    {!defaultDurationValid && (
                      <p className="text-xs text-destructive">
                        La durée doit être comprise entre{" "}
                        {CDS_MEDIA_DURATION_MIN} et {CDS_MEDIA_DURATION_MAX}{" "}
                        secondes.
                      </p>
                    )}
                  </div>

                  <CdsMediaFormatTips layout={draft.layout_mode} />

                  <CdsMediaRotation
                    displayId={displayId}
                    defaultDuration={
                      defaultDurationValid
                        ? draft.default_media_duration_seconds
                        : (settings?.default_media_duration_seconds ??
                          CDS_MEDIA_DURATION_MIN)
                    }
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun bandeau avec cette disposition. Vos médias sont
                  conservés : choisissez une disposition avec bandeau pour les
                  retrouver.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
}
