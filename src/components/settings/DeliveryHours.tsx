import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Clock, Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { settingsService } from "@/services/settingsService";
import { DeliveryHour } from "@/types/settings";

// Horaires de livraison ScanNOrder (GET/PUT /pos/settings/delivery_hours,
// docs/DELIVERY_HOURS.md côté API). Ils ne s'appliquent qu'aux commandes en
// ligne : la caisse peut toujours saisir une livraison.

type Slot = { hour_from: string; hour_to: string };
type DaySchedule = { day: number; enabled: boolean; slots: Slot[] };

const DAYS_OF_WEEK = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 7, label: "Dimanche" },
];

// Premier créneau : le soir ; créneau ajouté : le midi.
const defaultSlot = (previous?: Slot): Slot => (
  previous ? { hour_from: "11:30", hour_to: "14:00" } : { hour_from: "19:00", hour_to: "22:30" }
);

const buildSchedules = (hours: DeliveryHour[]): DaySchedule[] => DAYS_OF_WEEK.map((day) => {
  const slots = hours
    .filter((hour) => hour.day_of_week === day.value)
    .map((hour) => ({ hour_from: hour.hour_from.slice(0, 5), hour_to: hour.hour_to.slice(0, 5) }));
  return { day: day.value, enabled: slots.length > 0, slots };
});

const toPayload = (schedules: DaySchedule[]): DeliveryHour[] => schedules.flatMap((schedule) => (
  schedule.enabled
    ? schedule.slots.map((slot) => ({ day_of_week: schedule.day, hour_from: slot.hour_from, hour_to: slot.hour_to }))
    : []
));

export const DeliveryHours = () => {
  const [restricted, setRestricted] = useState(false);
  const [schedules, setSchedules] = useState<DaySchedule[]>(() => buildSchedules([]));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const applyHours = (hours: DeliveryHour[]) => {
    setRestricted(hours.length > 0);
    setSchedules(hours.length > 0 ? buildSchedules(hours) : buildSchedules([]));
  };

  useEffect(() => {
    let cancelled = false;
    settingsService.getDeliveryHours()
      .then((hours) => { if (!cancelled) applyHours(hours); })
      .catch(() => {
        if (!cancelled) {
          toast({ title: "Erreur", description: "Impossible de charger les horaires de livraison.", variant: "destructive" });
        }
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const isBusy = isLoading || isSaving;

  const updateDay = (day: number, update: (schedule: DaySchedule) => DaySchedule) => {
    setSchedules((prev) => prev.map((schedule) => (schedule.day === day ? update(schedule) : schedule)));
  };

  const handleToggleRestricted = (checked: boolean) => {
    setRestricted(checked);
    // Point de départ : le soir tous les jours, à ajuster.
    if (checked && toPayload(schedules).length === 0) {
      setSchedules(DAYS_OF_WEEK.map((day) => ({ day: day.value, enabled: true, slots: [defaultSlot()] })));
    }
  };

  const handleToggleDay = (day: number, checked: boolean) => {
    updateDay(day, (schedule) => ({
      ...schedule,
      enabled: checked,
      slots: checked && schedule.slots.length === 0 ? [defaultSlot()] : schedule.slots,
    }));
  };

  const handleSlotChange = (day: number, index: number, field: keyof Slot, value: string) => {
    updateDay(day, (schedule) => ({
      ...schedule,
      slots: schedule.slots.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)),
    }));
  };

  const handleCopyToAll = (sourceDay: number) => {
    const source = schedules.find((schedule) => schedule.day === sourceDay);
    if (!source) return;
    setSchedules((prev) => prev.map((schedule) => (
      schedule.day === sourceDay
        ? schedule
        : { ...schedule, enabled: source.enabled, slots: source.slots.map((slot) => ({ ...slot })) }
    )));
  };

  const handleSave = async () => {
    const payload = restricted ? toPayload(schedules) : [];

    if (restricted) {
      for (const schedule of schedules) {
        if (!schedule.enabled) continue;
        const dayLabel = DAYS_OF_WEEK.find((d) => d.value === schedule.day)?.label ?? "";
        for (const slot of schedule.slots) {
          if (!slot.hour_from || !slot.hour_to) {
            toast({ title: "Validation", description: `Renseignez les horaires pour ${dayLabel}.`, variant: "destructive" });
            return;
          }
          if (slot.hour_from === slot.hour_to) {
            toast({ title: "Validation", description: `Le début et la fin d'un créneau doivent être différents (${dayLabel}).`, variant: "destructive" });
            return;
          }
        }
      }
      if (payload.length === 0) {
        toast({
          title: "Validation",
          description: "Ajoutez au moins un créneau, ou désactivez la livraison dans l'onglet Prise de commande.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const saved = await settingsService.replaceDeliveryHours(payload);
      applyHours(saved);
      toast({ title: "Horaires de livraison enregistrés" });
    } catch {
      toast({ title: "Erreur", description: "Les horaires de livraison n'ont pas pu être enregistrés.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div>
          <p className="font-medium text-sm">Limiter les horaires de livraison</p>
          <p className="text-sm text-muted-foreground mt-1">
            {restricted
              ? "Les commandes en ligne en livraison ne sont acceptées que sur les créneaux ci-dessous. Un jour désactivé = pas de livraison ce jour-là."
              : "Désactivé : la livraison est proposée pendant toutes vos heures d'ouverture."}
          </p>
        </div>
        <Switch checked={restricted} disabled={isBusy} onCheckedChange={handleToggleRestricted} />
      </div>

      {restricted && schedules.map((schedule) => {
        const dayLabel = DAYS_OF_WEEK.find((d) => d.value === schedule.day)?.label ?? "";
        return (
          <div key={schedule.day} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  checked={schedule.enabled}
                  disabled={isBusy}
                  onCheckedChange={(checked) => handleToggleDay(schedule.day, checked)}
                />
                <span className="font-medium text-sm">{dayLabel}</span>
                {!schedule.enabled && <span className="text-xs text-muted-foreground">Pas de livraison</span>}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto gap-1 px-2 py-1 text-xs text-primary"
                disabled={isBusy}
                onClick={() => handleCopyToAll(schedule.day)}
              >
                <Copy className="h-3.5 w-3.5" />
                Copier à tous
              </Button>
            </div>

            {schedule.enabled && (
              <div className="mt-3 space-y-2">
                {schedule.slots.map((slot, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input
                      type="time"
                      className="w-32"
                      value={slot.hour_from}
                      disabled={isBusy}
                      onChange={(e) => handleSlotChange(schedule.day, index, "hour_from", e.target.value)}
                    />
                    <span className="text-sm text-muted-foreground">à</span>
                    <Input
                      type="time"
                      className="w-32"
                      value={slot.hour_to}
                      disabled={isBusy}
                      onChange={(e) => handleSlotChange(schedule.day, index, "hour_to", e.target.value)}
                    />
                    {slot.hour_from && slot.hour_to && slot.hour_to < slot.hour_from && (
                      <span className="text-xs text-muted-foreground">(le lendemain)</span>
                    )}
                    {schedule.slots.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isBusy}
                        onClick={() => updateDay(schedule.day, (s) => ({ ...s, slots: s.slots.filter((_, i) => i !== index) }))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  variant="link"
                  size="sm"
                  className="h-auto gap-1 px-0 text-xs"
                  disabled={isBusy}
                  onClick={() => updateDay(schedule.day, (s) => ({ ...s, slots: [...s.slots, defaultSlot(s.slots[s.slots.length - 1])] }))}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter un créneau
                </Button>
              </div>
            )}
          </div>
        );
      })}

      <Button className="w-full sm:w-auto" onClick={handleSave} disabled={isBusy}>
        {isSaving ? "Enregistrement..." : "Enregistrer les horaires de livraison"}
      </Button>
    </div>
  );
};
