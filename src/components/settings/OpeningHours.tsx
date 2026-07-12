import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Clock, Copy, Plus, Trash2, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { HourOfOperation, HourOfOperationPayload } from "@/types/settings";

type OpeningHoursProps = {
  hours: HourOfOperation[];
  isSaving: boolean;
  onCreateHour: (payload: HourOfOperationPayload) => Promise<HourOfOperation | null>;
  onUpdateHour: (hourId: string, payload: HourOfOperationPayload) => Promise<HourOfOperation | null>;
  onDeleteHour: (hourId: string) => Promise<boolean>;
  onSaved?: () => Promise<void> | void;
};

type Slot = {
  id?: string;
  hour_from: string;
  hour_to: string;
  booking_capacity: number;
};

type DaySchedule = {
  day: number;
  enabled: boolean;
  slots: Slot[];
};

const DAYS_OF_WEEK = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 7, label: "Dimanche" },
];

const DEFAULT_VALID_FROM = "2020-01-01 00:00:00";

const toInputTime = (value?: string | null): string => {
  if (!value) return "";
  return value.slice(0, 5);
};

const toApiTime = (value: string): string => {
  if (!value) return "";
  return value.length === 5 ? `${value}:00` : value;
};

const buildDaySchedules = (hours: HourOfOperation[]): DaySchedule[] => {
  const byDay = new Map<number, Slot[]>();
  DAYS_OF_WEEK.forEach((day) => byDay.set(day.value, []));

  hours
    .filter((hour) => hour.enabled)
    .forEach((hour) => {
      const from = Math.max(1, hour.day_of_week_from);
      const to = Math.min(7, hour.day_of_week_to);

      for (let day = from; day <= to; day += 1) {
        const slots = byDay.get(day) ?? [];
        slots.push({
          // Only the range's first day keeps the record id, so editing or
          // removing a slot on another day never mutates/deletes the shared record.
          id: day === hour.day_of_week_from ? hour.id : undefined,
          hour_from: toInputTime(hour.hour_from),
          hour_to: toInputTime(hour.hour_to),
          booking_capacity: hour.booking_capacity,
        });
        byDay.set(day, slots);
      }
    });

  return DAYS_OF_WEEK.map((day) => {
    const slots = byDay.get(day.value) ?? [];
    return { day: day.value, enabled: slots.length > 0, slots };
  });
};

const defaultSlot = (previous?: Slot): Slot => ({
  hour_from: previous ? previous.hour_to : "09:00",
  hour_to: "22:00",
  booking_capacity: previous?.booking_capacity ?? 20,
});

const toPayload = (day: number, slot: Slot): HourOfOperationPayload => ({
  day_of_week_from: day,
  day_of_week_to: day,
  hour_from: toApiTime(slot.hour_from),
  hour_to: toApiTime(slot.hour_to),
  booking_capacity: slot.booking_capacity,
  first_booking_time: null,
  last_booking_time: null,
  valid_from: DEFAULT_VALID_FROM,
  valid_to: null,
});

export const OpeningHours = ({
  hours,
  isSaving,
  onCreateHour,
  onUpdateHour,
  onDeleteHour,
  onSaved,
}: OpeningHoursProps) => {
  const [schedules, setSchedules] = useState<DaySchedule[]>(() => buildDaySchedules(hours));
  const [isPersisting, setIsPersisting] = useState(false);

  useEffect(() => {
    setSchedules(buildDaySchedules(hours));
  }, [hours]);

  const isBusy = isSaving || isPersisting;

  const setDaySlots = (day: number, slots: Slot[]) => {
    setSchedules((prev) => prev.map((schedule) => (
      schedule.day === day ? { ...schedule, slots } : schedule
    )));
  };

  const handleToggleDay = (day: number, checked: boolean) => {
    setSchedules((prev) => prev.map((schedule) => {
      if (schedule.day !== day) return schedule;
      if (checked && schedule.slots.length === 0) {
        return { ...schedule, enabled: true, slots: [defaultSlot()] };
      }
      return { ...schedule, enabled: checked };
    }));
  };

  const handleAddSlot = (day: number) => {
    const schedule = schedules.find((item) => item.day === day);
    if (!schedule) return;
    setDaySlots(day, [...schedule.slots, defaultSlot(schedule.slots[schedule.slots.length - 1])]);
  };

  const handleRemoveSlot = (day: number, slotIndex: number) => {
    const schedule = schedules.find((item) => item.day === day);
    if (!schedule) return;
    setDaySlots(day, schedule.slots.filter((_, index) => index !== slotIndex));
  };

  const handleSlotChange = (
    day: number,
    slotIndex: number,
    field: "hour_from" | "hour_to" | "booking_capacity",
    value: string | number,
  ) => {
    setSchedules((prev) => prev.map((schedule) => {
      if (schedule.day !== day) return schedule;
      return {
        ...schedule,
        slots: schedule.slots.map((slot, index) => (
          index === slotIndex ? { ...slot, [field]: value } : slot
        )),
      };
    }));
  };

  const handleCopyToAll = (sourceDay: number) => {
    const source = schedules.find((item) => item.day === sourceDay);
    if (!source || source.slots.length === 0) return;

    setSchedules((prev) => prev.map((schedule) => {
      if (schedule.day === sourceDay) return schedule;
      return {
        ...schedule,
        enabled: true,
        slots: source.slots.map((slot) => ({
          hour_from: slot.hour_from,
          hour_to: slot.hour_to,
          booking_capacity: slot.booking_capacity,
        })),
      };
    }));
  };

  const handleSave = async () => {
    for (const schedule of schedules) {
      if (!schedule.enabled) continue;
      for (const slot of schedule.slots) {
        const dayLabel = DAYS_OF_WEEK.find((d) => d.value === schedule.day)?.label ?? "";
        if (!slot.hour_from || !slot.hour_to) {
          toast({
            title: "Validation",
            description: `Renseignez les horaires pour ${dayLabel}.`,
            variant: "destructive",
          });
          return;
        }
        if (slot.hour_from >= slot.hour_to) {
          toast({
            title: "Validation",
            description: `L'heure d'ouverture doit être avant l'heure de fermeture (${dayLabel}).`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    setIsPersisting(true);
    try {
      const originalById = new Map<string, HourOfOperation>();
      hours.filter((hour) => hour.enabled).forEach((hour) => originalById.set(hour.id, hour));

      const retainedIds = new Set<string>();
      schedules.forEach((schedule) => {
        if (!schedule.enabled) return;
        schedule.slots.forEach((slot) => {
          if (slot.id) retainedIds.add(slot.id);
        });
      });

      const idsToDelete = Array.from(originalById.keys()).filter((id) => !retainedIds.has(id));
      let changeCount = idsToDelete.length;

      await Promise.all(idsToDelete.map((id) => onDeleteHour(id)));

      for (const schedule of schedules) {
        if (!schedule.enabled) continue;
        for (const slot of schedule.slots) {
          const payload = toPayload(schedule.day, slot);

          if (slot.id) {
            const original = originalById.get(slot.id);
            const changed = !original
              || original.day_of_week_from !== schedule.day
              || original.day_of_week_to !== schedule.day
              || toInputTime(original.hour_from) !== slot.hour_from
              || toInputTime(original.hour_to) !== slot.hour_to
              || original.booking_capacity !== slot.booking_capacity;

            if (changed) {
              changeCount += 1;
              await onUpdateHour(slot.id, payload);
            }
          } else {
            changeCount += 1;
            await onCreateHour(payload);
          }
        }
      }

      if (changeCount === 0) {
        toast({ title: "Aucune modification à enregistrer" });
      } else {
        await onSaved?.();
      }
    } finally {
      setIsPersisting(false);
    }
  };

  return (
    <div className="space-y-3">
      {schedules.map((schedule) => {
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
              </div>

              {schedule.enabled && (
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
              )}
            </div>

            {schedule.enabled && (
              <div className="mt-3 space-y-2">
                {schedule.slots.map((slot, slotIndex) => (
                  <div key={slotIndex} className="flex flex-wrap items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input
                      type="time"
                      className="w-32"
                      value={slot.hour_from}
                      disabled={isBusy}
                      onChange={(e) => handleSlotChange(schedule.day, slotIndex, "hour_from", e.target.value)}
                    />
                    <span className="text-sm text-muted-foreground">à</span>
                    <Input
                      type="time"
                      className="w-32"
                      value={slot.hour_to}
                      disabled={isBusy}
                      onChange={(e) => handleSlotChange(schedule.day, slotIndex, "hour_to", e.target.value)}
                    />
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <Input
                        type="number"
                        min={0}
                        className="w-20"
                        value={slot.booking_capacity}
                        disabled={isBusy}
                        onChange={(e) => handleSlotChange(schedule.day, slotIndex, "booking_capacity", Number(e.target.value || 0))}
                      />
                      <span className="text-xs text-muted-foreground">couverts</span>
                    </div>
                    {schedule.slots.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isBusy}
                        onClick={() => handleRemoveSlot(schedule.day, slotIndex)}
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
                  onClick={() => handleAddSlot(schedule.day)}
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
        {isPersisting ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
};
