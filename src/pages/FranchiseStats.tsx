import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { AlertCircle, Loader2, Network } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageContainer } from "@/components/shared";
import { AdvancedDatePicker } from "@/components/shared/AdvancedDatePicker";
import { Tile } from "@/components/shared/Tile";
import { chartTooltipProps } from "@/components/analytics/chartTooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFranchiseSelection } from "@/hooks/useFranchiseSelection";
import { qk } from "@/lib/queryKeys";
import { FranchiseApiError, franchiseErrorMessage, franchisesService } from "@/services/franchisesService";
import type { FranchiseStats as FranchiseStatsData } from "@/types/franchise";

const VIEWS_COLOR = "#94a3b8";
const CLICKS_COLOR = "#3b82f6";
const ORDERS_COLOR = "#f97316";

const eur = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const pct = (part: number, total: number) => (total > 0 ? `${((part / total) * 100).toFixed(1)} %` : "—");
const dayLabel = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};
const frDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

// Provenance d'une visite du hub (normalizeSource côté API).
const SOURCE_LABELS: Record<string, string> = {
  direct: "Direct ou QR de la franchise",
  search: "Moteur de recherche",
  social: "Réseaux sociaux",
  referral: "Autre site",
  unknown: "Origine inconnue",
};
const sourceLabel = (source: string) => SOURCE_LABELS[source] ?? `Lien « ${source} »`;

function CenteredState({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      <div className="flex h-full items-center justify-center p-4">{children}</div>
    </DashboardLayout>
  );
}

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
                      <TableCell className="font-medium">{sourceLabel(row.source)}</TableCell>
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

/**
 * Franchise → Statistiques : apport du hub pour toute la franchise, ouvert à
 * tous ses gestionnaires (ib-welloresto-api docs/franchises.md, D24 à D26).
 * Le canal ScanNOrder de chaque établissement reste dans Analyse.
 */
export default function FranchiseStats() {
  const { listQuery, franchises, selectedId, select } = useFranchiseSelection();
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 30), to: new Date() });
  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");

  const statsQuery = useQuery({
    queryKey: qk.franchises.stats(selectedId ?? "", from, to),
    queryFn: () => franchisesService.stats(selectedId as string, from, to),
    enabled: selectedId !== null,
  });

  if (listQuery.isLoading) {
    return (
      <CenteredState>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </CenteredState>
    );
  }

  if (listQuery.isError) {
    return (
      <CenteredState>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Erreur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Impossible de charger vos franchises.</p>
            <Button onClick={() => listQuery.refetch()} className="mt-4 w-full">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </CenteredState>
    );
  }

  if (!selectedId) {
    return (
      <CenteredState>
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Network className="h-6 w-6" />
            </div>
            <CardTitle>Aucune franchise</CardTitle>
            <CardDescription>Les statistiques du hub apparaissent ici dès que vous gérez une franchise.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/franchise">Créer ou gérer une franchise</Link>
            </Button>
          </CardContent>
        </Card>
      </CenteredState>
    );
  }

  const current = franchises.find((f) => f.franchise_id === selectedId);

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-3xl font-bold">Statistiques</h1>
            {franchises.length > 1 ? (
              <Select value={selectedId} onValueChange={select}>
                <SelectTrigger className="h-10 w-56 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {franchises.map((f) => (
                    <SelectItem key={f.franchise_id} value={f.franchise_id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-xl text-muted-foreground truncate">{current?.name}</span>
            )}
          </div>
        }
        description="Ce que le hub de la franchise apporte à ses établissements : visites, clics et commandes."
        className="space-y-6"
      >
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

        {statsQuery.isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Chargement...</div>
        ) : statsQuery.isError ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {statsQuery.error instanceof FranchiseApiError && statsQuery.error.httpStatus === 400
              ? "Choisissez une période d'un an au plus."
              : franchiseErrorMessage(statsQuery.error, "Impossible de charger les statistiques.")}{" "}
            <button type="button" className="text-primary underline underline-offset-2" onClick={() => statsQuery.refetch()}>
              Réessayer
            </button>
          </div>
        ) : statsQuery.data ? (
          <StatsContent stats={statsQuery.data} />
        ) : null}
      </PageContainer>
    </DashboardLayout>
  );
}
