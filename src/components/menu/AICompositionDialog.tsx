import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  buildApplyPayload,
  currentKey,
  currentNotProposed,
  initialSelection,
  proposedKey,
  proposedToAdd,
} from '@/lib/aiComposition';
import {
  describeCompositionError,
  MAX_AI_COMPOSITION_PRODUCTS,
  menuCompositionService,
} from '@/services/menuCompositionService';
import { menuImportService } from '@/services/menuImportService';
import type {
  AICompositionMode,
  AICompositionPreview,
  AICompositionPreviewProduct,
  AICompositionStatus,
} from '@/types/aiComposition';
import type { Product } from '@/types/menu';

type Phase = 'intro' | 'reading' | 'review' | 'applying';

interface AICompositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Pick<Product, 'product_id' | 'name' | 'description' | 'is_product_group'>[];
  /** Appelé après une application réussie (recharger la carte, la fiche…). */
  onApplied: () => void | Promise<void>;
}

const STATUS_MESSAGES: Record<Exclude<AICompositionStatus, 'proposed'>, string> = {
  no_ingredient: 'La description ne cite aucun ingrédient.',
  no_description: 'Pas de description : rien à lire.',
  group: 'Groupe de produits : sa composition se règle sur chaque déclinaison.',
  failed: 'Lecture impossible pour ce produit. Relancez la génération pour réessayer.',
};

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`;

/**
 * Génère la composition de produits existants à partir de leur description :
 * l'IA propose, le restaurateur coche, puis applique en complétant ou en
 * remplaçant la composition actuelle. Une génération consomme un crédit
 * d'import IA (le même solde que l'import de carte par photo).
 */
export const AICompositionDialog = ({ open, onOpenChange, products, onApplied }: AICompositionDialogProps) => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [preview, setPreview] = useState<AICompositionPreview | null>(null);
  const [selection, setSelection] = useState<Record<string, string[]>>({});
  const [mode, setMode] = useState<AICompositionMode>('add');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhase('intro');
    setPreview(null);
    setSelection({});
    setMode('add');
    setError(null);
  }, [open]);

  // Solde de crédits, lu avant de lancer (partagé avec l'import photo).
  const creditsQuery = useQuery({
    queryKey: ['aiImportCredits'],
    queryFn: async () => (await menuImportService.listPhotoDrafts()).credits,
    enabled: open && phase === 'intro',
  });
  const credits = preview?.credits ?? creditsQuery.data;

  const readable = useMemo(
    () => products.filter((product) => !product.is_product_group && (product.description ?? '').trim() !== ''),
    [products],
  );
  const tooMany = products.length > MAX_AI_COMPOSITION_PRODUCTS;
  const noCredit = credits !== undefined && credits.remaining <= 0;
  const busy = phase === 'reading' || phase === 'applying';

  const generate = async () => {
    setPhase('reading');
    setError(null);
    try {
      const result = await menuCompositionService.previewAICompositions(products.map((p) => p.product_id));
      setPreview(result);
      setSelection(initialSelection(result));
      setPhase('review');
    } catch (err) {
      setError(describeCompositionError(err));
      setPhase('intro');
    }
  };

  const payload = useMemo(
    () => (preview ? buildApplyPayload(preview, selection, mode) : []),
    [preview, selection, mode],
  );

  const apply = async () => {
    setPhase('applying');
    setError(null);
    try {
      const result = await menuCompositionService.applyAICompositions(payload);
      const created = result.components_created > 0 ? `, ${plural(result.components_created, 'ingrédient')} créé(s)` : '';
      toast.success(`Composition mise à jour pour ${plural(result.products_updated, 'produit')}${created}`);
      await onApplied();
      onOpenChange(false);
    } catch (err) {
      setError(describeCompositionError(err));
      setPhase('review');
    }
  };

  const toggle = (productId: string, key: string) => {
    setSelection((current) => {
      const kept = new Set(current[productId] ?? []);
      if (kept.has(key)) kept.delete(key);
      else kept.add(key);
      return { ...current, [productId]: [...kept] };
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Générer les ingrédients depuis la description
          </DialogTitle>
          <DialogDescription>
            {products.length === 1
              ? products[0].name
              : `${plural(products.length, 'produit')} sélectionné${products.length > 1 ? 's' : ''}`}
          </DialogDescription>
        </DialogHeader>

        {(phase === 'intro' || phase === 'reading') && (
          <div className="space-y-3 text-sm">
            <p>
              L’IA lit la description de chaque produit et propose ses ingrédients. Elle ne reprend que ceux
              qui y sont écrits, sans quantité : la composition décrit le plat, elle ne sert au suivi de
              stock qu’une fois les quantités renseignées. Vous vérifiez tout avant d’appliquer.
            </p>
            {products.length > 1 && (
              <p className="text-muted-foreground">
                {readable.length === products.length
                  ? 'Tous les produits choisis ont une description.'
                  : `${plural(readable.length, 'produit')} sur ${products.length} ${readable.length > 1 ? 'ont' : 'a'} une description : les autres seront ignorés.`}
              </p>
            )}
            {credits && (
              <p className="text-muted-foreground">
                {noCredit
                  ? 'Vous avez utilisé tous vos crédits d’import IA.'
                  : `Utilise 1 crédit d’import IA (il vous en reste ${credits.remaining}), rendu si la lecture échoue.`}
              </p>
            )}
            {readable.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {products.length === 1
                    ? 'Ce produit n’a pas de description à lire.'
                    : 'Aucun de ces produits n’a de description à lire.'}{' '}
                  Ajoutez-en une depuis la fiche produit.
                </AlertDescription>
              </Alert>
            )}
            {tooMany && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {MAX_AI_COMPOSITION_PRODUCTS} produits au maximum par génération : réduisez la sélection.
                </AlertDescription>
              </Alert>
            )}
            {phase === 'reading' && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Lecture des descriptions… cela peut prendre jusqu’à une minute.
              </p>
            )}
          </div>
        )}

        {(phase === 'review' || phase === 'applying') && preview && (
          <>
            <div className="space-y-2">
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(value) => value && setMode(value as AICompositionMode)}
                className="justify-start"
                disabled={busy}
              >
                <ToggleGroupItem value="add" variant="outline" size="sm">
                  Compléter la composition
                </ToggleGroupItem>
                <ToggleGroupItem value="replace" variant="outline" size="sm">
                  Remplacer la composition
                </ToggleGroupItem>
              </ToggleGroup>
              <p className="text-xs text-muted-foreground">
                {mode === 'add'
                  ? 'Les ingrédients cochés sont ajoutés ; la composition actuelle et ses quantités restent intactes.'
                  : 'La composition devient exactement les ingrédients cochés ; ceux déjà présents gardent leur quantité, les autres sont retirés.'}
              </p>
            </div>

            <ScrollArea className="-mx-6 flex-1 px-6">
              <ul className="space-y-3 py-1">
                {preview.products.map((product) => (
                  <ProductRow
                    key={product.product_id}
                    product={product}
                    mode={mode}
                    kept={new Set(selection[product.product_id] ?? [])}
                    disabled={busy}
                    onToggle={(key) => toggle(product.product_id, key)}
                  />
                ))}
              </ul>
            </ScrollArea>
          </>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          {phase === 'intro' || phase === 'reading' ? (
            <Button
              onClick={generate}
              disabled={busy || readable.length === 0 || tooMany || noCredit}
              className="bg-gradient-primary"
            >
              {phase === 'reading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lire les descriptions
            </Button>
          ) : (
            <Button onClick={apply} disabled={busy || payload.length === 0} className="bg-gradient-primary">
              {phase === 'applying' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {payload.length === 0 ? 'Rien à appliquer' : `Appliquer à ${plural(payload.length, 'produit')}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ProductRowProps {
  product: AICompositionPreviewProduct;
  mode: AICompositionMode;
  kept: Set<string>;
  disabled: boolean;
  onToggle: (key: string) => void;
}

const ProductRow = ({ product, mode, kept, disabled, onToggle }: ProductRowProps) => {
  const proposed = mode === 'add' ? proposedToAdd(product) : product.proposed;
  const others = mode === 'replace' ? currentNotProposed(product) : [];

  return (
    <li className="space-y-2 rounded-lg border p-3">
      <div>
        <p className="font-medium">{product.name}</p>
        {product.description && <p className="line-clamp-2 text-xs text-muted-foreground">{product.description}</p>}
      </div>

      {product.status !== 'proposed' ? (
        <p className="text-sm text-muted-foreground">{STATUS_MESSAGES[product.status]}</p>
      ) : (
        <>
          {mode === 'add' && product.current.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Déjà dans la composition : {product.current.map((line) => line.name).join(', ')}
            </p>
          )}
          {proposed.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {proposed.map((line) => (
                <SelectableChip
                  key={line.name}
                  size="sm"
                  selected={kept.has(proposedKey(line))}
                  disabled={disabled}
                  onToggle={() => onToggle(proposedKey(line))}
                  title={line.component_id ? 'Ingrédient existant' : 'Nouvel ingrédient, créé à l’application'}
                >
                  {line.name}
                  {!line.component_id && <span className="text-[10px] uppercase text-primary">nouveau</span>}
                </SelectableChip>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Tous les ingrédients lus sont déjà dans la composition.</p>
          )}
          {others.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Dans la composition actuelle mais pas dans la description (décochés = retirés) :
              </p>
              <div className="flex flex-wrap gap-1.5">
                {others.map((line) => (
                  <SelectableChip
                    key={line.component_id}
                    size="sm"
                    selected={kept.has(currentKey(line))}
                    disabled={disabled}
                    onToggle={() => onToggle(currentKey(line))}
                  >
                    {line.name}
                  </SelectableChip>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </li>
  );
};
