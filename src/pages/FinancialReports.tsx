import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Calendar as CalendarIcon } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { DollarSign, TrendingUp, Receipt } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { financialReportsService } from '@/services/financialReportsService';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { PaymentChart } from '@/components/reports/PaymentChart';
import { VATChart } from '@/components/reports/VATChart';
import { VATDetailTable } from '@/components/reports/VATDetailTable';
import { PaymentDetailTable } from '@/components/reports/PaymentDetailTable';

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(cents / 100);
};

const FinancialReports = () => {
  const now = new Date();
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(now),
    to: endOfMonth(now)
  });

  const { data: vatData, isLoading: vatLoading } = useQuery({
    queryKey: ['vat-report', dateRange],
    queryFn: () => financialReportsService.getVATReport(
      format(dateRange.from, 'yyyy-MM-dd'),
      format(dateRange.to, 'yyyy-MM-dd')
    )
  });

  const { data: paymentData, isLoading: paymentLoading } = useQuery({
    queryKey: ['payment-report', dateRange],
    queryFn: () => financialReportsService.getPaymentReport(
      format(dateRange.from, 'yyyy-MM-dd'),
      format(dateRange.to, 'yyyy-MM-dd')
    )
  });

  const isLoading = vatLoading || paymentLoading;

  // Calculate totals from VAT data
  const totals = vatData?.calendar.reduce(
    (acc, day) => ({
      ttc: acc.ttc + (day.TTC_sum || 0),
      ht: acc.ht + (day.HT_sum || 0),
      tva: acc.tva + (day.TVA_sum || 0)
    }),
    { ttc: 0, ht: 0, tva: 0 }
  ) || { ttc: 0, ht: 0, tva: 0 };

  const handleExportGlobal = () => {
    financialReportsService.exportGlobal(
      format(dateRange.from, 'yyyy-MM-dd'),
      format(dateRange.to, 'yyyy-MM-dd')
    );
  };

  const handleExportVAT = () => {
    financialReportsService.exportVAT(
      format(dateRange.from, 'yyyy-MM-dd'),
      format(dateRange.to, 'yyyy-MM-dd')
    );
  };

  const handleExportPayments = () => {
    financialReportsService.exportPayments(
      format(dateRange.from, 'yyyy-MM-dd'),
      format(dateRange.to, 'yyyy-MM-dd')
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Rapports Financiers</h1>
          <div className="flex items-center gap-3">
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
            <Button onClick={handleExportGlobal} className="bg-gradient-primary">
              <Download className="w-4 h-4 mr-2" />
              Export Comptable Global
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </>
          ) : (
            <>
              <StatCard
                title="Total TTC"
                value={formatCurrency(totals.ttc)}
                subtitle="Chiffre d'affaires"
                icon={DollarSign}
                isHighlighted
              />
              <StatCard
                title="Total HT"
                value={formatCurrency(totals.ht)}
                subtitle="Montant net"
                icon={TrendingUp}
              />
              <StatCard
                title="Total TVA"
                value={formatCurrency(totals.tva)}
                subtitle="TVA collectée"
                icon={Receipt}
              />
            </>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card rounded-xl">
            <CardHeader>
              <CardTitle className="text-foreground">Paiements par jour</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <PaymentChart data={paymentData?.calendar || []} />
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card rounded-xl">
            <CardHeader>
              <CardTitle className="text-foreground">Distribution TVA</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <VATChart data={vatData?.calendar || []} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Details Tabs */}
        <Card className="shadow-card rounded-xl">
          <Tabs defaultValue="vat">
            <CardHeader>
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="vat">Détail TVA</TabsTrigger>
                  <TabsTrigger value="payments">Détail Paiements</TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>
            <CardContent>
              <TabsContent value="vat">
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button onClick={handleExportVAT} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Exporter TVA
                    </Button>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-96 w-full" />
                  ) : (
                    <VATDetailTable data={vatData?.calendar || []} />
                  )}
                </div>
              </TabsContent>
              <TabsContent value="payments">
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button onClick={handleExportPayments} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Exporter Paiements
                    </Button>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-96 w-full" />
                  ) : (
                    <PaymentDetailTable data={paymentData?.calendar || []} />
                  )}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default FinancialReports;
