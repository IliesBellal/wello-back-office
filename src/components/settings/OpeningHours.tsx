import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { HourOfOperation, HourOfOperationPayload } from "@/types/settings";

type OpeningHoursProps = {
  hours: HourOfOperation[];
  isSaving: boolean;
  onCreateHour: (payload: HourOfOperationPayload) => Promise<unknown>;
  onUpdateHour: (hourId: string, payload: HourOfOperationPayload) => Promise<unknown>;
  onDeleteHour: (hourId: string) => Promise<boolean>;
};

type HourFormState = {
  day_of_week_from: string;
  day_of_week_to: string;
  hour_from: string;
  hour_to: string;
  booking_capacity: string;
  first_booking_time: string;
  last_booking_time: string;
  valid_from: string;
  valid_to: string;
};

const DAYS_OF_WEEK = [
  { value: "1", label: "Lundi" },
  { value: "2", label: "Mardi" },
  { value: "3", label: "Mercredi" },
  { value: "4", label: "Jeudi" },
  { value: "5", label: "Vendredi" },
  { value: "6", label: "Samedi" },
  { value: "7", label: "Dimanche" },
];

const toInputTime = (value?: string | null): string => {
  if (!value) return "";
  return value.slice(0, 5);
};

const toApiTime = (value: string): string => {
  if (!value) return "";
  if (value.length === 8) return value;
  return `${value}:00`;
};

const toInputDateTime = (value?: string | null): string => {
  if (!value) return "";
  const normalized = value.replace(" ", "T");
  const parts = normalized.split(":");
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return normalized;
};

const toApiDateTime = (value: string): string => {
  if (!value) return "";
  const normalized = value.replace("T", " ");
  return normalized.length === 16 ? `${normalized}:00` : normalized;
};

const defaultFormState = (): HourFormState => {
  const now = new Date();
  now.setSeconds(0, 0);
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return {
    day_of_week_from: "1",
    day_of_week_to: "1",
    hour_from: "09:00",
    hour_to: "18:00",
    booking_capacity: "20",
    first_booking_time: "",
    last_booking_time: "",
    valid_from: localIso,
    valid_to: "",
  };
};

const mapHourToFormState = (hour: HourOfOperation): HourFormState => ({
  day_of_week_from: String(hour.day_of_week_from),
  day_of_week_to: String(hour.day_of_week_to),
  hour_from: toInputTime(hour.hour_from),
  hour_to: toInputTime(hour.hour_to),
  booking_capacity: String(hour.booking_capacity),
  first_booking_time: toInputTime(hour.first_booking_time),
  last_booking_time: toInputTime(hour.last_booking_time),
  valid_from: toInputDateTime(hour.valid_from),
  valid_to: toInputDateTime(hour.valid_to),
});

const dayLabel = (value: number): string => {
  return DAYS_OF_WEEK.find((day) => day.value === String(value))?.label ?? `Jour ${value}`;
};

const dayRangeLabel = (from: number, to: number): string => {
  if (from === to) return dayLabel(from);
  return `${dayLabel(from)} - ${dayLabel(to)}`;
};

export const OpeningHours = ({
  hours,
  isSaving,
  onCreateHour,
  onUpdateHour,
  onDeleteHour,
}: OpeningHoursProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingHourId, setEditingHourId] = useState<string | null>(null);
  const [formState, setFormState] = useState<HourFormState>(defaultFormState());

  const sortedHours = useMemo(
    () => [...hours].filter((hour) => hour.enabled).sort((a, b) => {
      if (a.day_of_week_from !== b.day_of_week_from) {
        return a.day_of_week_from - b.day_of_week_from;
      }
      return a.hour_from.localeCompare(b.hour_from);
    }),
    [hours]
  );

  const openCreateDialog = () => {
    setEditingHourId(null);
    setFormState(defaultFormState());
    setShowDialog(true);
  };

  const openEditDialog = (hour: HourOfOperation) => {
    setEditingHourId(hour.id);
    setFormState(mapHourToFormState(hour));
    setShowDialog(true);
  };

  const handleDelete = async (hourId: string) => {
    await onDeleteHour(hourId);
  };

  const handleSubmit = async () => {
    if (!formState.hour_from || !formState.hour_to || !formState.valid_from) {
      toast({
        title: "Erreur",
        description: "Les champs jour, heures et date de début sont obligatoires.",
        variant: "destructive",
      });
      return;
    }

    const payload: HourOfOperationPayload = {
      day_of_week_from: Number(formState.day_of_week_from),
      day_of_week_to: Number(formState.day_of_week_to),
      hour_from: toApiTime(formState.hour_from),
      hour_to: toApiTime(formState.hour_to),
      booking_capacity: Number(formState.booking_capacity || 0),
      first_booking_time: formState.first_booking_time ? toApiTime(formState.first_booking_time) : null,
      last_booking_time: formState.last_booking_time ? toApiTime(formState.last_booking_time) : null,
      valid_from: toApiDateTime(formState.valid_from),
      valid_to: formState.valid_to ? toApiDateTime(formState.valid_to) : null,
    };

    if (editingHourId) {
      const updated = await onUpdateHour(editingHourId, payload);
      if (!updated) return;
    } else {
      const created = await onCreateHour(payload);
      if (!created) return;
    }

    setShowDialog(false);
    setEditingHourId(null);
  };

  return (
    <div className="space-y-3">
      {sortedHours.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucun horaire configuré.
        </div>
      ) : (
        sortedHours.map((hour) => (
          <div
            key={hour.id}
            className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <p className="font-medium text-sm">{dayRangeLabel(hour.day_of_week_from, hour.day_of_week_to)}</p>
              <p className="text-sm text-muted-foreground">
                {toInputTime(hour.hour_from)} - {toInputTime(hour.hour_to)} | Capacite: {hour.booking_capacity}
              </p>
              {(hour.first_booking_time || hour.last_booking_time) && (
                <p className="text-xs text-muted-foreground">
                  Reservation: {toInputTime(hour.first_booking_time)} - {toInputTime(hour.last_booking_time)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={isSaving}
                onClick={() => openEditDialog(hour)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={isSaving}
                onClick={() => handleDelete(hour.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))
      )}

      <Button variant="outline" className="mt-4 w-full" onClick={openCreateDialog} disabled={isSaving}>
        <Plus className="mr-2 h-4 w-4" />
        Ajouter un horaire
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {editingHourId ? "Modifier un horaire" : "Ajouter un horaire"}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations du créneau d'ouverture.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Jour de debut</Label>
              <Select
                value={formState.day_of_week_from}
                onValueChange={(value) => setFormState((prev) => ({ ...prev, day_of_week_from: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={`from-${day.value}`} value={day.value}>{day.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Jour de fin</Label>
              <Select
                value={formState.day_of_week_to}
                onValueChange={(value) => setFormState((prev) => ({ ...prev, day_of_week_to: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={`to-${day.value}`} value={day.value}>{day.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Heure d'ouverture</Label>
              <Input
                type="time"
                value={formState.hour_from}
                onChange={(e) => setFormState((prev) => ({ ...prev, hour_from: e.target.value }))}
              />
            </div>

            <div>
              <Label>Heure de fermeture</Label>
              <Input
                type="time"
                value={formState.hour_to}
                onChange={(e) => setFormState((prev) => ({ ...prev, hour_to: e.target.value }))}
              />
            </div>

            <div>
              <Label>Capacite de reservation</Label>
              <Input
                type="number"
                min={0}
                value={formState.booking_capacity}
                onChange={(e) => setFormState((prev) => ({ ...prev, booking_capacity: e.target.value }))}
              />
            </div>

            <div>
              <Label>Premier horaire de reservation</Label>
              <Input
                type="time"
                value={formState.first_booking_time}
                onChange={(e) => setFormState((prev) => ({ ...prev, first_booking_time: e.target.value }))}
              />
            </div>

            <div>
              <Label>Dernier horaire de reservation</Label>
              <Input
                type="time"
                value={formState.last_booking_time}
                onChange={(e) => setFormState((prev) => ({ ...prev, last_booking_time: e.target.value }))}
              />
            </div>

            <div>
              <Label>Valide a partir du</Label>
              <Input
                type="datetime-local"
                value={formState.valid_from}
                onChange={(e) => setFormState((prev) => ({ ...prev, valid_from: e.target.value }))}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Valide jusqu'au (optionnel)</Label>
              <Input
                type="datetime-local"
                value={formState.valid_to}
                onChange={(e) => setFormState((prev) => ({ ...prev, valid_to: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={isSaving}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {editingHourId ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
