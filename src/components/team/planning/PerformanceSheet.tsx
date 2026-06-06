/**
 * Bottom sheet "Indicateurs de performance" — Planning.
 *
 * Reprend `from / to / granularity` de l'écran Planning, et appelle
 * `PerformanceService.getForRange(query)`. Le composant ne sait RIEN du
 * calcul local : quand l'endpoint backend existera, seul le corps du
 * service changera.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Info, Minus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  forecastEditable?: boolean;
}

export function PerformanceSheet({
  open,
  onOpenChange,
  from,
  to,
  granularity,
  forecastEditable = false,
}: PerformanceSheetProps) {
  const queryClient = useQueryClient();
  const [compare, setCompare] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftForecasts, setDraftForecasts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const query = useMemo(
    () => ({ from, to, granularity, compare: compare ? ("previous" as const) : undefined }),
    [from, to, granularity, compare],
  );

  const canEditForecasts = forecastEditable && granularity === "day";

  const perfQuery = useQuery({
    queryKey: ["planning", "performance", from, to, granularity, compare],
    queryFn: () => PerformanceService.getForRange(query),
    enabled: open,
  });

  const data = perfQuery.data;

  useEffect(() => {
    if (open) return;
    setEditing(false);
    setDraftForecasts({});
    setSaving(false);
  }, [open]);

  useEffect(() => {
    if (canEditForecasts) return;
    setEditing(false);
    setDraftForecasts({});
  }, [canEditForecasts]);

  const startEditing = () => {
    if (!data) return;
    setDraftForecasts(buildDraftForecasts(data.periods));
    setEditing(true);
    setCompare(false);
  };

  const cancelEditing = () => {
    setEditing(false);
    setDraftForecasts({});
  };

  const saveForecasts = async () => {
    if (!data) return;

    const payload: Array<{ date: string; amount_cents: number | null }> = [];
    for (const period of data.periods) {
      if (period.period_start !== period.period_end) continue;

      const currentValue = draftForecasts[period.period_start] ?? "";
      const normalizedValue = currentValue.trim();
      const originalCents = period.revenue_forecast_cents;

      if (normalizedValue === "") {
        if (originalCents != null) {
          payload.push({ date: period.period_start, amount_cents: null });
        }
        continue;
      }

      const parsedEuros = Number.parseFloat(normalizedValue);
      if (Number.isNaN(parsedEuros)) continue;
      if (parsedEuros < 0) {
        toast.error("Les prévisions de CA ne peuvent pas être négatives.");
        return;
      }

      const nextCents = Math.round(parsedEuros * 100);
      if (nextCents !== originalCents) {
        payload.push({ date: period.period_start, amount_cents: nextCents });
      }
    }

    if (payload.length === 0) {
      cancelEditing();
      return;
    }

    setSaving(true);
    try {
      await PerformanceService.upsertForecasts(payload);
      await queryClient.invalidateQueries({ queryKey: ["planning", "performance"] });
      toast.success("Prévisions de CA enregistrées.");
      cancelEditing();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'enregistrement des prévisions.");
    } finally {
      setSaving(false);
    }
  };

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
                disabled={editing}
              />
              <Label htmlFor="perf-compare" className="text-sm">
                Comparer à la période précédente
              </Label>
            </div>
            <div className="flex items-center gap-2">
              {canEditForecasts && !editing && (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  Modifier les estimations
                </Button>
              )}
              {canEditForecasts && editing && (
                <>
                  <Button variant="outline" size="sm" onClick={cancelEditing} disabled={saving}>
                    Annuler
                  </Button>
                  <Button size="sm" onClick={saveForecasts} disabled={saving}>
                    {saving ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </>
              )}
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
            <PerformanceContent
              data={data}
              compare={compare}
              editing={editing}
              draftForecasts={draftForecasts}
              onDraftChange={(date, value) => {
                setDraftForecasts((prev) => ({ ...prev, [date]: value }));
              }}
            />
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

function PerformanceContent({
  data,
  compare,
  editing,
  draftForecasts,
  onDraftChange,
}: {
  data: PerformanceResponse;
  compare: boolean;
  editing: boolean;
  draftForecasts: Record<string, string>;
  onDraftChange: (date: string, value: string) => void;
}) {
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
                <TableHead className="text-right">CA prévisionnel</TableHead>
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
                  <TableCell colSpan={8} className="py-6 text-center text-sm italic text-muted-foreground">
                    Aucune donnée sur la période.
                  </TableCell>
                </TableRow>
              ) : (
                data.periods.map((p) => (
                  <PeriodRow
                    key={`${p.period_start}_${p.period_end}`}
                    p={p}
                    editing={editing}
                    draftValue={draftForecasts[p.period_start] ?? ""}
                    onDraftChange={onDraftChange}
                  />
                ))
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
                <TableCell className="text-right">{moneyOrDash(data.totals.revenue_forecast_cents)}</TableCell>
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

function PeriodRow({
  p,
  editing,
  draftValue,
  onDraftChange,
}: {
  p: PerformancePeriod;
  editing: boolean;
  draftValue: string;
  onDraftChange: (date: string, value: string) => void;
}) {
  const editableRow = editing && p.period_start === p.period_end;

  return (
    <TableRow>
      <TableCell className="font-medium">{p.label}</TableCell>
      <TableCell className="text-right">{moneyOrDash(p.revenue_actual_cents)}</TableCell>
      <TableCell className="text-right">
        {editableRow ? (
          <Input
            type="number"
            min="0"
            step="0.01"
            value={draftValue}
            onChange={(e) => onDraftChange(p.period_start, e.target.value)}
            className="ml-auto h-8 w-28 text-right"
          />
        ) : (
          moneyOrDash(p.revenue_forecast_cents)
        )}
      </TableCell>
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
        <TooltipContent>Données manquantes pour cette période.</TooltipContent>
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
        <TooltipContent>CA indisponible pour cette période.</TooltipContent>
      </Tooltip>
    );
  }
  return fmtPct(r);
}
function granularityLabel(g: PerformanceGranularity) {
  return g === "day" ? "jour par jour" : g === "week" ? "semaine par semaine" : "mois par mois";
}

function buildDraftForecasts(periods: PerformancePeriod[]): Record<string, string> {
  return periods.reduce<Record<string, string>>((acc, period) => {
    if (period.period_start !== period.period_end) return acc;
    acc[period.period_start] = centsToEuroInput(period.revenue_forecast_cents);
    return acc;
  }, {});
}

function centsToEuroInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}
