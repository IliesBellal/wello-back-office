import { Fragment } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, BarChart3, Minus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { PerformancePeriod, PerformanceResponse, PremiumBreakdown } from "@/types/performance";

import {
  PLANNING_PAYROLL_RATIO_TARGET,
  PLANNING_PAYROLL_RATIO_TARGET_PERCENT,
  PLANNING_PRODUCTIVITY_TARGET_CENTS_PER_HOUR,
  PLANNING_PRODUCTIVITY_TARGET_EUR_PER_HOUR,
} from "./planningPerformanceTargets";

interface PerformanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  from: string;
  to: string;
  compare: boolean;
  onCompareChange: (value: boolean) => void;
  data?: PerformanceResponse;
  isLoading?: boolean;
  error?: Error | null;
}

export function PerformanceSheet({
  open,
  onOpenChange,
  from,
  to,
  compare,
  onCompareChange,
  data,
  isLoading = false,
  error = null,
}: PerformanceSheetProps) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.section
          initial={{ height: 0, opacity: 0, y: -10 }}
          animate={{ height: "auto", opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -10 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          className="overflow-hidden border-b bg-gradient-to-b from-background via-background to-muted/20"
        >
          <div className="px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Analyse de performance
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Du {from} au {to}.</h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
                  <Switch
                    id="planning-performance-compare"
                    checked={compare}
                    onCheckedChange={onCompareChange}
                  />
                  <Label htmlFor="planning-performance-compare" className="text-sm">
                    Comparer à la période précédente
                  </Label>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
                  <X className="mr-2 h-4 w-4" />
                  Masquer
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : error ? (
              <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                Erreur de calcul : {error.message}
              </div>
            ) : !data ? (
              <div className="mt-4 rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                Aucune donnée de performance disponible.
              </div>
            ) : (
              <PerformanceSummaryContent data={data} compare={compare} />
            )}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function PerformanceSummaryContent({
  data,
  compare,
}: {
  data: PerformanceResponse;
  compare: boolean;
}) {
  const productivityTarget = productivityTargetBadge(data.totals.revenue_per_hour_cents);
  const payrollTarget = payrollTargetBadge(data.totals.payroll_ratio);

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="CA HT"
          value={fmtMoney(data.totals.revenue_actual_cents)}
          hint="Ventes réelles sur la période visible"
          variation={compare ? variationProps(data.totals.revenue_actual_cents, data.previous_period?.totals.revenue_actual_cents ?? null, true) : null}
        />
        <SummaryCard
          title="Heures travaillées"
          value={fmtHours(data.totals.worked_hours)}
          hint="Total d'heures planifiées ou pointées"
          variation={compare ? variationProps(data.totals.worked_hours, data.previous_period?.totals.worked_hours ?? null, false) : null}
        />
        <SummaryCard
          title="Productivité réelle"
          value={fmtEurosPerHour(data.totals.revenue_per_hour_cents)}
          hint={`Objectif ${PLANNING_PRODUCTIVITY_TARGET_EUR_PER_HOUR}€/h`}
          valueTone={productivityTarget?.tone ?? null}
          variation={compare ? variationProps(data.totals.revenue_per_hour_cents, data.previous_period?.totals.revenue_per_hour_cents ?? null, true) : null}
        />
        <SummaryCard
          title="Coût shifts / ventes"
          value={fmtPct(data.totals.payroll_ratio)}
          hint={`Objectif max ${PLANNING_PAYROLL_RATIO_TARGET_PERCENT}%`}
          valueTone={payrollTarget?.tone ?? null}
          variation={compare ? variationProps(data.totals.payroll_ratio, data.previous_period?.totals.payroll_ratio ?? null, false) : null}
        />
        <SummaryCard
          title="Majorations"
          value={fmtMoney(data.totals.premium_cost_extra_cents)}
          hint={fmtPremiumHint(data.totals.premium_breakdown)}
          variation={compare ? variationProps(data.totals.premium_cost_extra_cents, data.previous_period?.totals.premium_cost_extra_cents ?? null, false) : null}
        />
      </div>
    </div>
  );
}

export function PerformanceGridHeaderRows({
  open,
  dates,
  data,
  isLoading = false,
  error = null,
  compare,
}: {
  open: boolean;
  dates: Date[];
  data?: PerformanceResponse;
  isLoading?: boolean;
  error?: Error | null;
  compare: boolean;
}) {
  if (!open) return null;

  const periodsByDate = buildPeriodMap(data?.periods ?? []);
  const previousPeriods = data?.previous_period?.periods ?? [];

  return (
    <Fragment>
      <HeaderLabelCell>
        <div className="text-sm font-semibold text-foreground">Ratios journaliers</div>
      </HeaderLabelCell>
      {dates.map((date) => (
        <HeaderValueCell key={`title:${toIsoDay(date)}`} muted />
      ))}

      {renderMetricRow({
        dates,
        label: "Ventes réelles",
        sublabel: "CA HT",
        renderValue: (period) => fmtMoney(period?.revenue_actual_cents ?? null),
      })}
      {renderMetricRow({
        dates,
        label: "Heures travaillées",
        renderValue: (period) => fmtHours(period?.worked_hours ?? null),
      })}
      {renderMetricRow({
        dates,
        label: "Productivité réelle",
        sublabel: `Min : ${PLANNING_PRODUCTIVITY_TARGET_EUR_PER_HOUR}€/h`,
        renderValue: (period) => fmtEurosPerHour(period?.revenue_per_hour_cents ?? null),
        renderValueTone: (period) => productivityTargetBadge(period?.revenue_per_hour_cents ?? null)?.tone ?? null,
      })}
      {renderMetricRow({
        dates,
        label: "Coût shifts / ventes",
        sublabel: `Max : ${PLANNING_PAYROLL_RATIO_TARGET_PERCENT}%`,
        renderValue: (period) => fmtPct(period?.payroll_ratio ?? null),
        renderValueTone: (period) => payrollTargetBadge(period?.payroll_ratio ?? null)?.tone ?? null,
      })}
      {renderMetricRow({
        dates,
        label: "Majorations",
        sublabel: "Nuit / dimanche",
        renderValue: (period) => fmtMoney(period?.premium_cost_extra_cents ?? null),
      })}

      {data?.warnings.members_without_rate ? (
        <>
          <HeaderLabelCell className="bg-amber-50 text-amber-900">
            <div className="text-[11px] font-medium">Alerte masse salariale</div>
            <div className="text-[10px]">
              {data.warnings.members_without_rate} membre{data.warnings.members_without_rate > 1 ? "s" : ""} sans taux horaire exclus.
            </div>
          </HeaderLabelCell>
          {dates.map((date) => (
            <HeaderValueCell key={`warn:${toIsoDay(date)}`} muted className="bg-amber-50/60" />
          ))}
        </>
      ) : null}

      {isLoading ? (
        <>
          <HeaderLabelCell>
            <Skeleton className="h-4 w-24" />
          </HeaderLabelCell>
          {dates.map((date) => (
            <HeaderValueCell key={`loading:${toIsoDay(date)}`}>
              <Skeleton className="h-4 w-12" />
            </HeaderValueCell>
          ))}
        </>
      ) : null}

      {error ? (
        <>
          <HeaderLabelCell className="bg-destructive/5 text-destructive">
            <div className="text-[11px] font-medium">Erreur de calcul</div>
            <div className="text-[10px]">{error.message}</div>
          </HeaderLabelCell>
          {dates.map((date) => (
            <HeaderValueCell key={`error:${toIsoDay(date)}`} muted className="bg-destructive/5" />
          ))}
        </>
      ) : null}
    </Fragment>
  );

  function renderMetricRow({
    dates,
    label,
    sublabel,
    renderValue,
    renderBadge,
    renderValueTone,
  }: {
    dates: Date[];
    label: string;
    sublabel?: string;
    renderValue: (period: PerformancePeriod | null) => string;
    renderBadge?: (period: PerformancePeriod | null) => TargetBadge | null;
    renderValueTone?: (period: PerformancePeriod | null) => TargetBadge["tone"] | null;
  }) {
    return (
      <Fragment key={label}>
        <HeaderLabelCell>
          <div className="text-[11px] font-medium text-foreground">{label}</div>
          {sublabel && <div className="text-[10px] text-sky-700">{sublabel}</div>}
        </HeaderLabelCell>
        {dates.map((date, index) => {
          const iso = toIsoDay(date);
          const period = periodsByDate.get(iso) ?? null;
          const previousPeriod = compare ? previousPeriods[index] ?? null : null;
          const badge = renderBadge?.(period) ?? null;
          const valueTone = renderValueTone?.(period) ?? null;
          return (
            <HeaderValueCell key={`${label}:${iso}`} highlighted={false}>
              <div className="flex items-center justify-between gap-2">
                {valueTone ? (
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", valueToneClassName(valueTone))}>
                    {renderValue(period)}
                  </span>
                ) : (
                  <span className="font-semibold text-foreground">{renderValue(period)}</span>
                )}
                <div className="flex items-center gap-2">
                  {compare ? (
                    <VariationBadge
                      {...variationProps(
                        period?.revenue_actual_cents ?? null,
                        previousPeriod?.revenue_actual_cents ?? null,
                        true,
                      )}
                      compact
                    />
                  ) : null}
                  {badge && !valueTone && <TargetPill badge={badge} compact />}
                </div>
              </div>
            </HeaderValueCell>
          );
        })}
      </Fragment>
    );
  }
}

function SummaryCard({
  title,
  value,
  hint,
  target,
  valueTone,
  variation,
}: {
  title: string;
  value: string;
  hint: string;
  target?: TargetBadge | null;
  valueTone?: TargetBadge["tone"] | null;
  variation?: VariationProps | null;
}) {
  return (
    <div className="rounded-xl border bg-card/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{title}</div>
          <div className="mt-1">
            {valueTone ? (
              <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-base font-semibold", valueToneClassName(valueTone))}>
                {value}
              </span>
            ) : (
              <span className="text-2xl font-semibold text-foreground">{value}</span>
            )}
          </div>
        </div>
        {variation && <VariationBadge {...variation} />}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {target && <TargetPill badge={target} />}
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
    </div>
  );
}

function HeaderLabelCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "sticky left-0 z-20 flex min-h-[56px] flex-col justify-center border-b border-r bg-card px-3 py-2 shadow-[1px_0_0_hsl(var(--border))]",
      className,
    )}>
      {children}
    </div>
  );
}

function HeaderValueCell({
  children,
  muted = false,
  highlighted = false,
  className,
}: {
  children?: React.ReactNode;
  muted?: boolean;
  highlighted?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[56px] items-center border-b border-r px-2.5 py-2",
        muted && "bg-muted/20",
        highlighted && "bg-primary/5",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface TargetBadge {
  label: string;
  tone: "good" | "warn" | "neutral";
}

interface VariationProps {
  current: number | null;
  previous: number | null;
  higherIsBetter?: boolean;
}

function valueToneClassName(tone: TargetBadge["tone"]): string {
  if (tone === "good") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (tone === "warn") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-muted bg-muted text-muted-foreground";
}

function TargetPill({ badge, compact = false }: { badge: TargetBadge; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
        compact ? "text-[10px]" : "text-[11px]",
        "border",
        valueToneClassName(badge.tone),
      )}
    >
      {badge.label}
    </span>
  );
}

function VariationBadge({
  current,
  previous,
  higherIsBetter = true,
  compact = false,
}: VariationProps & { compact?: boolean }) {
  if (current == null || previous == null || previous === 0) {
    return <span className={cn("text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>—</span>;
  }

  const delta = (current - previous) / Math.abs(previous);
  const flat = Math.abs(delta) < 0.001;
  const up = delta > 0;
  const good = flat ? false : up === higherIsBetter;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
        compact ? "text-[10px]" : "text-xs",
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

function productivityTargetBadge(value: number | null): TargetBadge | null {
  if (value == null) return { label: "Sans CA", tone: "neutral" };
  return value >= PLANNING_PRODUCTIVITY_TARGET_CENTS_PER_HOUR
    ? { label: "Objectif atteint", tone: "good" }
    : { label: `Sous ${PLANNING_PRODUCTIVITY_TARGET_EUR_PER_HOUR}€/h`, tone: "warn" };
}

function payrollTargetBadge(value: number | null): TargetBadge | null {
  if (value == null) return { label: "Sans CA", tone: "neutral" };
  return value <= PLANNING_PAYROLL_RATIO_TARGET
    ? { label: "Dans la cible", tone: "good" }
    : { label: `Au-dessus de ${PLANNING_PAYROLL_RATIO_TARGET_PERCENT}%`, tone: "warn" };
}

function buildPeriodMap(periods: PerformancePeriod[]): Map<string, PerformancePeriod> {
  const map = new Map<string, PerformancePeriod>();
  for (const period of periods) {
    if (period.period_start === period.period_end) {
      map.set(period.period_start, period);
    }
  }
  return map;
}

function variationProps(
  current: number | null,
  previous: number | null,
  higherIsBetter = true,
): VariationProps {
  return { current, previous, higherIsBetter };
}

function toIsoDay(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function fmtMoney(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function fmtHours(hours: number | null): string {
  if (hours == null) return "—";
  const rounded = Math.round(hours * 100) / 100;
  return `${rounded.toFixed(2).replace(/\.00$/, "")} h`;
}

function fmtPct(ratio: number | null): string {
  if (ratio == null) return "—";
  return `${(ratio * 100).toFixed(1)}%`;
}

function fmtEurosPerHour(centsPerHour: number | null): string {
  if (centsPerHour == null) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(centsPerHour / 100)}€/h`;
}

/** Short hint listing only the non-zero premium buckets (hours), e.g.
 *  "8h nuit · 3h dimanche". `night_sunday_hours` reads as its own bucket
 *  (already excluded from night_hours/sunday_hours — see PremiumBreakdown). */
function fmtPremiumHint(breakdown: PremiumBreakdown): string {
  const parts: string[] = [];
  if (breakdown.night_hours > 0) parts.push(`${fmtHoursShort(breakdown.night_hours)} nuit`);
  if (breakdown.sunday_hours > 0) parts.push(`${fmtHoursShort(breakdown.sunday_hours)} dimanche`);
  if (breakdown.night_sunday_hours > 0) parts.push(`${fmtHoursShort(breakdown.night_sunday_hours)} nuit+dimanche`);
  if (parts.length === 0) return "Aucune heure majorée sur la période";
  return parts.join(" · ");
}

function fmtHoursShort(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded.toFixed(1).replace(/\.0$/, "")}h`;
}
