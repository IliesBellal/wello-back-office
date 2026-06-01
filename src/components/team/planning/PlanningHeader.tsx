import {
  Plus,
  MoreVertical,
  BarChart3,
  Briefcase,
  Layout,
  CalendarRange,
  Trash2,
  PartyPopper,
  Settings,
  Gauge,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type PlanningViewMode = "day" | "week" | "month";

interface PlanningHeaderProps {
  viewMode: PlanningViewMode;
  onChangeView: (m: PlanningViewMode) => void;
  onCreate: () => void;
  onOpenPositions: () => void;
  onOpenHolidays: () => void;
  onOpenSettings: () => void;
  onOpenPerformance: () => void;
  onOpenShiftTemplates: () => void;
  onOpenWeekTemplates: () => void;
  /** Active le mode "sélection multiple" pour suppression de masse. */
  onEnterSelectionMode: () => void;
}

export function PlanningHeader({
  viewMode,
  onChangeView,
  onCreate,
  onOpenPositions,
  onOpenHolidays,
  onOpenSettings,
  onOpenPerformance,
  onOpenShiftTemplates,
  onOpenWeekTemplates,
  onEnterSelectionMode,
}: PlanningHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <h1 className="text-2xl font-semibold text-foreground">Planning</h1>

      {/* ── Right: view + actions ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View toggle */}
        <Tabs value={viewMode} onValueChange={(v) => onChangeView(v as PlanningViewMode)}>
          <TabsList className="h-8">
            <TabsTrigger value="day" className="h-7 text-xs">Jour</TabsTrigger>
            <TabsTrigger value="week" className="h-7 text-xs">Semaine</TabsTrigger>
            <TabsTrigger value="month" className="h-7 text-xs">Mois</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Primary action */}
        <Button size="sm" onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Créer un shift
        </Button>

        {/* Performance bottom sheet */}
        <Button size="sm" variant="outline" onClick={onOpenPerformance}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Performance
        </Button>

        {/* 3-dot menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={onOpenPositions}>
              <Briefcase className="mr-2 h-4 w-4" />
              Gérer les postes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenShiftTemplates}>
              <Layout className="mr-2 h-4 w-4" />
              Modèles de shift
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenWeekTemplates}>
              <CalendarRange className="mr-2 h-4 w-4" />
              Semaines types
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEnterSelectionMode}>
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer des shifts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenHolidays}>
              <PartyPopper className="mr-2 h-4 w-4" />
              Jours fériés
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSettings}>
              <Settings className="mr-2 h-4 w-4" />
              Paramètres du planning
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenPerformance}>
              <Gauge className="mr-2 h-4 w-4" />
              Indicateurs de performance
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
