import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Copy, ExternalLink, Loader2, Mail, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  scannorderSeoService,
  seoErrorMessage,
  type GoogleCandidate,
  type ScanNOrderSeoSettings,
} from '@/services/scannorderSeoService';

// Onglet « Référencement » de la page ScanNOrder : ce que Google et Bing
// affichent de la page de commande de l'établissement. Enregistrement propre
// à l'onglet (PATCH /integrations/scannorder/seo), indépendant du bouton
// « Sauvegarder » des autres onglets.

interface ScanNOrderSeoPanelProps {
  /** Lien public de la page ScanNOrder (QR principal), null s'il n'existe pas. */
  accessUrl: string | null;
  /** Nom et ville de l'établissement, pour l'aperçu. */
  establishmentName?: string;
  city?: string;
  takeawayEnabled?: boolean;
  deliveryEnabled?: boolean;
}

interface Draft {
  title: string;
  description: string;
  cuisineTypes: string[];
  links: string[];
  googlePlaceId: string;
  googleMapsUrl: string;
  googleReviewUrl: string;
  reviewRequestEnabled: boolean;
}

const META_DESCRIPTION_LENGTH = 160;

const toDraft = (s: ScanNOrderSeoSettings): Draft => ({
  title: s.title,
  description: s.description,
  cuisineTypes: [...s.cuisine_types],
  links: s.links.length ? [...s.links] : [''],
  googlePlaceId: s.google.place_id,
  googleMapsUrl: s.google.maps_url,
  googleReviewUrl: s.google.review_url,
  reviewRequestEnabled: s.review_request_enabled,
});

const sameDraft = (a: Draft, b: Draft) =>
  a.title === b.title &&
  a.description === b.description &&
  a.cuisineTypes.join(',') === b.cuisineTypes.join(',') &&
  a.links.filter(Boolean).join('\n') === b.links.filter(Boolean).join('\n') &&
  a.googlePlaceId === b.googlePlaceId &&
  a.googleMapsUrl.trim() === b.googleMapsUrl.trim() &&
  a.googleReviewUrl.trim() === b.googleReviewUrl.trim() &&
  a.reviewRequestEnabled === b.reviewRequestEnabled;

export function ScanNOrderSeoPanel({
  accessUrl,
  establishmentName,
  city,
  takeawayEnabled,
  deliveryEnabled,
}: ScanNOrderSeoPanelProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ScanNOrderSeoSettings | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<GoogleCandidate[] | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    scannorderSeoService
      .get()
      .then((s) => {
        if (cancelled) return;
        setSettings(s);
        setDraft(toDraft(s));
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const optionsByCode = useMemo(
    () => new Map((settings?.cuisine_options ?? []).map((o) => [o.code, o])),
    [settings],
  );

  // Aperçu indicatif du résultat Google : même règle que le serveur
  // ScanNOrder (wello-resto-scannorder server/seo.mjs, buildTitle), simplifiée.
  const preview = useMemo(() => {
    if (!draft) return null;
    const place = draft.cuisineTypes.length ? optionsByCode.get(draft.cuisineTypes[0])?.place : undefined;
    const name = establishmentName || 'Votre établissement';
    const suffix =
      deliveryEnabled && takeawayEnabled
        ? 'Livraison et à emporter'
        : deliveryEnabled
          ? 'Livraison'
          : takeawayEnabled
            ? 'À emporter'
            : 'Commander en ligne';
    const where = city && !name.toLowerCase().includes(city.toLowerCase()) ? ` à ${city}` : '';
    const showPlace = place && !name.toLowerCase().includes(place.toLowerCase());
    const auto = showPlace ? `${name} — ${place}${where} | ${suffix}` : `${name}${where} — ${suffix}`;
    const description = draft.description.trim();
    return {
      title: draft.title.trim() || auto,
      description: description
        ? description.length > META_DESCRIPTION_LENGTH
          ? `${description.slice(0, META_DESCRIPTION_LENGTH - 1).replace(/\s+\S*$/, '')}…`
          : description
        : 'Sans description, un texte est rédigé automatiquement à partir de votre carte (type de cuisine, ville, catégories).',
      generatedDescription: !description,
    };
  }, [draft, optionsByCode, establishmentName, city, takeawayEnabled, deliveryEnabled]);

  if (loadError) {
    return (
      <div className="w-full max-w-7xl mx-auto px-6 md:px-8 py-10">
        <Card>
          <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Impossible de charger le référencement pour le moment.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!settings || !draft || !preview) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { limits } = settings;
  const dirty = !sameDraft(draft, toDraft(settings));
  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const toggleCuisine = (code: string) => {
    const selected = draft.cuisineTypes;
    if (selected.includes(code)) {
      update({ cuisineTypes: selected.filter((c) => c !== code) });
    } else if (selected.length < limits.cuisines_max) {
      update({ cuisineTypes: [...selected, code] });
    }
  };

  const makePrimary = (code: string) =>
    update({ cuisineTypes: [code, ...draft.cuisineTypes.filter((c) => c !== code)] });

  const setLink = (index: number, value: string) =>
    update({ links: draft.links.map((l, i) => (i === index ? value : l)) });

  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const suggestion = await scannorderSeoService.suggest();
      update({
        description: suggestion.description || draft.description,
        cuisineTypes: suggestion.cuisine_types.length ? suggestion.cuisine_types : draft.cuisineTypes,
      });
      toast({
        title: 'Suggestion appliquée',
        description: "Relisez la description et les types de cuisine, puis enregistrez.",
      });
    } catch (error) {
      toast({ title: 'Suggestion impossible', description: seoErrorMessage(error), variant: 'destructive' });
    } finally {
      setSuggesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await scannorderSeoService.update({
        title: draft.title,
        description: draft.description,
        cuisine_types: draft.cuisineTypes,
        links: draft.links.map((l) => l.trim()).filter(Boolean),
        google_place_id: draft.googlePlaceId,
        google_maps_url: draft.googleMapsUrl.trim(),
        google_review_url: draft.googleReviewUrl.trim(),
        review_request_enabled: draft.reviewRequestEnabled && draft.googleReviewUrl.trim() !== '',
      });
      setSettings(saved);
      setDraft(toDraft(saved));
      toast({
        title: 'Référencement enregistré',
        description: 'La page sera mise à jour dans quelques minutes, puis revisitée par les moteurs de recherche.',
      });
    } catch (error) {
      toast({ title: 'Enregistrement impossible', description: seoErrorMessage(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSearchGoogle = async () => {
    setSearching(true);
    try {
      setCandidates(await scannorderSeoService.searchGoogle());
    } catch (error) {
      setCandidates(null);
      toast({ title: 'Recherche impossible', description: seoErrorMessage(error), variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const pickCandidate = (c: GoogleCandidate) => {
    update({ googlePlaceId: c.place_id, googleMapsUrl: c.maps_url, googleReviewUrl: c.review_url });
    setCandidates(null);
    toast({ title: 'Fiche Google reliée', description: 'Vérifiez les liens, puis enregistrez.' });
  };

  const handleReviewTest = async () => {
    setTesting(true);
    try {
      const { sent_to } = await scannorderSeoService.sendReviewTest();
      toast({ title: 'E-mail de test envoyé', description: `Envoyé à ${sent_to}.` });
    } catch (error) {
      toast({ title: 'Envoi impossible', description: seoErrorMessage(error), variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  // Le test part avec le lien d'avis enregistré : il faut l'avoir enregistré.
  const savedReviewUrl = settings.google.review_url;
  const reviewUrlDraft = draft.googleReviewUrl.trim();

  const copyLink = () => {
    if (!accessUrl) return;
    navigator.clipboard.writeText(accessUrl);
    toast({ title: 'Copié !', description: 'Le lien de votre page a été copié.' });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 md:px-8 py-10 space-y-10">
      {/* Aperçu */}
      <Card>
        <CardHeader>
          <CardTitle>Aperçu dans Google</CardTitle>
          <CardDescription>Ce que les internautes voient de votre page dans les résultats de recherche (aperçu indicatif).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/20 p-4 space-y-1">
            <p className="text-xs text-muted-foreground truncate">{accessUrl ?? 'scannorder.welloresto.fr'}</p>
            <p className="text-lg leading-snug text-blue-700 dark:text-blue-400">{preview.title}</p>
            <p className={`text-sm ${preview.generatedDescription ? 'italic text-muted-foreground' : 'text-foreground/80'}`}>
              {preview.description}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Type de cuisine */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Type de cuisine</CardTitle>
            <CardDescription>
              Jusqu'à {limits.cuisines_max} choix. Le premier est votre type principal : il apparaît dans le titre
              (« Pizzeria à Metz »), c'est ce que tapent vos clients.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {draft.cuisineTypes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Sélection :</span>
                {draft.cuisineTypes.map((code, i) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => makePrimary(code)}
                    className={`rounded-full border px-3 py-1 ${i === 0 ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted'}`}
                    title={i === 0 ? 'Type principal' : 'Définir comme type principal'}
                  >
                    {optionsByCode.get(code)?.label ?? code}
                    {i === 0 && <span className="ml-1 text-xs text-primary">· principal</span>}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {settings.cuisine_options.map((option) => {
                const selected = draft.cuisineTypes.includes(option.code);
                return (
                  <SelectableChip
                    key={option.code}
                    size="sm"
                    selected={selected}
                    disabled={!selected && draft.cuisineTypes.length >= limits.cuisines_max}
                    onToggle={() => toggleCuisine(option.code)}
                  >
                    {option.label}
                  </SelectableChip>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                <CardTitle>Description</CardTitle>
                <CardDescription>
                  Affichée sur votre page. Les {META_DESCRIPTION_LENGTH} premiers caractères sont repris par Google :
                  commencez par votre type de cuisine, votre ville et vos spécialités.
                </CardDescription>
              </div>
              {settings.suggest_available && (
                <Button variant="outline" onClick={handleSuggest} disabled={suggesting}>
                  {suggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Suggérer à partir de ma carte
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              value={draft.description}
              maxLength={limits.description_max_length}
              rows={4}
              placeholder="Pizzeria à Metz : pizzas au feu de bois, calzones et tiramisu. Une carte de pâtes fraîches et des menus midi."
              onChange={(e) => update({ description: e.target.value })}
            />
            <p className="text-right text-xs text-muted-foreground">
              {draft.description.length} / {limits.description_max_length}
            </p>
          </CardContent>
        </Card>

        {/* Titre */}
        <Card>
          <CardHeader>
            <CardTitle>Titre de la page</CardTitle>
            <CardDescription>
              Facultatif. Laissé vide, il est composé automatiquement (nom, type de cuisine, ville, modes de commande) —
              c'est le plus efficace dans la plupart des cas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              value={draft.title}
              maxLength={limits.title_max_length}
              placeholder="Titre automatique"
              onChange={(e) => update({ title: e.target.value })}
            />
            <p className="text-right text-xs text-muted-foreground">
              {draft.title.length} / {limits.title_max_length}
            </p>
          </CardContent>
        </Card>

        {/* Liens */}
        <Card>
          <CardHeader>
            <CardTitle>Vos pages sur internet</CardTitle>
            <CardDescription>
              Instagram, Facebook, Tripadvisor, votre site… Ces liens aident les moteurs de recherche à reconnaître votre
              établissement. La fiche Google se renseigne plus bas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {draft.links.map((link, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={link}
                  type="url"
                  inputMode="url"
                  placeholder={index === 0 ? 'https://www.instagram.com/…' : 'https://www.facebook.com/…'}
                  onChange={(e) => setLink(index, e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Retirer ce lien"
                  onClick={() => update({ links: draft.links.length > 1 ? draft.links.filter((_, i) => i !== index) : [''] })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {draft.links.length < limits.links_max && (
              <Button variant="outline" size="sm" onClick={() => update({ links: [...draft.links, ''] })}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un lien
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Fiche Google */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                <CardTitle>Votre fiche Google</CardTitle>
                <CardDescription>
                  Sur Google Maps, ce sont les fiches Google qui ressortent. Relier votre fiche à cette page aide Google à
                  reconnaître votre établissement, et permet de demander des avis à vos clients.
                </CardDescription>
              </div>
              {settings.google_search_available && (
                <Button variant="outline" onClick={handleSearchGoogle} disabled={searching}>
                  {searching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Retrouver ma fiche Google
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {candidates !== null && (
              <div className="rounded-lg border p-3 space-y-2">
                {candidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune fiche trouvée avec le nom et l'adresse de l'établissement. Collez les liens ci-dessous.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Choisissez votre établissement :</p>
                    {candidates.map((c) => (
                      <div key={c.place_id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/40 p-3">
                        <div className="min-w-0">
                          <p className="font-medium">{c.name}</p>
                          <p className="text-sm text-muted-foreground">{c.address}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={c.maps_url} target="_blank" rel="noopener noreferrer">
                              Voir <ExternalLink className="ml-1 h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button size="sm" onClick={() => pickCandidate(c)}>
                            C'est mon établissement
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="seo-google-maps">Lien de votre fiche Google</Label>
              <div className="flex gap-2">
                <Input
                  id="seo-google-maps"
                  type="url"
                  inputMode="url"
                  value={draft.googleMapsUrl}
                  placeholder="https://maps.app.goo.gl/…"
                  onChange={(e) => update({ googleMapsUrl: e.target.value, googlePlaceId: '' })}
                />
                {draft.googleMapsUrl.trim() && (
                  <Button variant="outline" size="icon" aria-label="Ouvrir la fiche Google" asChild>
                    <a href={draft.googleMapsUrl.trim()} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seo-google-review">Lien pour laisser un avis</Label>
              <div className="flex gap-2">
                <Input
                  id="seo-google-review"
                  type="url"
                  inputMode="url"
                  value={draft.googleReviewUrl}
                  placeholder="https://g.page/r/…/review"
                  onChange={(e) => update({ googleReviewUrl: e.target.value, googlePlaceId: '' })}
                />
                {reviewUrlDraft && (
                  <Button variant="outline" size="icon" aria-label="Tester le lien d'avis" asChild>
                    <a href={reviewUrlDraft} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Rempli automatiquement quand vous choisissez votre fiche. Sinon, récupérez-le vous-même :
              </p>
              <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                <li>
                  Accédez à votre fiche d'établissement sur{' '}
                  <a
                    href="https://business.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    business.google.com
                  </a>
                  .
                </li>
                <li>
                  Sélectionnez « Voir les avis », puis « Recevoir plus d'avis » (icône « Partager »).
                </li>
                <li>Sélectionnez « Copier » pour copier le lien vers les avis, puis collez-le ci-dessus.</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                <a
                  href="https://support.google.com/business/answer/16816815?hl=fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                >
                  Aide Google <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>

            {accessUrl && (
              <div className="space-y-2 border-t pt-5">
                <Label>Votre lien de commande, à coller dans la fiche Google</Label>
                <p className="text-xs text-muted-foreground">
                  Dans votre fiche Google, collez ce lien dans « Commander en ligne » et « Menu » : vos clients commandent
                  chez vous, sans commission de plateforme.
                </p>
                <div className="flex gap-2">
                  <Input value={accessUrl} readOnly />
                  <Button variant="outline" onClick={copyLink}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copier
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Demande d'avis */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Demande d'avis par e-mail</CardTitle>
            <CardDescription>
              Plus d'avis Google, c'est plus de visibilité sur Google Maps. Après chaque commande ScanNOrder, le client
              reçoit un e-mail à votre nom et à vos couleurs avec un bouton « Laisser un avis sur Google ».
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="seo-review-request" className="text-sm font-medium">
                  Demander un avis après chaque commande en ligne
                </Label>
                {!reviewUrlDraft && (
                  <p className="text-xs text-muted-foreground">Renseignez d'abord le lien pour laisser un avis.</p>
                )}
              </div>
              <Switch
                id="seo-review-request"
                checked={draft.reviewRequestEnabled && reviewUrlDraft !== ''}
                disabled={!reviewUrlDraft}
                onCheckedChange={(checked) => update({ reviewRequestEnabled: checked })}
              />
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Envoyé environ 1 h 30 après la clôture de la commande, entre 9 h et 21 h.</li>
              <li>Au plus une demande par client tous les 90 jours.</li>
              <li>Chaque e-mail contient un lien pour ne plus en recevoir.</li>
              <li>Tous les clients reçoivent la même demande, sans contrepartie : c'est la règle de Google sur les avis.</li>
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                {settings.review_requests_sent_30d > 0
                  ? `${settings.review_requests_sent_30d} demande${settings.review_requests_sent_30d > 1 ? 's' : ''} envoyée${settings.review_requests_sent_30d > 1 ? 's' : ''} ces 30 derniers jours.`
                  : 'Aucune demande envoyée ces 30 derniers jours.'}
              </p>
              <Button
                variant="outline"
                onClick={handleReviewTest}
                disabled={testing || !savedReviewUrl || reviewUrlDraft !== savedReviewUrl}
                title={reviewUrlDraft !== savedReviewUrl ? "Enregistrez d'abord le lien pour laisser un avis" : undefined}
              >
                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                M'envoyer un e-mail de test
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !dirty} className="min-w-32">
          {saving ? 'Enregistrement…' : 'Enregistrer le référencement'}
        </Button>
      </div>
    </div>
  );
}
