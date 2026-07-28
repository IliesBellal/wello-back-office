import {
  BarChart3,
  Briefcase,
  CalendarIcon,
  CalendarRange,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Layout,
  Maximize2,
  Minimize2,
  MoreVertical,
  PartyPopper,
  Plus,
  Rows2,
  Rows4,
  Save,
  Settings,
  Trash2,
  UserPlus,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { PlanningWeek } from "@/types/planning";

export type PlanningViewMode = "day" | "week" | "month";
export type PlanningDensity = "comfortable" | "compact";

interface PlanningToolbarProps {
  // Vue
  viewMode: PlanningViewMode;
  onChangeView: (m: PlanningViewMode) => void;

  // Navigation temporelle
  anchorDate: Date;
  currentWeek: PlanningWeek | null;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onPickDate: (d: Date) => void;

  // Actions principales
  onCreate: () => void;
  /** Publie la semaine courante (mode semaine uniquement). */
  onPublishWeek?: () => void;
  /** Dépublie la semaine courante (mode semaine uniquement). */
  onUnpublishWeek?: () => void;
  publishPending?: boolean;
  unpublishPending?: boolean;

  // Menu secondaire
  onOpenPositions: () => void;
  onCreateEmployee: () => void;
  onOpenHolidays: () => void;
  onOpenSettings: () => void;
  onOpenPerformance: () => void;
  onOpenShiftTemplates: () => void;
  onOpenWeekTemplates: () => void;
  /** Active le mode "sélection multiple" pour suppression de masse. */
  onEnterSelectionMode: () => void;
  /** Sauvegarde la semaine courante comme nouveau modèle de semaine type. */
  onSaveAsWeekTemplate: () => void;
  /** Désactive "Sauvegarder comme semaine type" (ex: aucune semaine ou aucun shift). */
  saveDisabled?: boolean;

  // Confort d'affichage (mode workspace)
  density: PlanningDensity;
  onToggleDensity: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
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

/**
 * Barre d'outils unique du planning (pattern Skello/Planday) :
 * titre, navigation temporelle, statut de la semaine, vues, actions
 * et toggles de confort (densité, plein écran) sur une seule ligne
 * compacte qui wrap sur les écrans étroits.
 */
export function PlanningToolbar({
  viewMode,
  onChangeView,
  anchorDate,
  currentWeek,
  onPrev,
  onNext,
  onToday,
  onPickDate,
  onCreate,
  onPublishWeek,
  onUnpublishWeek,
  publishPending,
  unpublishPending,
  onOpenPositions,
  onCreateEmployee,
  onOpenHolidays,
  onOpenSettings,
  onOpenPerformance,
  onOpenShiftTemplates,
  onOpenWeekTemplates,
  onEnterSelectionMode,
  onSaveAsWeekTemplate,
  saveDisabled,
  density,
  onToggleDensity,
  isFullscreen,
  onToggleFullscreen,
}: PlanningToolbarProps) {
  const headerLabel = formatHeaderLabel(viewMode, anchorDate, currentWeek);
  const weekStatus = (currentWeek?.status ?? "").toLowerCase();
  const isWeekView = viewMode === "week";
  const isDraft = weekStatus === "draft";
  const isPublished = weekStatus === "published";
  const isLocked = weekStatus === "locked";
  const hideStatus = weekStatus === "open" || weekStatus.length === 0;
  const publishedAt = isPublished
    ? safeFormatDate(toValidDate(currentWeek?.published_at), "d MMM yyyy HH:mm")
    : "";

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

  const isCompact = density === "compact";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* ── Left: title + date nav + status ─────────────────────────────── */}
      <h1 className="text-lg font-semibold text-foreground">Planning</h1>

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
            <span className="hidden text-xs text-muted-foreground xl:inline">
              Publié le {publishedAt}
            </span>
          )}
        </div>
      )}

      {/* ── Right: views + actions + comfort toggles ────────────────────── */}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Tabs value={viewMode} onValueChange={(v) => onChangeView(v as PlanningViewMode)}>
          <TabsList className="h-8">
            <TabsTrigger value="day" className="h-7 text-xs">Jour</TabsTrigger>
            <TabsTrigger value="week" className="h-7 text-xs">Semaine</TabsTrigger>
            <TabsTrigger value="month" className="h-7 text-xs">Mois</TabsTrigger>
          </TabsList>
        </Tabs>

        {isWeekView && isDraft && onPublishWeek && (
          <Button
            size="sm"
            variant="outline"
            onClick={onPublishWeek}
            disabled={!!publishPending || !!unpublishPending}
          >
            Publier la semaine
          </Button>
        )}

        <Button size="sm" onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Créer un shift
        </Button>

        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={onOpenPerformance}
          title="Indicateurs de performance"
          aria-label="Indicateurs de performance"
        >
          <BarChart3 className="h-4 w-4" />
        </Button>

        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={onToggleDensity}
          title={isCompact ? "Affichage confortable" : "Affichage compact"}
          aria-label={isCompact ? "Affichage confortable" : "Affichage compact"}
        >
          {isCompact ? <Rows2 className="h-4 w-4" /> : <Rows4 className="h-4 w-4" />}
        </Button>

        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Quitter le plein écran (Échap)" : "Plein écran"}
          aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Plus d'actions">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem
              onClick={onUnpublishWeek}
              disabled={!isWeekView || !isPublished || !onUnpublishWeek}
            >
              <CalendarX2 className="mr-2 h-4 w-4" />
              Dépublier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSaveAsWeekTemplate} disabled={saveDisabled}>
              <Save className="mr-2 h-4 w-4" />
              Sauvegarder comme semaine type
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenPositions}>
              <Briefcase className="mr-2 h-4 w-4" />
              Gérer les postes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateEmployee}>
              <UserPlus className="mr-2 h-4 w-4" />
              Créer une fiche employé
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenShiftTemplates}>
              <Layout className="mr-2 h-4 w-4" />
              Modèles de shift
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenWeekTemplates}>
              <CalendarRange className="mr-2 h-4 w-4" />
              Semaines types
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenHolidays}>
              <PartyPopper className="mr-2 h-4 w-4" />
              Jours fériés
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEnterSelectionMode}>
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer des shifts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSettings}>
              <Settings className="mr-2 h-4 w-4" />
              Paramètres du planning
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
