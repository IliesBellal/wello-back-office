import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { AlertCircle, Copy, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  scannorderSeoService,
  seoErrorMessage,
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
}

const META_DESCRIPTION_LENGTH = 160;

const toDraft = (s: ScanNOrderSeoSettings): Draft => ({
  title: s.title,
  description: s.description,
  cuisineTypes: [...s.cuisine_types],
  links: s.links.length ? [...s.links] : [''],
});

const sameDraft = (a: Draft, b: Draft) =>
  a.title === b.title &&
  a.description === b.description &&
  a.cuisineTypes.join(',') === b.cuisineTypes.join(',') &&
  a.links.filter(Boolean).join('\n') === b.links.filter(Boolean).join('\n');

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
              Ajoutez en priorité le lien de votre fiche Google : il aide Google à relier cette page à votre établissement.
              Puis Instagram, Facebook, Tripadvisor, votre site…
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {draft.links.map((link, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={link}
                  type="url"
                  inputMode="url"
                  placeholder={index === 0 ? 'https://maps.app.goo.gl/… (fiche Google)' : 'https://www.instagram.com/…'}
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
        {accessUrl && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Votre fiche Google</CardTitle>
              <CardDescription>
                Sur Google Maps, ce sont les fiches Google qui ressortent. Dans votre fiche Google (Google Business Profile),
                collez ce lien dans « Commander en ligne » et « Menu » : vos clients commandent chez vous, sans commission de
                plateforme.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input value={accessUrl} readOnly />
                <Button variant="outline" onClick={copyLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copier
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !dirty} className="min-w-32">
          {saving ? 'Enregistrement…' : 'Enregistrer le référencement'}
        </Button>
      </div>
    </div>
  );
}
