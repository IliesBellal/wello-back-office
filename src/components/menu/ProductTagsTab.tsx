import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tag, Allergen } from '@/types/menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Check, Loader2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { menuService } from '@/services/menuService';

interface ProductTagsTabProps {
  tags: Tag[];
  allergens: Allergen[];
  selectedTagIds: string[];
  selectedAllergenIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  onAllergensChange: (allergenIds: string[]) => void;
  /**
   * Produit déjà persisté : active l'enregistrement immédiat de chaque
   * modification. Absent en création (le produit n'existe pas encore côté API),
   * les sélections partent alors avec le payload de création.
   */
  productId?: string | null;
  /** Notifie le parent d'une sélection confirmée par l'API (mise à jour du cache local). */
  onTagsPersisted?: (tagIds: string[]) => void;
  onAllergensPersisted?: (allergenIds: string[]) => void;
  onTagCreated?: (newTag: { id: string; name: string }) => void;
  compact?: boolean;
}

/**
 * File d'attente d'écriture pour un endpoint « full replace » : une seule
 * requête en vol à la fois, les clics suivants écrasent la valeur en attente
 * (last-write-wins). En cas d'échec la sélection revient à la dernière valeur
 * confirmée par l'API, pour ne pas laisser l'écran mentir sur l'état réel.
 */
const useInstantSync = (
  persist: (ids: string[]) => Promise<void>,
  onRollback: (ids: string[]) => void,
  onPersisted?: (ids: string[]) => void,
) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const confirmedRef = useRef<string[]>([]);
  const pendingRef = useRef<string[] | null>(null);
  const runningRef = useRef(false);

  const isBusy = useCallback(() => runningRef.current || pendingRef.current !== null, []);

  const flush = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setSaving(true);
    try {
      while (pendingRef.current) {
        const next = pendingRef.current;
        pendingRef.current = null;
        try {
          await persist(next);
          confirmedRef.current = next;
          onPersisted?.(next);
        } catch (error) {
          pendingRef.current = null;
          onRollback(confirmedRef.current);
          toast({
            title: 'Erreur',
            description:
              error instanceof Error ? error.message : "Impossible d'enregistrer la modification.",
            variant: 'destructive',
          });
          break;
        }
      }
    } finally {
      runningRef.current = false;
      setSaving(false);
    }
  }, [persist, onPersisted, onRollback, toast]);

  const push = useCallback(
    (ids: string[]) => {
      pendingRef.current = ids;
      void flush();
    },
    [flush],
  );

  const setConfirmed = useCallback((ids: string[]) => {
    confirmedRef.current = ids;
  }, []);

  return { saving, push, setConfirmed, isBusy };
};

const toggleId = (ids: string[], id: string) =>
  ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id];

const SavingHint = ({ saving }: { saving: boolean }) =>
  saving ? (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      Enregistrement…
    </span>
  ) : null;

export const ProductTagsTab = ({
  tags,
  allergens,
  selectedTagIds,
  selectedAllergenIds,
  onTagsChange,
  onAllergensChange,
  productId,
  onTagsPersisted,
  onAllergensPersisted,
  onTagCreated,
  compact = false,
}: ProductTagsTabProps) => {
  const { toast } = useToast();
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  // Le catalogue de tags est chargé à l'ouverture de la fiche : sans ce tampon
  // un tag créé ici resterait invisible (donc inassignable) jusqu'à réouverture.
  const [locallyCreatedTags, setLocallyCreatedTags] = useState<Tag[]>([]);

  const availableTags = useMemo(
    () => [...tags, ...locallyCreatedTags.filter(local => !tags.some(t => t.id === local.id))],
    [tags, locallyCreatedTags],
  );

  const instant = !!productId;

  const persistTags = useCallback(
    (ids: string[]) => menuService.updateProductTags(productId as string, ids),
    [productId],
  );
  const persistAllergens = useCallback(
    (ids: string[]) => menuService.updateProductAllergens(productId as string, ids),
    [productId],
  );

  const tagSync = useInstantSync(persistTags, onTagsChange, onTagsPersisted);
  const allergenSync = useInstantSync(persistAllergens, onAllergensChange, onAllergensPersisted);

  // Tant qu'aucune écriture n'est en cours, la sélection affichée fait foi :
  // c'est elle qui servira de point de retour si la prochaine requête échoue.
  const { setConfirmed: setTagsConfirmed, isBusy: isTagsBusy } = tagSync;
  const { setConfirmed: setAllergensConfirmed, isBusy: isAllergensBusy } = allergenSync;

  useEffect(() => {
    if (!isTagsBusy()) setTagsConfirmed(selectedTagIds);
  }, [selectedTagIds, isTagsBusy, setTagsConfirmed]);

  useEffect(() => {
    if (!isAllergensBusy()) setAllergensConfirmed(selectedAllergenIds);
  }, [selectedAllergenIds, isAllergensBusy, setAllergensConfirmed]);

  const handleToggleTag = (tagId: string) => {
    const next = toggleId(selectedTagIds, tagId);
    onTagsChange(next);
    if (instant) tagSync.push(next);
  };

  const handleToggleAllergen = (allergenId: string) => {
    const next = toggleId(selectedAllergenIds, allergenId);
    onAllergensChange(next);
    if (instant) allergenSync.push(next);
  };

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name) return;

    setIsCreatingTag(true);
    try {
      const newTag = await menuService.createTag(name);
      setNewTagName('');
      setLocallyCreatedTags(prev => [...prev, newTag]);
      onTagCreated?.(newTag);
      toast({ title: 'Succès', description: 'Le tag a été créé avec succès.' });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de créer le tag.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingTag(false);
    }
  };

  const chipSize = compact ? 'sm' : 'default';

  const allergensContent =
    allergens.length === 0 ? (
      <p className="py-4 text-center text-xs text-muted-foreground">Aucun allergène</p>
    ) : (
      <div className="flex flex-wrap gap-2">
        {allergens.map((allergen) => (
          <SelectableChip
            key={allergen.allergen_id}
            size={chipSize}
            selected={selectedAllergenIds.includes(allergen.allergen_id)}
            onToggle={() => handleToggleAllergen(allergen.allergen_id)}
            icon={allergen.icon ? <span>{allergen.icon}</span> : undefined}
          >
            {allergen.name}
          </SelectableChip>
        ))}
      </div>
    );

  const tagsContent = (
    <>
      <div className="flex gap-2">
        <Input
          placeholder="Nouveau tag"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCreateTag();
            }
          }}
          disabled={isCreatingTag}
          className={compact ? 'h-8 text-xs' : 'h-8 text-sm'}
        />
        <Button
          onClick={handleCreateTag}
          disabled={isCreatingTag || !newTagName.trim()}
          size="sm"
          variant="outline"
          className="px-2"
        >
          {isCreatingTag ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
        </Button>
      </div>

      {availableTags.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Aucun tag</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <SelectableChip
              key={tag.id}
              size={chipSize}
              color={tag.color}
              selected={selectedTagIds.includes(tag.id)}
              onToggle={() => handleToggleTag(tag.id)}
            >
              {tag.name}
            </SelectableChip>
          ))}
        </div>
      )}
    </>
  );

  const autoSaveNotice = instant && (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Check className="h-3 w-3" />
      Modifications enregistrées automatiquement
    </p>
  );

  if (compact) {
    return (
      <div className="space-y-4">
        {autoSaveNotice}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Allergènes</h3>
            <SavingHint saving={allergenSync.saving} />
          </div>
          {allergensContent}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Tags</h3>
            <SavingHint saving={tagSync.saving} />
          </div>
          {tagsContent}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {autoSaveNotice}

      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Allergènes</CardTitle>
              <SavingHint saving={allergenSync.saving} />
            </div>
            <CardDescription>{allergens.length} disponibles</CardDescription>
          </CardHeader>
          <CardContent>{allergensContent}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Tags</CardTitle>
              <SavingHint saving={tagSync.saving} />
            </div>
            <CardDescription>{availableTags.length} disponibles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">{tagsContent}</CardContent>
        </Card>
      </div>
    </div>
  );
};
