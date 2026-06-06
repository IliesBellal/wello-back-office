import { CalendarIcon, CalendarX2, ChevronLeft, ChevronRight, MoreHorizontal, MoreVertical, Save } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  /** Publie la semaine courante (mode semaine uniquement). */
  onPublishWeek?: () => void;
  /** Dépublie la semaine courante (mode semaine uniquement). */
  onUnpublishWeek?: () => void;
  /** Désactive le bouton "Sauvegarder comme semaine type" (ex: aucune semaine ou aucun shift). */
  saveDisabled?: boolean;
  /** Pending state de l'action publier. */
  publishPending?: boolean;
  /** Pending state de l'action dépublier. */
  unpublishPending?: boolean;
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
  onPublishWeek,
  onUnpublishWeek,
  saveDisabled,
  publishPending,
  unpublishPending,
}: PlanningDateToolbarProps) {
  const headerLabel = formatHeaderLabel(viewMode, anchorDate, currentWeek);
  const weekStatus = (currentWeek?.status ?? "").toLowerCase();
  const isWeekView = viewMode === "week";
  const isDraft = weekStatus === "draft";
  const isPublished = weekStatus === "published";
  const isLocked = weekStatus === "locked";
  const hideStatus = weekStatus === "open" || weekStatus.length === 0;
  const publishedAt = isPublished ? safeFormatDate(toValidDate(currentWeek?.published_at), "d MMM yyyy HH:mm") : "";

  const statusLabel =
    isDraft ? "Brouillon" : isPublished ? "Publié" : isLocked ? "Verrouillé" : currentWeek?.status;

  const statusClassName =
    isDraft
      ? "border border-slate-300 bg-slate-100 text-slate-700"
      : isPublished
        ? "border border-emerald-300 bg-emerald-100 text-emerald-700"
        : isLocked
          ? "border border-amber-300 bg-amber-100 text-amber-800"
          : "border border-muted bg-muted text-muted-foreground";

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
        {!hideStatus && (
          <div className="flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusClassName}`}>
              {statusLabel}
            </span>
            {isPublished && publishedAt && (
              <span className="text-xs text-muted-foreground">Publié le {publishedAt}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isWeekView && isDraft && onPublishWeek && (
          <Button
            size="sm"
            onClick={onPublishWeek}
            disabled={!!publishPending || !!unpublishPending}
          >
            Publier la semaine
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onUnpublishWeek} disabled={!isWeekView || !isPublished || !onUnpublishWeek}>
                <CalendarX2 className="mr-2 h-4 w-4" />
                Dépublier
                </DropdownMenuItem>
              <DropdownMenuItem onClick={onSaveAsWeekTemplate} disabled={saveDisabled}>
                <Save className="mr-2 h-4 w-4" />
                Sauvegarder comme semaine type
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </div>
  );
}
