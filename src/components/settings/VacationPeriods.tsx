import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { VacationPeriod, VacationPeriodPayload } from "@/types/settings";

type VacationPeriodsProps = {
  periods: VacationPeriod[];
  isSaving: boolean;
  onCreatePeriod: (payload: VacationPeriodPayload) => Promise<VacationPeriod | null>;
  onUpdatePeriod: (id: string, payload: VacationPeriodPayload) => Promise<VacationPeriod | null>;
  onDeletePeriod: (id: string) => Promise<boolean>;
};

type Draft = {
  id?: string;
  label: string;
  start_at: string;
  end_at: string;
};

// Les champs <input type="datetime-local"> attendent/rendent "YYYY-MM-DDTHH:MM",
// l'API attend/rend "YYYY-MM-DD HH:MM:SS" (même convention que les créneaux
// d'ouverture, cf. OpeningHours.tsx).
const toInputDateTime = (value: string): string => {
  if (!value) return "";
  return value.replace(" ", "T").slice(0, 16);
};

const toApiDateTime = (value: string): string => {
  if (!value) return "";
  const withSpace = value.replace("T", " ");
  return withSpace.length === 16 ? `${withSpace}:00` : withSpace;
};

const defaultStart = (): string => {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now.toISOString().slice(0, 16);
};

const defaultEnd = (): string => {
  const end = new Date();
  end.setDate(end.getDate() + 1);
  end.setMinutes(0, 0, 0);
  return end.toISOString().slice(0, 16);
};

const buildDrafts = (periods: VacationPeriod[]): Draft[] => periods.map((period) => ({
  id: period.id,
  label: period.label ?? "",
  start_at: toInputDateTime(period.start_at),
  end_at: toInputDateTime(period.end_at),
}));

export const VacationPeriods = ({
  periods,
  isSaving,
  onCreatePeriod,
  onUpdatePeriod,
  onDeletePeriod,
}: VacationPeriodsProps) => {
  const [drafts, setDrafts] = useState<Draft[]>(() => buildDrafts(periods));
  const [isPersisting, setIsPersisting] = useState(false);

  useEffect(() => {
    setDrafts(buildDrafts(periods));
  }, [periods]);

  const isBusy = isSaving || isPersisting;

  const handleAdd = () => {
    setDrafts((prev) => [...prev, { label: "", start_at: defaultStart(), end_at: defaultEnd() }]);
  };

  const handleRemove = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof Draft, value: string) => {
    setDrafts((prev) => prev.map((draft, i) => (i === index ? { ...draft, [field]: value } : draft)));
  };

  const handleSave = async () => {
    for (const draft of drafts) {
      if (!draft.start_at || !draft.end_at) {
        toast({
          title: "Validation",
          description: "Renseignez une date de début et de fin pour chaque période.",
          variant: "destructive",
        });
        return;
      }
      if (draft.start_at >= draft.end_at) {
        toast({
          title: "Validation",
          description: "La date de début doit être avant la date de fin.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsPersisting(true);
    try {
      const originalById = new Map(periods.map((period) => [period.id, period]));
      const retainedIds = new Set(drafts.filter((d) => d.id).map((d) => d.id as string));

      const idsToDelete = periods.map((p) => p.id).filter((id) => !retainedIds.has(id));
      let changeCount = idsToDelete.length;
      await Promise.all(idsToDelete.map((id) => onDeletePeriod(id)));

      for (const draft of drafts) {
        const payload: VacationPeriodPayload = {
          label: draft.label.trim() || null,
          start_at: toApiDateTime(draft.start_at),
          end_at: toApiDateTime(draft.end_at),
        };

        if (draft.id) {
          const original = originalById.get(draft.id);
          const changed = !original
            || (original.label ?? "") !== draft.label.trim()
            || original.start_at !== payload.start_at
            || original.end_at !== payload.end_at;

          if (changed) {
            changeCount += 1;
            await onUpdatePeriod(draft.id, payload);
          }
        } else {
          changeCount += 1;
          await onCreatePeriod(payload);
        }
      }

      if (changeCount === 0) {
        toast({ title: "Aucune modification à enregistrer" });
      }
    } finally {
      setIsPersisting(false);
    }
  };

  return (
    <div className="space-y-3">
      {drafts.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune période de vacances définie.</p>
      )}

      {drafts.map((draft, index) => (
        <div key={draft.id ?? `new-${index}`} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
          <Input
            placeholder="Libellé (optionnel)"
            className="w-full sm:w-40"
            value={draft.label}
            disabled={isBusy}
            onChange={(e) => handleChange(index, "label", e.target.value)}
          />
          <Input
            type="datetime-local"
            className="w-full sm:w-56"
            value={draft.start_at}
            disabled={isBusy}
            onChange={(e) => handleChange(index, "start_at", e.target.value)}
          />
          <span className="text-sm text-muted-foreground">à</span>
          <Input
            type="datetime-local"
            className="w-full sm:w-56"
            value={draft.end_at}
            disabled={isBusy}
            onChange={(e) => handleChange(index, "end_at", e.target.value)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isBusy}
            onClick={() => handleRemove(index)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="link"
          size="sm"
          className="h-auto gap-1 px-0 text-xs"
          disabled={isBusy}
          onClick={handleAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter une période
        </Button>
      </div>

      <Button className="w-full sm:w-auto" onClick={handleSave} disabled={isBusy}>
        {isPersisting ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
};
