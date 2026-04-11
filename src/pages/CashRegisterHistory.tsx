import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AdvancedDatePicker } from '@/components/shared/AdvancedDatePicker';
import { ExpandableDataTable } from '@/components/shared/ExpandableDataTable';
import { Tile } from '@/components/shared/Tile';
import { useToast } from '@/hooks/use-toast';
import {
  CashRegisterHistoryRecord,
  getCashRegisterHistory,
} from '@/services/cashRegisterHistoryService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Check,
  Clock,
  FileText,
  Receipt,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SortField = 'created_at' | 'register_number' | 'total_revenue' | 'transaction_count';
type SortDirection = 'asc' | 'desc';

const CashRegisterHistory = () => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from, to };
  });

  const [registers, setRegisters] = useState<CashRegisterHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    z_count: 0,
    x_count: 0,
    total_revenue: 0,
    total_transactions: 0,
  });

  const { toast } = useToast();

  // Load registers when date range changes
  useEffect(() => {
    loadRegisters();
  }, [dateRange]);

  const loadRegisters = async () => {
    setLoading(true);
    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');

      const result = await getCashRegisterHistory(startDate, endDate, 'all');
      setRegisters(result.registers);
      setStats(result.stats);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les registres',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sortedRegisters = useMemo(() => {
    const sorted = [...registers];
    sorted.sort((a, b) => {
      const aVal: any = a['created_at'];
      const bVal: any = b['created_at'];

      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });

    return sorted;
  }, [registers]);

  const formatCurrency = (cents: number) => {
    return `${(cents / 100).toFixed(2)}€`;
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Registres de caisse</h1>
              <p className="text-sm text-muted-foreground">
                Historique complet des registres Z et X
              </p>
            </div>
            
            {/* Date Picker */}
            <div className="w-full max-w-md">
              <AdvancedDatePicker value={dateRange} onChange={setDateRange} />
            </div>
          </div>
        }
      >
        <div className="space-y-8">
        {/* ═══ STATS SECTION ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Tile
            title="Z de caisse"
            value={stats.z_count}
            icon={Receipt}
            isHighlighted
          />

          <Tile
            title="X de caisse"
            value={stats.x_count}
            icon={Receipt}
          />

          <Tile
            title="CA total"
            value={formatCurrency(stats.total_revenue)}
            icon={DollarSign}
          />

          <Tile
            title="Transactions"
            value={stats.total_transactions}
            icon={Clock}
          />
        </div>

        {/* ═══ TABLE SECTION ═══ */}
        <Card>
          {loading ? (
            <CardContent className="pt-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </CardContent>
          ) : registers.length === 0 ? (
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4" />
                <p>Aucun registre pour cette période</p>
                <p className="text-sm">Essayez d'élargir la période de recherche</p>
              </div>
            </CardContent>
          ) : (
            <CardContent className="p-0">
              <ExpandableDataTable<CashRegisterHistoryRecord>
                columns={[
                  {
                    key: 'created_at',
                    label: 'Date & Heure',
                    sortable: true,
                    render: (val) => format(new Date(val), 'dd/MM/yyyy HH:mm', { locale: fr }),
                  },
                  {
                    key: 'type',
                    label: 'Type',
                    render: (val: string) => (
                      <Badge
                        variant={val === 'Z' ? 'default' : 'secondary'}
                        className={cn(
                          'font-semibold',
                          val === 'Z'
                            ? 'bg-green-100 text-green-700 hover:bg-green-100'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                        )}
                      >
                        {val === 'Z' ? (
                          <>
                            <Check className="w-3 h-3 mr-1" /> Z
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 mr-1" /> X
                          </>
                        )}
                      </Badge>
                    ),
                  },
                  {
                    key: 'register_number',
                    label: 'Numéro',
                    sortable: true,
                  },
                  {
                    key: 'total_revenue',
                    label: 'CA Total',
                    sortable: true,
                    align: 'right',
                    render: (val: number) => formatCurrency(val),
                  },
                  {
                    key: 'transaction_count',
                    label: 'Transactions',
                    sortable: true,
                    align: 'right',
                  },
                ]}
                data={sortedRegisters}
                expandableRowKey="id"
                initialSortBy="created_at"
                initialSortDir="desc"
                emptyMessage="Aucun registre pour cette période"
                emptyIcon={<FileText className="h-12 w-12 text-muted-foreground" />}
                renderExpandedRow={(register) => (
                  <div className="space-y-4">
                    {/* Payment Methods */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Moyens de paiement</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        {Object.entries(register.payment_methods).map(([method, amount]) => (
                          <div
                            key={method}
                            className="flex justify-between bg-white p-2 rounded border border-border"
                          >
                            <span className="text-muted-foreground capitalize">
                              {method === 'card'
                                ? 'Carte Bancaire'
                                : method === 'cash'
                                  ? 'Espèces'
                                  : method === 'ticket_restaurant'
                                    ? 'Tickets Restaurant'
                                    : method}
                            </span>
                            <span className="font-semibold">
                              {formatCurrency(amount as number)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* NF525 Info */}
                    {(register as any).nf525_certified && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">
                          Informations NF525
                        </h4>
                        <div className="space-y-1 text-sm bg-white p-2 rounded border border-border">
                          {(register as any).nf525_hash && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Hash :</span>
                              <code className="font-mono text-xs text-primary">
                                {((register as any).nf525_hash as string).substring(0, 16)}...
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              />
            </CardContent>
          )}
        </Card>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
};

export default CashRegisterHistory;
