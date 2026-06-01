/**
 * Bottom sheet "Indicateurs de performance" — Planning.
 *
 * Reprend `from / to / granularity` de l'écran Planning, et appelle
 * `PerformanceService.getForRange(query)`. Le composant ne sait RIEN du
 * calcul local : quand l'endpoint backend existera, seul le corps du
 * service changera.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Info, Minus, AlertTriangle } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { PerformanceService } from "@/services/performanceService";
import type {
  PerformanceGranularity,
  PerformancePeriod,
  PerformanceResponse,
} from "@/types/performance";

interface PerformanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Inclusive range currently visible in the Planning grid. */
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  /** Granularity to use for the row breakdown — derived from Planning view mode. */
  granularity: PerformanceGranularity;
}

export function PerformanceSheet({ open, onOpenChange, from, to, granularity }: PerformanceSheetProps) {
  const [compare, setCompare] = useState(false);

  const query = useMemo(
    () => ({ from, to, granularity, compare: compare ? ("previous" as const) : undefined }),
    [from, to, granularity, compare],
  );

  const perfQuery = useQuery({
    queryKey: ["planning", "performance", from, to, granularity, compare],
    queryFn: () => PerformanceService.getForRange(query),
    enabled: open,
  });

  const data = perfQuery.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-xl p-0"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
          <SheetHeader className="space-y-1">
            <SheetTitle>Indicateurs de performance</SheetTitle>
            <SheetDescription>
              Période : <strong>{from}</strong> → <strong>{to}</strong> ({granularityLabel(granularity)})
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <Switch
                id="perf-compare"
                checked={compare}
                onCheckedChange={setCompare}
              />
              <Label htmlFor="perf-compare" className="text-sm">
                Comparer à la période précédente
              </Label>
            </div>
            <div className="text-xs italic text-muted-foreground">
              Source : calcul local (mock). Sera remplacé par <code>GET /planning/performance</code>.
            </div>
          </div>

          {perfQuery.isLoading || !data ? (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : perfQuery.error ? (
            <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              Erreur de calcul : {(perfQuery.error as Error).message}
            </div>
          ) : (
            <PerformanceContent data={data} compare={compare} />
          )}

          <div className="mt-5 flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PerformanceContent({ data, compare }: { data: PerformanceResponse; compare: boolean }) {
  return (
    <div className="mt-4 space-y-4">
      {data.warnings.members_without_rate > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            <strong>{data.warnings.members_without_rate}</strong>{" "}
            membre{data.warnings.members_without_rate > 1 ? "s" : ""} sans taux horaire — exclus du calcul de
            masse salariale.
          </p>
        </div>
      )}

      <TooltipProvider delayDuration={150}>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Période</TableHead>
                <TableHead className="text-right">CA HT</TableHead>
                <TableHead className="text-right">Heures travaillées</TableHead>
                <TableHead className="text-right">Effectifs</TableHead>
                <TableHead className="text-right">MS chargée</TableHead>
                <TableHead className="text-right">Ratio MS/CA</TableHead>
                <TableHead className="text-right">Productivité (€/h)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.periods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-sm italic text-muted-foreground">
                    Aucune donnée sur la période.
                  </TableCell>
                </TableRow>
              ) : (
                data.periods.map((p) => <PeriodRow key={`${p.period_start}_${p.period_end}`} p={p} />)
              )}
              <TableRow className="border-t-2 font-semibold">
                <TableCell>
                  Total
                  {compare && data.previous_period && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      vs. {data.previous_period.from} → {data.previous_period.to}
                    </span>
                  )}
                </TableCell>
                <TotalCell
                  current={data.totals.revenue_actual_cents}
                  previous={data.previous_period?.totals.revenue_actual_cents ?? null}
                  format={fmtMoney}
                  compare={compare}
                />
                <TotalCell
                  current={data.totals.worked_hours}
                  previous={data.previous_period?.totals.worked_hours ?? null}
                  format={fmtHours}
                  compare={compare}
                  higherIsBetter={false}
                />
                <TotalCell
                  current={data.totals.headcount}
                  previous={data.previous_period?.totals.headcount ?? null}
                  format={(v) => String(v)}
                  compare={compare}
                  higherIsBetter
                />
                <TotalCell
                  current={data.totals.payroll_cost_loaded_cents}
                  previous={data.previous_period?.totals.payroll_cost_loaded_cents ?? null}
                  format={fmtMoney}
                  compare={compare}
                  higherIsBetter={false}
                />
                <TotalCell
                  current={data.totals.payroll_ratio}
                  previous={data.previous_period?.totals.payroll_ratio ?? null}
                  format={fmtPct}
                  compare={compare}
                  higherIsBetter={false}
                />
                <TotalCell
                  current={data.totals.revenue_per_hour_cents}
                  previous={data.previous_period?.totals.revenue_per_hour_cents ?? null}
                  format={fmtMoney}
                  compare={compare}
                  higherIsBetter
                />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </TooltipProvider>
    </div>
  );
}

function PeriodRow({ p }: { p: PerformancePeriod }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{p.label}</TableCell>
      <TableCell className="text-right">{moneyOrDash(p.revenue_actual_cents)}</TableCell>
      <TableCell className="text-right">{fmtHours(p.worked_hours)}</TableCell>
      <TableCell className="text-right">{p.headcount}</TableCell>
      <TableCell className="text-right">{fmtMoney(p.payroll_cost_loaded_cents)}</TableCell>
      <TableCell className="text-right">{pctOrDash(p.payroll_ratio)}</TableCell>
      <TableCell className="text-right">{moneyOrDash(p.revenue_per_hour_cents)}</TableCell>
    </TableRow>
  );
}

function TotalCell({
  current,
  previous,
  format,
  compare,
  higherIsBetter,
}: {
  current: number | null;
  previous: number | null;
  format: (v: number | null) => string;
  compare: boolean;
  higherIsBetter?: boolean;
}) {
  return (
    <TableCell className="text-right">
      <div className="flex items-center justify-end gap-2">
        <span>{format(current)}</span>
        {compare && <Variation current={current} previous={previous} higherIsBetter={higherIsBetter} />}
      </div>
    </TableCell>
  );
}

function Variation({
  current,
  previous,
  higherIsBetter = true,
}: {
  current: number | null;
  previous: number | null;
  higherIsBetter?: boolean;
}) {
  if (current == null || previous == null || previous === 0) {
    return <span className="text-[10px] text-muted-foreground">—</span>;
  }
  const delta = (current - previous) / Math.abs(previous);
  const up = delta > 0;
  const flat = Math.abs(delta) < 0.001;
  const good = flat ? false : up === higherIsBetter;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium",
        flat
          ? "bg-muted text-muted-foreground"
          : good
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
      )}
    >
      {flat ? <Minus className="h-3 w-3" /> : up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(delta * 100).toFixed(1)}%
    </span>
  );
}

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmtMoney(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
    .format(cents / 100);
}
function fmtHours(h: number | null): string {
  if (h == null) return "—";
  return `${h.toFixed(2)} h`;
}
function fmtPct(r: number | null): string {
  if (r == null) return "—";
  return `${(r * 100).toFixed(1)}%`;
}
function moneyOrDash(cents: number | null) {
  if (cents == null) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            — <Info className="h-3 w-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent>Source CA à brancher.</TooltipContent>
      </Tooltip>
    );
  }
  return fmtMoney(cents);
}
function pctOrDash(r: number | null) {
  if (r == null) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            — <Info className="h-3 w-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent>Source CA à brancher.</TooltipContent>
      </Tooltip>
    );
  }
  return fmtPct(r);
}
function granularityLabel(g: PerformanceGranularity) {
  return g === "day" ? "jour par jour" : g === "week" ? "semaine par semaine" : "mois par mois";
}
