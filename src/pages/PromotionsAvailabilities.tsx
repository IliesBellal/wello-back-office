import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer, TabSystem } from '@/components/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { parsePriceInput, priceToDisplayValue } from '@/utils/priceInputUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Plus, Pencil, Trash2, Tag, Clock, Percent, Euro, CalendarDays, X, Search, UtensilsCrossed } from 'lucide-react';
import { useState as useStateBase } from 'react';
import { promotionsService } from '@/services/promotionsService';
import { menuService } from '@/services/menuService';
import { Promotion, Availability, DayOfWeek, TimeSlot } from '@/types/promotions';
import { Product } from '@/types/menu';
import { useToast } from '@/hooks/use-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'monday',    label: 'Lundi',    short: 'Lun' },
  { key: 'tuesday',  label: 'Mardi',    short: 'Mar' },
  { key: 'wednesday',label: 'Mercredi', short: 'Mer' },
  { key: 'thursday', label: 'Jeudi',    short: 'Jeu' },
  { key: 'friday',   label: 'Vendredi', short: 'Ven' },
  { key: 'saturday', label: 'Samedi',   short: 'Sam' },
  { key: 'sunday',   label: 'Dimanche', short: 'Dim' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCents = (cents: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);

const emptyPromotion = (): Omit<Promotion, 'id'> => ({
  name: '',
  description: '',
  type: 'percentage',
  value: 10,
  code: '',
  start_date: '',
  end_date: '',
  no_end_date: false,
  active: true,
  time_slots: [],
  product_ids: [],
  product_prices: {},
  discounted_quantity: 1,
  min_order_value: 0,
  min_order_unit: 'QTY',
  order_type: '',
  is_cumulative: false,
  is_time_limited: false,
  available: true,
  discount_unit: 'PERCENTAGE',
});

const emptyAvailability = (): Omit<Availability, 'id'> => ({
  name: '',
  days: [],
  start_time: '11:00',
  end_time: '14:00',
  active: true,
  product_ids: [],
});

// ─── Delete confirmation dialog ───────────────────────────────────────────────

interface DeleteConfirmProps {
  open: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirm({ open, title, onConfirm, onCancel }: DeleteConfirmProps) {
  return (
    <AlertDialog open={open} onOpenChange={v => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer "{title}" ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. L'élément sera définitivement supprimé.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PROMOTIONS TAB
// ════════════════════════════════════════════════════════════════════════════

function PromotionFormDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial?: Promotion;
  onClose: () => void;
  onSave: (data: Omit<Promotion, 'id'>) => Promise<void>;
}) {
  const [form, setForm] = useState<Omit<Promotion, 'id'>>(
    initial ? { ...initial } : emptyPromotion()
  );
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [priceDisplayValues, setPriceDisplayValues] = useState<Record<string, string>>({});
  const [minOrderValueDisplay, setMinOrderValueDisplay] = useState<string>('');

  useEffect(() => {
    setForm(initial ? { ...initial } : emptyPromotion());
    setActiveTab('general');
    setProductSearch('');
    setPriceDisplayValues({});
    setMinOrderValueDisplay(initial?.min_order_unit === 'EUR' ? priceToDisplayValue(initial?.min_order_value ?? 0) : `${initial?.min_order_value ?? 0}`);
  }, [open, initial]);

  // Load products when dialog opens
  useEffect(() => {
    if (open && products.length === 0) {
      setLoadingProducts(true);
      menuService.getProducts().then(data => {
        setProducts(data);
        setLoadingProducts(false);
      }).catch(() => setLoadingProducts(false));
    }
  }, [open, products.length]);



  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const isValid = form.name.trim().length > 0 && form.value > 0;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // Tab rendering functions

  // ─── TAB: GÉNÉRAL ──────────────────────────────────────────────────────────
  const renderGeneralTab = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="promo-name">Nom *</Label>
        <Input
          id="promo-name"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Ex: Happy Hour -20%"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="promo-desc">Description</Label>
        <Textarea
          id="promo-desc"
          value={form.description ?? ''}
          onChange={e => set('description', e.target.value)}
          placeholder="Description visible par les clients"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type de remise *</Label>
          <Select value={form.discount_unit ?? 'PERCENTAGE'} onValueChange={v => {
            const unit = v as 'PERCENTAGE' | 'CURRENCY' | 'NEWPRICE';
            setForm(prev => ({
              ...prev,
              discount_unit: unit,
              type: unit === 'PERCENTAGE' ? 'percentage' : 'fixed'
            }));
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">Pourcentage (%)</SelectItem>
              <SelectItem value="CURRENCY">Montant fixe (€)</SelectItem>
              <SelectItem value="NEWPRICE">Individuel par article</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="promo-value">
            Valeur *
            {form.discount_unit === 'PERCENTAGE' && ' (%)'}
            {form.discount_unit === 'CURRENCY' && ' (€)'}
            {form.discount_unit === 'NEWPRICE' && ' (détail par produit)'}
          </Label>
          <Input
            id="promo-value"
            type="number"
            min={0}
            step={form.discount_unit === 'PERCENTAGE' ? 1 : 0.01}
            max={form.discount_unit === 'PERCENTAGE' ? 100 : undefined}
            value={form.discount_unit === 'PERCENTAGE' ? form.value : form.discount_unit === 'CURRENCY' ? (form.value / 100).toFixed(2) : form.value}
            onChange={e => {
              const raw = parseFloat(e.target.value || '0');
              if (form.discount_unit === 'PERCENTAGE') {
                set('value', raw);
              } else if (form.discount_unit === 'CURRENCY') {
                set('value', Math.round(raw * 100));
              } else {
                set('value', raw);
              }
            }}
            placeholder={form.discount_unit === 'NEWPRICE' ? 'Voir l\'onglet Produits' : 'Ex: 20'}
            disabled={form.discount_unit === 'NEWPRICE'}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="promo-code">Code promo (optionnel)</Label>
        <Input
          id="promo-code"
          value={form.code ?? ''}
          onChange={e => set('code', e.target.value.toUpperCase())}
          placeholder="Ex: SUMMER20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date de début</Label>
          <DatePicker
            value={form.start_date}
            onDateChange={date => set('start_date', date)}
            placeholder="Sélectionner une date"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <Label>Date de fin</Label>
            <div className="flex items-center gap-2">
              <Switch
                id="no-end-date"
                checked={form.no_end_date ?? false}
                onCheckedChange={v => set('no_end_date', v)}
              />
              <label htmlFor="no-end-date" className="text-xs text-muted-foreground cursor-pointer">
                Sans limite
              </label>
            </div>
          </div>
          <DatePicker
            value={form.end_date}
            onDateChange={date => set('end_date', date)}
            disabled={form.no_end_date ?? false}
            placeholder="Sélectionner une date"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="promo-qty">Quantité remisée</Label>
        <Input
          id="promo-qty"
          type="number"
          min={1}
          value={form.discounted_quantity ?? 1}
          onChange={e => set('discounted_quantity', parseInt(e.target.value) || 1)}
          placeholder="Nombre d'articles remisés"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="promo-min-order">Valeur min de commande</Label>
        <div className="flex gap-2">
          <Input
            id="promo-min-order"
            type="text"
            inputMode={form.min_order_unit === 'QTY' ? 'numeric' : 'decimal'}
            value={minOrderValueDisplay}
            onChange={e => {
              const displayValue = e.target.value;
              setMinOrderValueDisplay(displayValue);
              if (form.min_order_unit === 'QTY') {
                set('min_order_value', parseInt(displayValue || '0') || 0);
              } else {
                const parsed = parsePriceInput(displayValue);
                set('min_order_value', parsed);
              }
            }}
            placeholder="Ex: 2"
            className="flex-1"
          />
          <Select value={form.min_order_unit ?? 'QTY'} onValueChange={v => {
            set('min_order_unit', v);
            // Mettre à jour le display value quand l'unité change
            if (v === 'EUR') {
              setMinOrderValueDisplay(priceToDisplayValue(form.min_order_value ?? 0));
            } else {
              setMinOrderValueDisplay(`${form.min_order_value ?? 0}`);
            }
          }}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="QTY">Qté</SelectItem>
              <SelectItem value="EUR">€</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.min_order_unit === 'EUR' && minOrderValueDisplay && (
          <div className="text-xs text-muted-foreground">
            {formatCents(parsePriceInput(minOrderValueDisplay))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label>Type de commande</Label>
        <div className="space-y-2">
          {[
            { id: 'order-in', value: 'IN', label: 'Sur place' },
            { id: 'order-takeaway', value: 'TAKE_AWAY', label: 'À emporter' },
            { id: 'order-delivery', value: 'DELIVERY', label: 'Livraison' }
          ].map(option => {
            const orderTypes = (form.order_type ?? '').split(' ').filter(Boolean);
            const isChecked = orderTypes.includes(option.value);
            return (
              <div key={option.id} className="flex items-center justify-between gap-3">
                <Label htmlFor={option.id} className="cursor-pointer font-normal">{option.label}</Label>
                <Switch
                  id={option.id}
                  checked={isChecked}
                  onCheckedChange={checked => {
                    const types = (form.order_type ?? '').split(' ').filter(Boolean);
                    const updated = checked
                      ? [...types, option.value]
                      : types.filter(t => t !== option.value);
                    set('order_type', updated.join(' '));
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Switch
          id="promo-cumulative"
          checked={form.is_cumulative ?? false}
          onCheckedChange={v => set('is_cumulative', v)}
        />
        <Label htmlFor="promo-cumulative" className="cursor-pointer">
          Promotion cumulable
        </Label>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="promo-active"
          checked={form.active}
          onCheckedChange={v => set('active', v)}
        />
        <Label htmlFor="promo-active" className="cursor-pointer">
          Promotion active
        </Label>
      </div>
    </div>
  );

  // ─── TAB: HORAIRES ────────────────────────────────────────────────────────
  const renderHorairesTab = () => {
    const isTimeRestricted = (form.time_slots?.length ?? 0) > 0;
    
    const getSchedulesForDay = (day: DayOfWeek): TimeSlot[] => 
      (form.time_slots ?? []).filter(slot => slot.day === day);
    
    const hasSchedulesForDay = (day: DayOfWeek): boolean => 
      getSchedulesForDay(day).length > 0;
    
    const addScheduleForDay = (day: DayOfWeek) => {
      const updated = [...(form.time_slots ?? [])];
      updated.push({ day, start_time: '11:00', end_time: '14:00' });
      set('time_slots', updated);
    };
    
    const removeSchedule = (day: DayOfWeek, idx: number) => {
      const schedules = getSchedulesForDay(day);
      const allSchedules = form.time_slots ?? [];
      const firstScheduleIndex = allSchedules.findIndex(s => s.day === day);
      const updated = allSchedules.filter((_, i) => i !== (firstScheduleIndex + idx));
      set('time_slots', updated);
    };
    
    const updateSchedule = (day: DayOfWeek, idx: number, field: 'start_time' | 'end_time', value: string) => {
      const schedules = getSchedulesForDay(day);
      const allSchedules = form.time_slots ?? [];
      const firstScheduleIndex = allSchedules.findIndex(s => s.day === day);
      const updated = [...allSchedules];
      updated[firstScheduleIndex + idx] = { ...updated[firstScheduleIndex + idx], [field]: value };
      set('time_slots', updated);
    };
    
    const copySchedulesToAllDays = (sourceDay: DayOfWeek) => {
      const sourceSchedules = getSchedulesForDay(sourceDay);
      if (sourceSchedules.length === 0) return;
      
      const updated = form.time_slots?.filter(s => s.day !== sourceDay) ?? [];
      ALL_DAYS.forEach(dayObj => {
        if (dayObj.key !== sourceDay) {
          sourceSchedules.forEach(schedule => {
            updated.push({ ...schedule, day: dayObj.key });
          });
        }
      });
      updated.push(...sourceSchedules);
      set('time_slots', updated);
    };

    return (
      <div className="space-y-4">
        {/* Switch général - Restreindre aux horaires */}
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <Switch
            id="restrict-hours"
            checked={isTimeRestricted}
            onCheckedChange={v => {
              if (!v) {
                set('time_slots', []);
              } else {
                set('time_slots', [{ day: 'monday', start_time: '11:00', end_time: '14:00' }]);
              }
            }}
          />
          <Label htmlFor="restrict-hours" className="cursor-pointer font-medium">
            Restreindre l'application aux horaires
          </Label>
        </div>

        {/* Sections par jour */}
        {isTimeRestricted && (
          <div className="space-y-3">
            {ALL_DAYS.map(dayObj => {
              const schedules = getSchedulesForDay(dayObj.key);
              const isEnabled = schedules.length > 0;
              
              return (
            <div key={dayObj.key} className="border border-border rounded-lg p-4">
              {/* Header avec jour et switch */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                <div className="flex items-center gap-3">
                  <Switch
                    id={`day-${dayObj.key}`}
                    checked={isEnabled}
                    onCheckedChange={v => {
                      if (v) {
                        addScheduleForDay(dayObj.key);
                      } else {
                        const updated = form.time_slots?.filter(s => s.day !== dayObj.key) ?? [];
                        set('time_slots', updated);
                      }
                    }}
                  />
                  <Label htmlFor={`day-${dayObj.key}`} className="cursor-pointer font-medium">
                    {dayObj.label}
                  </Label>
                </div>
                
                {/* Copier à tous */}
                {isEnabled && (
                  <button
                    onClick={() => copySchedulesToAllDays(dayObj.key)}
                    className="text-xs text-primary hover:underline cursor-pointer font-medium"
                  >
                    Copier à tous
                  </button>
                )}
              </div>

              {/* Schedules pour ce jour */}
              {isEnabled && (
                <div className="space-y-2">
                  {schedules.map((schedule, idx) => (
                    <div key={`${dayObj.key}-${idx}`} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Début</Label>
                        <Input
                          type="time"
                          value={schedule.start_time}
                          onChange={e => updateSchedule(dayObj.key, idx, 'start_time', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Fin</Label>
                        <Input
                          type="time"
                          value={schedule.end_time}
                          onChange={e => updateSchedule(dayObj.key, idx, 'end_time', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeSchedule(dayObj.key, idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => addScheduleForDay(dayObj.key)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un créneau
                  </Button>
                </div>
              )}
            </div>
          );
        })}
          </div>
        )}
      </div>
    );
  };

  // ─── TAB: PRODUITS ────────────────────────────────────────────────────────
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const renderProduitsTabContent = () => (
    <>
      {loadingProducts ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : (
        <div className="border border-border rounded-lg p-2 space-y-1">
          {filteredProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {products.length === 0 ? 'Aucun produit disponible' : 'Aucun résultat pour votre recherche'}
            </p>
          ) : (
            filteredProducts.map(product => {
              const isSelected = (form.product_ids ?? []).includes(product.product_id);
              const priceInCents = form.product_prices?.[product.product_id] ?? 0;
              
              return (
                <div
                  key={product.product_id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={product.image_url} alt={product.name} />
                    <AvatarFallback
                      style={{ backgroundColor: product.bg_color || '#e5e7eb' }}
                    />
                  </Avatar>
                  <span className="text-sm font-medium flex-1 truncate">{product.name}</span>
                  
                  {/* Prix pour NEWPRICE */}
                  {isSelected && form.discount_unit === 'NEWPRICE' && (
                    <div className="w-24">
                      <Input
                        id={`price-${product.product_id}`}
                        type="text"
                        inputMode="decimal"
                        value={priceDisplayValues[product.product_id] ?? priceToDisplayValue(priceInCents)}
                        onChange={(e) => {
                          setPriceDisplayValues(prev => ({ ...prev, [product.product_id]: e.target.value }));
                          set('product_prices', { ...(form.product_prices ?? {}), [product.product_id]: parsePriceInput(e.target.value) });
                        }}
                        onBlur={(e) => {
                          const formatted = priceToDisplayValue(parsePriceInput(e.target.value));
                          setPriceDisplayValues(prev => ({ ...prev, [product.product_id]: formatted }));
                        }}
                        placeholder="0,00"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  )}
                  
                  <Switch
                    checked={isSelected}
                    onCheckedChange={checked => {
                      const updated = [...(form.product_ids ?? [])];
                      if (checked && !updated.includes(product.product_id)) {
                        updated.push(product.product_id);
                        // Initialiser le prix si pas défini
                        if (!form.product_prices?.[product.product_id]) {
                          set('product_prices', { ...(form.product_prices ?? {}), [product.product_id]: 0 });
                        }
                      } else if (!checked) {
                        const idx = updated.indexOf(product.product_id);
                        if (idx > -1) updated.splice(idx, 1);
                        // Supprimer le prix
                        const prices = { ...(form.product_prices ?? {}) };
                        delete prices[product.product_id];
                        set('product_prices', prices);
                      }
                      set('product_ids', updated);
                    }}
                  />
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl h-[800px] flex flex-col p-0">
        {/* Fixed Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle>{initial ? 'Modifier la promotion' : 'Nouvelle promotion'}</DialogTitle>
        </DialogHeader>

        {/* Tabs Container */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs Navigation - Always Visible */}
          <TabsList className="w-full justify-start px-6 py-0 h-auto rounded-none border-b bg-transparent gap-6 flex-shrink-0">
            <TabsTrigger 
              value="general" 
              className="rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary pb-3 pt-3"
            >
              Général
            </TabsTrigger>
            <TabsTrigger 
              value="horaires" 
              className="rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary pb-3 pt-3"
            >
              Horaires
            </TabsTrigger>
            <TabsTrigger 
              value="produits" 
              className="rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary pb-3 pt-3"
            >
              Produits
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents Container */}
          <div className="flex-1 overflow-auto">
            {/* Général Tab - No scroll needed */}
            <TabsContent 
              value="general" 
              className="flex-1 overflow-auto px-6 py-4 data-[state=inactive]:hidden"
            >
              {renderGeneralTab()}
            </TabsContent>

            {/* Horaires Tab - Internal scroll */}
            <TabsContent 
              value="horaires" 
              className="flex-1 overflow-auto px-6 py-4 data-[state=inactive]:hidden flex flex-col"
            >
              <div className="overflow-y-auto flex-1 pr-2">
                {renderHorairesTab()}
              </div>
            </TabsContent>

            {/* Produits Tab - Fixed search + scrollable list */}
            <TabsContent 
              value="produits" 
              className="flex-1 overflow-auto px-6 py-4 data-[state=inactive]:hidden flex flex-col"
            >
              <div className="relative mb-3 flex-shrink-0">
                <Input
                  placeholder="Rechercher un produit…"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="overflow-y-auto flex-1 pr-2">
                {renderProduitsTabContent()}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Fixed Action Buttons */}
        <div className="px-6 py-4 border-t flex gap-3 flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-gradient-primary"
            disabled={!isValid || saving}
          >
            {saving ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PromotionsTab() {
  const { toast } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | undefined>(undefined);
  const [deleting, setDeleting] = useState<Promotion | null>(null);

  useEffect(() => {
    promotionsService.getPromotions().then(data => {
      setPromotions(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async (data: Omit<Promotion, 'id'>) => {
    if (editing) {
      const updated = await promotionsService.updatePromotion(editing.id, data);
      setPromotions(prev => prev.map(p => p.id === editing.id ? updated : p));
      toast({ title: 'Succès', description: 'Promotion mise à jour.' });
    } else {
      const created = await promotionsService.createPromotion(data);
      setPromotions(prev => [...prev, created]);
      toast({ title: 'Succès', description: 'Promotion créée.' });
    }
  };

  const handleToggle = async (promo: Promotion) => {
    const updated = await promotionsService.updatePromotion(promo.id, { active: !promo.active });
    setPromotions(prev => prev.map(p => p.id === promo.id ? updated : p));
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await promotionsService.deletePromotion(deleting.id);
    setPromotions(prev => prev.filter(p => p.id !== deleting.id));
    toast({ title: 'Supprimé', description: `"${deleting.name}" a été supprimée.` });
    setDeleting(null);
  };

  const openNew = () => { setEditing(undefined); setDialogOpen(true); };
  const openEdit = (p: Promotion) => { setEditing(p); setDialogOpen(true); };

  if (loading) return <TabSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {promotions.length} promotion{promotions.length !== 1 ? 's' : ''}
        </p>
        <Button className="bg-gradient-primary" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle promotion
        </Button>
      </div>

      {promotions.length === 0 ? (
        <EmptyState
          icon={<Tag className="w-10 h-10 opacity-30" />}
          message="Aucune promotion pour l'instant."
          action={<Button className="bg-gradient-primary mt-2" onClick={openNew}><Plus className="w-4 h-4 mr-2" />Créer une promotion</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {promotions.map(promo => (
            <Card key={promo.id} className={promo.active ? '' : 'opacity-60'}>
              <CardHeader className="flex flex-row items-start justify-between pb-2 gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base truncate">{promo.name}</CardTitle>
                    <Badge variant={promo.active ? 'default' : 'secondary'} className="shrink-0">
                      {promo.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {promo.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{promo.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(promo)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleting(promo)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="flex flex-wrap gap-2">
                  {/* Discount value */}
                  <div className="flex items-center gap-1.5 text-sm bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                    {promo.discount_unit === 'PERCENTAGE'
                      ? <><Percent className="w-3.5 h-3.5" />{promo.value}% de remise</>
                      : promo.discount_unit === 'CURRENCY'
                      ? <><Euro className="w-3.5 h-3.5" />{formatCents(promo.value)} de remise</>
                      : <>Individuel par article</>
                    }
                  </div>

                  {/* Discounted quantity */}
                  {promo.discounted_quantity && (
                    <div className="flex items-center gap-1.5 text-sm bg-blue/10 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                      Qté: {promo.discounted_quantity}
                    </div>
                  )}

                  {/* Cumulative badge */}
                  {promo.is_cumulative && (
                    <div className="text-xs bg-green/10 text-green-700 px-2.5 py-1 rounded-full font-medium">
                      Cumulable
                    </div>
                  )}

                  {/* Order type */}
                  {promo.order_type && (
                    <div className="text-xs bg-muted px-2.5 py-1 rounded-full font-medium">
                      {promo.order_type}
                    </div>
                  )}
                </div>

                {/* Min order value */}
                {promo.min_order_value && (
                  <div className="text-xs text-muted-foreground">
                    Commande min: {promo.min_order_unit === 'QTY' ? `${promo.min_order_value} articles` : `${formatCents(promo.min_order_value)}`}
                  </div>
                )}

                {/* Dates */}
                {(promo.start_date || promo.end_date) && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {promo.start_date && <span>Du {new Date(promo.start_date).toLocaleDateString('fr-FR')}</span>}
                    {promo.end_date && <span>au {new Date(promo.end_date).toLocaleDateString('fr-FR')}</span>}
                  </div>
                )}

                {/* Time slots info */}
                {promo.time_slots && promo.time_slots.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    {promo.time_slots.length} créneau{promo.time_slots.length !== 1 ? 'x' : ''} horaires
                  </div>
                )}

                {/* Products info */}
                {promo.product_ids && promo.product_ids.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <UtensilsCrossed className="w-3.5 h-3.5 inline mr-1" />
                    {promo.product_ids.length} produit{promo.product_ids.length !== 1 ? 's' : ''} associé{promo.product_ids.length !== 1 ? 's' : ''}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {promo.active ? 'Désactiver' : 'Activer'}
                  </span>
                  <Switch checked={promo.active} onCheckedChange={() => handleToggle(promo)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PromotionFormDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />

      <DeleteConfirm
        open={deleting !== null}
        title={deleting?.name ?? ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// AVAILABILITIES TAB
// ════════════════════════════════════════════════════════════════════════════

function AvailabilityFormDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial?: Availability;
  onClose: () => void;
  onSave: (data: Omit<Availability, 'id'>) => Promise<void>;
}) {
  const [form, setForm] = useState<Omit<Availability, 'id'>>(
    initial ? { ...initial, days: [...initial.days] } : emptyAvailability()
  );
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    setForm(initial ? { ...initial, days: [...initial.days] } : emptyAvailability());
    setActiveTab('general');
    setProductSearch('');
  }, [open, initial]);

  // Load products when dialog opens
  useEffect(() => {
    if (open && products.length === 0) {
      setLoadingProducts(true);
      menuService.getProducts().then(data => {
        setProducts(data);
        setLoadingProducts(false);
      }).catch(() => setLoadingProducts(false));
    }
  }, [open, products.length]);

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const toggleDay = (day: DayOfWeek) => {
    setForm(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day],
    }));
  };

  const isValid =
    form.name.trim().length > 0 &&
    form.days.length > 0 &&
    form.start_time.length > 0 &&
    form.end_time.length > 0;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // ─── TAB: GÉNÉRAL ──────────────────────────────────────────────────────────
  const renderGeneralTab = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="avail-name">Nom *</Label>
        <Input
          id="avail-name"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Ex: Service du midi, Brunch week-end…"
        />
      </div>

      <div className="space-y-2">
        <Label>Jours *</Label>
        <div className="flex flex-wrap gap-2">
          {ALL_DAYS.map(day => (
            <button
              key={day.key}
              type="button"
              onClick={() => toggleDay(day.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                form.days.includes(day.key)
                  ? 'bg-primary text-white border-primary'
                  : 'border-border text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {day.short}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="avail-start">Heure de début *</Label>
          <Input
            id="avail-start"
            type="time"
            value={form.start_time}
            onChange={e => set('start_time', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="avail-end">Heure de fin *</Label>
          <Input
            id="avail-end"
            type="time"
            value={form.end_time}
            onChange={e => set('end_time', e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Switch
          id="avail-active"
          checked={form.active}
          onCheckedChange={v => set('active', v)}
        />
        <Label htmlFor="avail-active" className="cursor-pointer">
          Disponibilité active
        </Label>
      </div>
    </div>
  );

  // ─── TAB: PRODUITS ────────────────────────────────────────────────────────
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const renderProduitsTabContent = () => (
    <>
      {loadingProducts ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : (
        <div className="border border-border rounded-lg p-2 space-y-1">
          {filteredProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {products.length === 0 ? 'Aucun produit disponible' : 'Aucun résultat pour votre recherche'}
            </p>
          ) : (
            filteredProducts.map(product => (
              <div
                key={product.product_id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={product.image_url} alt={product.name} />
                  <AvatarFallback
                    style={{ backgroundColor: product.bg_color || '#e5e7eb' }}
                  />
                </Avatar>
                <span className="text-sm font-medium flex-1 truncate">{product.name}</span>
                <Switch
                  checked={(form.product_ids ?? []).includes(product.product_id)}
                  onCheckedChange={checked => {
                    const updated = [...(form.product_ids ?? [])];
                    if (checked && !updated.includes(product.product_id)) {
                      updated.push(product.product_id);
                    } else if (!checked) {
                      const idx = updated.indexOf(product.product_id);
                      if (idx > -1) updated.splice(idx, 1);
                    }
                    set('product_ids', updated);
                  }}
                />
              </div>
            ))
          )}
        </div>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl h-[800px] flex flex-col p-0">
        {/* Fixed Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle>{initial ? 'Modifier la disponibilité' : 'Nouvelle disponibilité'}</DialogTitle>
        </DialogHeader>

        {/* Tabs Container */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs Navigation - Always Visible */}
          <TabsList className="w-full justify-start px-6 py-0 h-auto rounded-none border-b bg-transparent gap-6 flex-shrink-0">
            <TabsTrigger 
              value="general" 
              className="rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary pb-3 pt-3"
            >
              Général
            </TabsTrigger>
            <TabsTrigger 
              value="produits" 
              className="rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary pb-3 pt-3"
            >
              Produits
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents Container */}
          <div className="flex-1 overflow-auto">
            {/* Général Tab */}
            <TabsContent 
              value="general" 
              className="flex-1 overflow-auto px-6 py-4 data-[state=inactive]:hidden"
            >
              {renderGeneralTab()}
            </TabsContent>

            {/* Produits Tab - Fixed search + scrollable list */}
            <TabsContent 
              value="produits" 
              className="flex-1 overflow-auto px-6 py-4 data-[state=inactive]:hidden flex flex-col"
            >
              <div className="relative mb-3 flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit…"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="overflow-y-auto flex-1 pr-2">
                {renderProduitsTabContent()}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Fixed Action Buttons */}
        <div className="px-6 py-4 border-t flex gap-3 flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-gradient-primary"
            disabled={!isValid || saving}
          >
            {saving ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AvailabilitiesTab() {
  const { toast } = useToast();
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Availability | undefined>(undefined);
  const [deleting, setDeleting] = useState<Availability | null>(null);

  useEffect(() => {
    promotionsService.getAvailabilities().then(data => {
      setAvailabilities(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async (data: Omit<Availability, 'id'>) => {
    if (editing) {
      const updated = await promotionsService.updateAvailability(editing.id, data);
      setAvailabilities(prev => prev.map(a => a.id === editing.id ? updated : a));
      toast({ title: 'Succès', description: 'Disponibilité mise à jour.' });
    } else {
      const created = await promotionsService.createAvailability(data);
      setAvailabilities(prev => [...prev, created]);
      toast({ title: 'Succès', description: 'Disponibilité créée.' });
    }
  };

  const handleToggle = async (avail: Availability) => {
    const updated = await promotionsService.updateAvailability(avail.id, { active: !avail.active });
    setAvailabilities(prev => prev.map(a => a.id === avail.id ? updated : a));
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await promotionsService.deleteAvailability(deleting.id);
    setAvailabilities(prev => prev.filter(a => a.id !== deleting.id));
    toast({ title: 'Supprimé', description: `"${deleting.name}" a été supprimée.` });
    setDeleting(null);
  };

  const openNew = () => { setEditing(undefined); setDialogOpen(true); };
  const openEdit = (a: Availability) => { setEditing(a); setDialogOpen(true); };

  const dayLabel = (key: DayOfWeek) => ALL_DAYS.find(d => d.key === key)?.short ?? key;

  if (loading) return <TabSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {availabilities.length} disponibilité{availabilities.length !== 1 ? 's' : ''}
        </p>
        <Button className="bg-gradient-primary" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle disponibilité
        </Button>
      </div>

      {availabilities.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-10 h-10 opacity-30" />}
          message="Aucune disponibilité pour l'instant."
          action={<Button className="bg-gradient-primary mt-2" onClick={openNew}><Plus className="w-4 h-4 mr-2" />Créer une disponibilité</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {availabilities.map(avail => (
            <Card key={avail.id} className={avail.active ? '' : 'opacity-60'}>
              <CardHeader className="flex flex-row items-start justify-between pb-2 gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base truncate">{avail.name}</CardTitle>
                    <Badge variant={avail.active ? 'default' : 'secondary'} className="shrink-0">
                      {avail.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(avail)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleting(avail)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                {/* Time range */}
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{avail.start_time} – {avail.end_time}</span>
                </div>

                {/* Days */}
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.map(day => (
                    <span
                      key={day.key}
                      className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                        avail.days.includes(day.key)
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {dayLabel(day.key)}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {avail.active ? 'Désactiver' : 'Activer'}
                  </span>
                  <Switch checked={avail.active} onCheckedChange={() => handleToggle(avail)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AvailabilityFormDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />

      <DeleteConfirm
        open={deleting !== null}
        title={deleting?.name ?? ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

// ─── Shared utilities ─────────────────────────────────────────────────────────

function EmptyState({ icon, message, action }: { icon: React.ReactNode; message: string; action: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3 text-muted-foreground">
        {icon}
        <p>{message}</p>
        {action}
      </CardContent>
    </Card>
  );
}

function TabSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-7 w-36 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PromotionsAvailabilities() {
  const [activeTab, setActiveTab] = useState('promotions');

  const tabs = [
    { id: 'promotions', label: 'Promotions', icon: 'Tag' },
    { id: 'availabilities', label: 'Disponibilités', icon: 'Clock' },
  ];

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div>
            <h1 className="text-2xl font-bold text-foreground">Promotions &amp; Disponibilités</h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos offres promotionnelles et les créneaux de disponibilité de votre menu.
            </p>
          </div>
        }
      >
        <TabSystem
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          renderContent={(tabId) => {
            if (tabId === 'promotions') return <PromotionsTab />;
            if (tabId === 'availabilities') return <AvailabilitiesTab />;
            return null;
          }}
        />
      </PageContainer>
    </DashboardLayout>
  );
}
