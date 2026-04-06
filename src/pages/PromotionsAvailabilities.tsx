import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Plus, Pencil, Trash2, Tag, Clock, Percent, Euro, CalendarDays } from 'lucide-react';
import { promotionsService } from '@/services/promotionsService';
import { Promotion, Availability, DayOfWeek } from '@/types/promotions';
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
  active: true,
});

const emptyAvailability = (): Omit<Availability, 'id'> => ({
  name: '',
  days: [],
  start_time: '11:00',
  end_time: '14:00',
  active: true,
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
  const [saving, setSaving] = useState(false);

  // reset when opening
  useEffect(() => {
    setForm(initial ? { ...initial } : emptyPromotion());
  }, [open, initial]);

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

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Modifier la promotion' : 'Nouvelle promotion'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
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
              <Select value={form.type} onValueChange={v => set('type', v as Promotion['type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                  <SelectItem value="fixed">Montant fixe (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="promo-value">
                Valeur * {form.type === 'percentage' ? '(%)' : '(€)'}
              </Label>
              <Input
                id="promo-value"
                type="number"
                min={0}
                step={form.type === 'percentage' ? 1 : 0.01}
                max={form.type === 'percentage' ? 100 : undefined}
                value={form.type === 'percentage' ? form.value : (form.value / 100).toFixed(2)}
                onChange={e => {
                  const raw = parseFloat(e.target.value || '0');
                  set('value', form.type === 'percentage' ? raw : Math.round(raw * 100));
                }}
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
              <Label htmlFor="promo-start">Date de début</Label>
              <Input
                id="promo-start"
                type="date"
                value={form.start_date ?? ''}
                onChange={e => set('start_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-end">Date de fin</Label>
              <Input
                id="promo-end"
                type="date"
                value={form.end_date ?? ''}
                onChange={e => set('end_date', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Switch
              id="promo-active"
              checked={form.active}
              onCheckedChange={v => set('active', v)}
            />
            <Label htmlFor="promo-active" className="cursor-pointer">
              Promotion active
            </Label>
          </div>

          <div className="flex gap-3 pt-2">
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
                    {promo.type === 'percentage'
                      ? <><Percent className="w-3.5 h-3.5" />{promo.value}% de remise</>
                      : <><Euro className="w-3.5 h-3.5" />{formatCents(promo.value)} de remise</>
                    }
                  </div>

                  {/* Code */}
                  {promo.code && (
                    <div className="flex items-center gap-1.5 text-sm bg-muted px-2.5 py-1 rounded-full font-mono">
                      {promo.code}
                    </div>
                  )}
                </div>

                {/* Dates */}
                {(promo.start_date || promo.end_date) && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {promo.start_date && <span>Du {new Date(promo.start_date).toLocaleDateString('fr-FR')}</span>}
                    {promo.end_date && <span>au {new Date(promo.end_date).toLocaleDateString('fr-FR')}</span>}
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

  useEffect(() => {
    setForm(initial ? { ...initial, days: [...initial.days] } : emptyAvailability());
  }, [open, initial]);

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

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Modifier la disponibilité' : 'Nouvelle disponibilité'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
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

          <div className="flex items-center gap-3 pt-1">
            <Switch
              id="avail-active"
              checked={form.active}
              onCheckedChange={v => set('active', v)}
            />
            <Label htmlFor="avail-active" className="cursor-pointer">
              Disponibilité active
            </Label>
          </div>

          <div className="flex gap-3 pt-2">
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
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Promotions &amp; Disponibilités</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos offres promotionnelles et les créneaux de disponibilité de votre menu.
          </p>
        </div>

        <Tabs defaultValue="promotions">
          <TabsList>
            <TabsTrigger value="promotions" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Promotions
            </TabsTrigger>
            <TabsTrigger value="availabilities" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Disponibilités
            </TabsTrigger>
          </TabsList>

          <TabsContent value="promotions" className="mt-4">
            <PromotionsTab />
          </TabsContent>

          <TabsContent value="availabilities" className="mt-4">
            <AvailabilitiesTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
