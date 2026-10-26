import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdvancedDatePicker } from "@/components/shared/AdvancedDatePicker";
import { Tile } from "@/components/shared/Tile";
import { chartTooltipProps } from "@/components/analytics/chartTooltip";
import { dayLabel, eur, frDate, pct, sourceLabel } from "@/components/analytics/channelFormat";
import { FranchisePageShell } from "@/components/franchise/FranchisePageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { qk } from "@/lib/queryKeys";
import { FranchiseApiError, franchiseErrorMessage, franchisesService } from "@/services/franchisesService";
import type { FranchiseStats as FranchiseStatsData } from "@/types/franchise";

const VIEWS_COLOR = "#94a3b8";
const CLICKS_COLOR = "#3b82f6";
const ORDERS_COLOR = "#f97316";

// Sur le hub, « direct » couvre aussi les scans du QR de la franchise.
const HUB_SOURCE_LABELS = { direct: "Direct ou QR de la franchise" };

function StatsContent({ stats }: { stats: FranchiseStatsData }) {
  const { totals } = stats;
  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Mesure anonyme (aucune donnée personnelle, aucun cookie)
        {stats.tracking_since ? `, disponible depuis le ${frDate(stats.tracking_since)}` : ", pas encore de donnée pour cette franchise"}.
        Une visite correspond à un onglet ouvert sur le hub, comptée de nouveau après 30 minutes d'inactivité. Une commande
        est attribuée au hub quand elle suit un clic « Commander » dans les 2 h.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Tile title="CA venu du hub TTC" value={eur(totals.hub_revenue_ttc_cents)} isHighlighted />
        <Tile title="Commandes venues du hub" value={totals.hub_orders} />
        <Tile title="Visites du hub" value={totals.hub_views} />
        <Tile title="Clics « Commander »" value={totals.order_clicks} subtitle={`${pct(totals.order_clicks, totals.hub_views)} des visites`} />
        <Tile title="Clics « Réserver »" value={totals.reservation_clicks} subtitle={`${pct(totals.reservation_clicks, totals.hub_views)} des visites`} />
        <Tile
          title="Conversion clic → commande"
          value={pct(totals.hub_orders, totals.order_clicks)}
          info="Part des clics « Commander » suivis d'une commande dans les 2 h."
        />
      </div>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Visites, clics et commandes par jour</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tickFormatter={dayLabel} stroke="#6b7280" />
              <YAxis allowDecimals={false} stroke="#6b7280" />
              <Tooltip {...chartTooltipProps} labelFormatter={(v: string) => frDate(v)} />
              <Legend />
              <Bar dataKey="hub_views" name="Visites du hub" fill={VIEWS_COLOR} />
              <Bar dataKey="order_clicks" name="Clics « Commander »" fill={CLICKS_COLOR} />
              <Bar dataKey="hub_orders" name="Commandes" fill={ORDERS_COLOR} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="bg-card border border-border xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Par établissement</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Établissement</TableHead>
                    <TableHead className="text-right">Clics « Commander »</TableHead>
                    <TableHead className="text-right">Clics « Réserver »</TableHead>
                    <TableHead className="text-right">Commandes</TableHead>
                    <TableHead className="text-right">CA TTC</TableHead>
                    <TableHead className="text-right">Part du CA hub</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.merchants.map((row) => (
                    <TableRow key={row.merchant_id}>
                      <TableCell className="font-medium">{row.business_name}</TableCell>
                      <TableCell className="text-right">{row.order_clicks}</TableCell>
                      <TableCell className="text-right">{row.reservation_clicks}</TableCell>
                      <TableCell className="text-right">{row.hub_orders}</TableCell>
                      <TableCell className="text-right">{eur(row.hub_revenue_ttc_cents)}</TableCell>
                      <TableCell className="text-right">{pct(row.hub_revenue_ttc_cents, totals.hub_revenue_ttc_cents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Provenance des visites du hub</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.sources.length === 0 ? (
              <p className="px-6 py-6 text-center text-sm text-muted-foreground">Aucune visite sur cette période.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Visites</TableHead>
                    <TableHead className="text-right">Part</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.sources.map((row) => (
                    <TableRow key={row.source}>
                      <TableCell className="font-medium">{sourceLabel(row.source, HUB_SOURCE_LABELS)}</TableCell>
                      <TableCell className="text-right">{row.views}</TableCell>
                      <TableCell className="text-right">{pct(row.views, totals.hub_views)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsPanel({ franchiseId }: { franchiseId: string }) {
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 30), to: new Date() });
  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");

  // Les chiffres de la période précédente restent affichés pendant le
  // chargement de la nouvelle : pas de clignotement au changement de période.
  const statsQuery = useQuery({
    queryKey: qk.franchises.stats(franchiseId, from, to),
    queryFn: () => franchisesService.stats(franchiseId, from, to),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <Card className="bg-card border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Période</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-sm">
            <AdvancedDatePicker value={dateRange} onChange={setDateRange} />
          </div>
        </CardContent>
      </Card>

      {statsQuery.isError ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {statsQuery.error instanceof FranchiseApiError && statsQuery.error.httpStatus === 400
            ? "Choisissez une période d'un an au plus."
            : franchiseErrorMessage(statsQuery.error, "Impossible de charger les statistiques.")}{" "}
          <button type="button" className="text-primary underline underline-offset-2" onClick={() => statsQuery.refetch()}>
            Réessayer
          </button>
        </div>
      ) : statsQuery.data ? (
        <div className={statsQuery.isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <StatsContent stats={statsQuery.data} />
        </div>
      ) : (
        <div className="py-8 text-center text-muted-foreground">Chargement...</div>
      )}
    </>
  );
}

/**
 * Franchise → Statistiques : apport du hub pour toute la franchise, ouvert à
 * tous ses gestionnaires (ib-welloresto-api docs/franchises.md, D24 à D26).
 * Le canal ScanNOrder de chaque établissement reste dans Analyse.
 */
export default function FranchiseStats() {
  return (
    <FranchisePageShell
      title="Statistiques"
      description="Ce que le hub de la franchise apporte à ses établissements : visites, clics et commandes."
    >
      {({ franchiseId }) => <StatsPanel key={franchiseId} franchiseId={franchiseId} />}
    </FranchisePageShell>
  );
}
