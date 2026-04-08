import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AdvancedDatePicker } from '@/components/shared/AdvancedDatePicker';
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SortField = 'created_at' | 'register_number' | 'total_revenue' | 'transaction_count';
type SortDirection = 'asc' | 'desc';

interface SortState {
  field: SortField;
  direction: SortDirection;
}

const CashRegisterHistory = () => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from, to };
  });

  const [registers, setRegisters] = useState<CashRegisterHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ field: 'created_at', direction: 'desc' });
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
      let aVal: any = a[sort.field];
      let bVal: any = b[sort.field];

      if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [registers, sort]);

  const handleSort = (field: SortField) => {
    if (sort.field === field) {
      setSort({
        field,
        direction: sort.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setSort({ field, direction: 'desc' });
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sort.field !== field) {
      return <span className="text-muted-foreground text-xs">⇅</span>;
    }
    return sort.direction === 'asc' ? '↑' : '↓';
  };

  const formatCurrency = (cents: number) => {
    return `${(cents / 100).toFixed(2)}€`;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* ═══ HEADER ═══ */}
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

        {/* ═══ STATS SECTION ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Z de caisse</p>
                <p className="text-3xl font-bold">{stats.z_count}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">X de caisse</p>
                <p className="text-3xl font-bold">{stats.x_count}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">CA total</p>
                <p className="text-3xl font-bold">{formatCurrency(stats.total_revenue)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-3xl font-bold">{stats.total_transactions}</p>
              </div>
            </CardContent>
          </Card>
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
            <div className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="cursor-pointer">
                      <button
                        onClick={() => handleSort('created_at')}
                        className="flex items-center gap-1 font-semibold"
                      >
                        Date & Heure
                        {getSortIcon('created_at')}
                      </button>
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="cursor-pointer">
                      <button
                        onClick={() => handleSort('register_number')}
                        className="flex items-center gap-1 font-semibold"
                      >
                        Numéro
                        {getSortIcon('register_number')}
                      </button>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer">
                      <button
                        onClick={() => handleSort('total_revenue')}
                        className="flex items-center justify-end gap-1 font-semibold w-full"
                      >
                        CA Total
                        {getSortIcon('total_revenue')}
                      </button>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer">
                      <button
                        onClick={() => handleSort('transaction_count')}
                        className="flex items-center justify-end gap-1 font-semibold w-full"
                      >
                        Transactions
                        {getSortIcon('transaction_count')}
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRegisters.map((register) => (
                    <React.Fragment key={register.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          setExpandedId(expandedId === register.id ? null : register.id)
                        }
                      >
                        <TableCell className="w-8">
                          {expandedId === register.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(register.created_at), 'dd/MM/yyyy HH:mm', {
                            locale: fr,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={register.type === 'Z' ? 'default' : 'secondary'}
                            className={cn(
                              'font-semibold',
                              register.type === 'Z'
                                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                            )}
                          >
                            {register.type === 'Z' ? (
                              <>
                                <Check className="w-3 h-3 mr-1" /> Z
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 mr-1" /> X
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {register.register_number}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(register.total_revenue)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {register.transaction_count}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Detail Row */}
                      {expandedId === register.id && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={6} className="p-4">
                            <div className="space-y-4">
                              {/* Payment Methods */}
                              <div>
                                <h4 className="text-sm font-semibold mb-2">Moyens de paiement</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                                  {Object.entries(register.payment_methods).map(
                                    ([method, amount]) => (
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
                                          {formatCurrency(amount)}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>

                              {/* NF525 Info */}
                              {register.nf525_certified && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">
                                    Informations NF525
                                  </h4>
                                  <div className="space-y-1 text-sm bg-white p-2 rounded border border-border">
                                    {register.nf525_hash && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Hash :</span>
                                        <code className="font-mono text-xs text-primary">
                                          {register.nf525_hash.substring(0, 16)}...
                                        </code>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CashRegisterHistory;
