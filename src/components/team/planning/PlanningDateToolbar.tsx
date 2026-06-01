import { CalendarIcon, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import type { PlanningWeek } from "@/types/planning";

import type { PlanningViewMode } from "./PlanningHeader";

interface PlanningDateToolbarProps {
  anchorDate: Date;
  viewMode: PlanningViewMode;
  currentWeek: PlanningWeek | null;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onPickDate: (d: Date) => void;
  /** Sauvegarde la semaine courante comme nouveau modèle de semaine type. */
  onSaveAsWeekTemplate: () => void;
  /** Désactive le bouton "Sauvegarder comme semaine type" (ex: aucune semaine ou aucun shift). */
  saveDisabled?: boolean;
}

function toValidDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const raw = value.trim();
  if (!raw) return null;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  // Fallback for malformed payloads that still start with YYYY-MM-DD.
  const dateOnly = raw.slice(0, 10);
  const fallback = new Date(`${dateOnly}T00:00:00`);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function safeFormatDate(date: Date | null, pattern: string): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  return format(date, pattern, { locale: fr });
}

function formatHeaderLabel(
  view: PlanningViewMode,
  anchor: Date,
  week: PlanningWeek | null,
): string {
  const safeAnchor = Number.isNaN(anchor.getTime()) ? null : anchor;

  if (view === "day") {
    return safeFormatDate(safeAnchor, "EEEE d MMMM yyyy") || "Date indisponible";
  }
  if (view === "month") {
    return safeFormatDate(safeAnchor, "MMMM yyyy") || "Date indisponible";
  }

  if (week) {
    const start = safeFormatDate(toValidDate(week.start_date), "d MMM");
    const end = safeFormatDate(toValidDate(week.end_date), "d MMM yyyy");
    if (start && end) return `${start} – ${end}`;
    if (start) return start;
    if (end) return end;
  }

  return safeFormatDate(safeAnchor, "'Semaine du' d MMM yyyy") || "Date indisponible";
}

export function PlanningDateToolbar({
  anchorDate,
  viewMode,
  currentWeek,
  onPrev,
  onNext,
  onToday,
  onPickDate,
  onSaveAsWeekTemplate,
  saveDisabled,
}: PlanningDateToolbarProps) {
  const headerLabel = formatHeaderLabel(viewMode, anchorDate, currentWeek);

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border bg-background p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onPrev}
            aria-label="Précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-2 px-2 text-xs font-medium capitalize"
                aria-label="Choisir une date"
              >
                <CalendarIcon className="h-4 w-4" />
                {headerLabel || "Date indisponible"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={anchorDate}
                onSelect={(d) => d && onPickDate(d)}
                locale={fr}
                weekStartsOn={1}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onNext}
            aria-label="Suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onToday}>
            Aujourd&apos;hui
          </Button>
        </div>
        {currentWeek?.status && currentWeek.status !== "open" && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium uppercase text-muted-foreground">
            {currentWeek.status}
          </span>
        )}
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={onSaveAsWeekTemplate}
        disabled={saveDisabled}
      >
        <Save className="mr-2 h-4 w-4" />
        Sauvegarder comme semaine type
      </Button>
    </div>
  );
}
