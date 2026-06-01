import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { qk } from "@/lib/queryKeys";
import { holidaysApi } from "@/services/welloApi";
import type { PlanningHoliday } from "@/types/planning";

interface HolidaysModalProps {
  open: boolean;
  from: string;
  to: string;
  onOpenChange: (open: boolean) => void;
}

interface HolidayRowProps {
  holiday: PlanningHoliday;
  onToggle: (h: PlanningHoliday, disabled: boolean) => void;
  onCommitMultiplier: (h: PlanningHoliday, value: number | null) => void;
  busy: boolean;
}

function HolidayRow({ holiday, onToggle, onCommitMultiplier, busy }: HolidayRowProps) {
  // Local string state so we can validate before patching the API.
  const initial =
    holiday.holiday_multiplier !== null && holiday.holiday_multiplier !== undefined
      ? String(holiday.holiday_multiplier)
      : "";
  const [draft, setDraft] = useState<string>(initial);

  // Keep in sync when server state changes after a mutation.
  useEffect(() => setDraft(initial), [initial]);

  const dirty = draft !== initial;
  const enabled = !holiday.disabled;
  const overridden = holiday.is_overridden ?? false;

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === "") {
      onCommitMultiplier(holiday, null);
      return;
    }
    const value = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(value) || value < 1) {
      toast.error("La majoration doit être un nombre ≥ 1.");
      return;
    }
    onCommitMultiplier(holiday, value);
  }

  function reset() {
    onCommitMultiplier(holiday, null);
  }

  return (
    <div
      className={cn(
        "rounded-md border bg-card p-3 transition-opacity",
        !enabled && "opacity-60",
        enabled && "bg-amber-50/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            {holiday.label}
            {overridden && (
              <span className="rounded bg-amber-200/60 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-900">
                Override
              </span>
            )}
            {holiday.region && (
              <span className="text-[10px] uppercase text-muted-foreground">{holiday.region}</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground capitalize">
            {format(parseISO(holiday.date), "EEEE d MMMM yyyy", { locale: fr })}
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => onToggle(holiday, !v)}
          disabled={busy}
          aria-label="Actif"
        />
      </div>

      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <label
            htmlFor={`mult-${holiday.date}`}
            className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            Majoration
          </label>
          <Input
            id={`mult-${holiday.date}`}
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
            }}
            placeholder="Par défaut"
            className="h-8 text-sm"
            disabled={busy || !enabled}
          />
        </div>
        {dirty && (
          <Button
            type="button"
            size="sm"
            onClick={commit}
            disabled={busy}
            className="h-8"
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            Appliquer
          </Button>
        )}
        {overridden && holiday.holiday_multiplier !== null && holiday.holiday_multiplier !== undefined && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={reset}
            disabled={busy}
            className="h-8"
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Réinitialiser
          </Button>
        )}
      </div>
    </div>
  );
}

export function HolidaysModal({ open, from, to, onOpenChange }: HolidaysModalProps) {
  const qc = useQueryClient();

  // For the modal we widen the range to ~next 12 months.
  const wideFrom = from;
  const wideToDate = new Date(to + "T00:00:00");
  wideToDate.setFullYear(wideToDate.getFullYear() + 1);
  const wideTo = format(wideToDate, "yyyy-MM-dd");

  const q = useQuery({
    queryKey: qk.planningHolidays.range(wideFrom, wideTo),
    queryFn: () => holidaysApi.list({ from: wideFrom, to: wideTo }),
    enabled: open,
  });

  const overrideMut = useMutation({
    mutationFn: ({ date, payload }: { date: string; payload: Parameters<typeof holidaysApi.override>[1] }) =>
      holidaysApi.override(date, payload),
    onSuccess: () => {
      // Invalidate every holiday query (any range) since overrides affect the grid too.
      qc.invalidateQueries({ queryKey: qk.planningHolidays.all });
      toast.success("Jour férié mis à jour");
    },
    onError: (err: Error) => toast.error(err.message ?? "Erreur lors de la mise à jour"),
  });

  function handleToggle(h: PlanningHoliday, disabled: boolean) {
    overrideMut.mutate({ date: h.date, payload: { disabled } });
  }

  function handleCommitMultiplier(h: PlanningHoliday, value: number | null) {
    overrideMut.mutate({ date: h.date, payload: { holiday_multiplier: value } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Jours fériés</DialogTitle>
          <DialogDescription>
            Active ou désactive un jour férié et ajuste la majoration appliquée aux shifts ce jour-là.
            Une majoration vide signifie « utiliser la valeur par défaut » des paramètres planning.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {q.isLoading ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : (q.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun jour férié sur la période.
            </p>
          ) : (
            (q.data ?? []).map((h) => (
              <HolidayRow
                key={h.date}
                holiday={h}
                busy={overrideMut.isPending}
                onToggle={handleToggle}
                onCommitMultiplier={handleCommitMultiplier}
              />
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
