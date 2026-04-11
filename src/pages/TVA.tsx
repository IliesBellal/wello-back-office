import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { StatCard } from '@/components/dashboard/StatCard';
import { AdvancedDatePicker } from '@/components/shared/AdvancedDatePicker';
import { ChannelSelector } from '@/components/accounting/ChannelSelector';
import { VATBreakdownTable } from '@/components/accounting/VATBreakdownTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  calculateVAT,
  exportVATCSV,
  generateVATExportFilename,
  downloadCSV,
  vatChannels,
  type VATCalculationResponse,
} from '@/services/vatService';
import { format } from 'date-fns';
import { Download, AlertCircle, DollarSign, Percent } from 'lucide-react';

const VAT = () => {
  // State
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    return { from, to };
  });

  const [selectedChannels, setSelectedChannels] = useState<string>(
    vatChannels.map((c) => c.id).join(',')
  );
  const [vatData, setVatData] = useState<VATCalculationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const { toast } = useToast();

  // Memoize parsed channels to prevent unnecessary re-renders
  const parsedChannels = useMemo(() => {
    return selectedChannels
      .split(',')
      .filter((c) => c.trim() !== '' && vatChannels.some((ch) => ch.id === c.trim()));
  }, [selectedChannels]);

  // Load VAT data when period or channels change
  useEffect(() => {
    // Don't load if no channels selected
    if (parsedChannels.length === 0) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const startDate = format(dateRange.from, 'yyyy-MM-dd');
        const endDate = format(dateRange.to, 'yyyy-MM-dd');

        const data = await calculateVAT(startDate, endDate, parsedChannels);
        setVatData(data);
      } catch (error) {
        console.error('Error loading VAT data:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les données de TVA. Vérifiez que l\'API est disponible.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, parsedChannels]);

  const handleExportCSV = async () => {
    if (!vatData || parsedChannels.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Aucune donnée à exporter',
        variant: 'destructive',
      });
      return;
    }

    setExporting(true);
    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');

      const blob = await exportVATCSV(startDate, endDate, parsedChannels);
      const filename = generateVATExportFilename(startDate, endDate);

      downloadCSV(blob, filename);

      toast({
        title: 'Succès',
        description: `Export CSV téléchargé: ${filename}`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de générer l\'export CSV',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleChannelChange = (channels: string[]) => {
    setSelectedChannels(channels.join(','));
  };

  // Format currency
  const formatCurrency = (centimes: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(centimes / 100);
  };

  // Get top 3 VAT rates for cards (memoized to prevent recalculation)
  const topVATRates = useMemo(() => {
    if (!vatData) return [];
    return Object.entries(vatData.vat_by_rate)
      .map(([rate, data]) => ({
        rate: parseFloat(rate),
        amount: data.amount,
        base_ht: data.base_ht,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }, [vatData]);

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Déclaration de TVA</h1>
              <p className="text-sm text-muted-foreground">
                Visualisez et exportez les données de TVA collectée
              </p>
            </div>
            <Button
              onClick={handleExportCSV}
              disabled={exporting || !vatData || parsedChannels.length === 0}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Export en cours...' : 'Exporter CSV'}
            </Button>
          </div>
        }
      >
        {/* Period & Channels Selection */}
        <div className="w-full max-w-md">
          <AdvancedDatePicker value={dateRange} onChange={setDateRange} />
        </div>

        {/* ═══ CHANNELS SECTION ═══ */}
        <Card>
          <CardContent className="pt-6">
            <ChannelSelector
              channels={vatChannels}
              selectedChannels={parsedChannels}
              onChange={handleChannelChange}
            />
            {parsedChannels.length === 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Veuillez sélectionner au moins un canal de vente</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ═══ SHOW CONTENT ONLY IF CHANNELS SELECTED ═══ */}
        {parsedChannels.length > 0 && (
          <>
            {/* VAT Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {loading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-6">
                      <div className="space-y-3">
                        <div className="h-4 bg-muted rounded w-1/2" />
                        <div className="h-8 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </Card>
                  ))}
                </>
              ) : (
                <>
                  <StatCard
                    title="TVA TOTALE COLLECTÉE"
                    value={formatCurrency(vatData?.total_vat || 0)}
                    subtitle={`sur ${formatCurrency(
                      vatData?.monthly_breakdown.reduce((sum, m) => sum + m.revenue_ht, 0) || 0
                    )} HT`}
                    icon={DollarSign}
                    isHighlighted
                  />

                  {topVATRates.map((rate) => (
                    <StatCard
                      key={`vat-${rate.rate}`}
                      title={`TVA À ${rate.rate}%`}
                      value={formatCurrency(rate.amount)}
                      subtitle={`sur ${formatCurrency(rate.base_ht)} HT`}
                      icon={Percent}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Distribution by Channel */}
            {!loading && Object.keys(vatData?.by_channel || {}).length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Répartition par canal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {Object.entries(vatData?.by_channel || {}).map(([channel, data]) => {
                      const channelLabel = vatChannels.find((c) => c.id === channel)?.label || channel;
                      return (
                        <div
                          key={channel}
                          className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          <p className="text-sm text-muted-foreground mb-1">{channelLabel}</p>
                          <p className="text-xl font-bold font-mono">
                            {formatCurrency(data.vat)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {data.percentage}% de la TVA totale
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Monthly Breakdown Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Récapitulatif mensuels</CardTitle>
              </CardHeader>
              <CardContent>
                <VATBreakdownTable
                  data={vatData?.monthly_breakdown || []}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </>
        )}
      </PageContainer>
    </DashboardLayout>
  );
};

export default VAT;
