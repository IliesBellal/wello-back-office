import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AdvancedDatePicker } from '@/components/shared/AdvancedDatePicker';
import { ExpandableDataTable } from '@/components/shared/ExpandableDataTable';
import { ClosureModal } from '@/components/cash/ClosureModal';
import { Tile } from '@/components/shared/Tile';
import { useToast } from '@/hooks/use-toast';
import {
  CashRegisterHistoryRecord,
  getCashRegisterById,
  getCashRegisterHistory,
} from '@/services/cashRegisterHistoryService';
import { closeCashRegister } from '@/services/cashRegisterService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Receipt,
  DollarSign,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_LIMIT = 31;

const CashRegisterHistory = () => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from, to };
  });

  const [registers, setRegisters] = useState<CashRegisterHistoryRecord[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    z_count: 0,
    x_count: 0,
    total_revenue: 0,
    total_transactions: 0,
  });
  const [metadata, setMetadata] = useState({
    total_items: 0,
    total_pages: 1,
    current_page: 1,
    limit: PAGE_LIMIT,
  });
  const [selectedRegisterForEnclose, setSelectedRegisterForEnclose] = useState<CashRegisterHistoryRecord | null>(null);
  const [closureDialogOpen, setClosureDialogOpen] = useState(false);
  const [selectedRegisterToClose, setSelectedRegisterToClose] = useState<CashRegisterHistoryRecord | null>(null);
  const [closeConfirmDialogOpen, setCloseConfirmDialogOpen] = useState(false);
  const [closingRegisterId, setClosingRegisterId] = useState<string | null>(null);

  const { toast } = useToast();

  // Load registers when date range changes
  useEffect(() => {
    setPage(1);
  }, [dateRange]);

  const loadRegisters = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const result = await getCashRegisterHistory(dateRange.from, dateRange.to, 'all', targetPage, PAGE_LIMIT);
      setRegisters(result.registers);
      setStats(result.stats);
      setMetadata(result.metadata);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les registres',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  useEffect(() => {
    loadRegisters(page);
  }, [loadRegisters, page]);

  const formatCurrency = (cents: number) => {
    return `${(cents / 100).toFixed(2)}€`;
  };

  const handleCloseRegister = async () => {
    if (!selectedRegisterToClose) return;

    const registerId = selectedRegisterToClose.id;
    setClosingRegisterId(registerId);
    try {
      await closeCashRegister(registerId);
      const updatedRegister = await getCashRegisterById(registerId);

      setRegisters((prev) =>
        prev.map((register) =>
          register.id === registerId ? updatedRegister : register
        )
      );

      toast({
        title: 'Succès',
        description: 'Registre fermé avec succès',
      });

      setCloseConfirmDialogOpen(false);
      setSelectedRegisterToClose(null);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de fermer le registre',
        variant: 'destructive',
      });
    } finally {
      setClosingRegisterId(null);
    }
  };

  const handleEncloseSuccess = async () => {
    if (!selectedRegisterForEnclose) return;

    try {
      const refreshed = await getCashRegisterById(selectedRegisterForEnclose.id);
      setRegisters((prev) =>
        prev.map((register) =>
          register.id === selectedRegisterForEnclose.id ? refreshed : register
        )
      );
    } catch {
      // If targeted refresh fails, fallback to list refresh to keep UI consistent.
      loadRegisters(page);
    }
  };

  const totalItems = metadata.total_items;
  const currentPage = metadata.current_page || page;
  const currentLimit = metadata.limit || PAGE_LIMIT;
  const totalPages = Math.max(1, metadata.total_pages || 1);
  const displayStart = registers.length === 0 ? 0 : ((currentPage - 1) * currentLimit) + 1;
  const displayEnd = registers.length === 0 ? 0 : displayStart + registers.length - 1;

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
                    key: 'start_date',
                    label: 'Plage',
                    sortable: true,
                    render: (val: string, row: CashRegisterHistoryRecord) => {
                      const start = format(new Date(val), 'dd/MM/yyyy HH:mm', { locale: fr });
                      const end = row.end_date
                        ? format(new Date(row.end_date), 'dd/MM/yyyy HH:mm', { locale: fr })
                        : 'En cours';
                      return (
                        <div className="text-sm">
                          <p>{start}</p>
                          <p className="text-xs text-muted-foreground">→ {end}</p>
                        </div>
                      );
                    },
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
                  {
                    key: 'id',
                    label: 'Actions',
                    render: (val: string, row: CashRegisterHistoryRecord) => {
                      if (row.closed && !row.enclosed) {
                        return (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRegisterForEnclose(row);
                              setClosureDialogOpen(true);
                            }}
                            className="gap-2"
                          >
                            <Lock className="h-4 w-4" />
                            Clôturer
                          </Button>
                        );
                      } else if (!row.closed && !row.enclosed) {
                        return (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRegisterToClose(row);
                              setCloseConfirmDialogOpen(true);
                            }}
                            className="gap-2"
                          >
                            Fermer
                          </Button>
                        );
                      }
                      return <span className="text-xs text-muted-foreground">-</span>;
                    }
                  },
                ]}
                data={registers}
                expandableRowKey="id"
                initialSortBy="start_date"
                initialSortDir="desc"
                emptyMessage="Aucun registre pour cette période"
                emptyIcon={<FileText className="h-12 w-12 text-muted-foreground" />}
                renderExpandedRow={(register) => (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Informations caisse</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm bg-white p-2 rounded border border-border">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ID registre :</span>
                          <span className="font-medium">{register.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Caisse :</span>
                          <span className="font-medium">{register.cash_desk?.cash_desk_name || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Hash prefix :</span>
                          <span className="font-mono text-xs text-primary">{register.hash_prefix ? register.hash_prefix + '...' : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Statut :</span>
                          <span className="font-medium">{register.closed ? 'Fermé (Z)' : 'Ouvert (X)'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fond de caisse initial :</span>
                          <span className="font-medium">{formatCurrency(register.cash_fund)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fond de caisse final :</span>
                          <span className="font-medium">{formatCurrency(register.final_cash_fund)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Clôturé par :</span>
                          <span className="font-medium">{register.closed_by_name || '-'}</span>
                        </div>
                        <div className="flex justify-between md:col-span-2">
                          <span className="text-muted-foreground">Commentaire de clôture :</span>
                          <span className="font-medium text-right">{register.closure_comment || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Methods */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Moyens de paiement</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        {(register.payment_methods || []).map((method) => (
                          <div
                            key={method.mop}
                            className="flex justify-between bg-white p-2 rounded border border-border"
                          >
                            <span className="text-muted-foreground">{method.label}</span>
                            <span className="font-semibold">
                              {formatCurrency(method.amount)}
                            </span>
                          </div>
                        ))}
                        {(register.payment_methods || []).length === 0 && (
                          <p className="text-xs text-muted-foreground">Aucune repartition de paiement disponible.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              />
            </CardContent>
          )}
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Affichage {displayStart} à {displayEnd} sur {totalItems}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading}
              className="p-2 border border-border rounded hover:bg-muted transition disabled:opacity-50"
              aria-label="Page précédente"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-foreground min-w-[120px] text-center">
              Page {currentPage} sur {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages || loading}
              className="p-2 border border-border rounded hover:bg-muted transition disabled:opacity-50"
              aria-label="Page suivante"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        </div>
      </PageContainer>

      <ClosureModal
        register={selectedRegisterForEnclose}
        open={closureDialogOpen}
        onOpenChange={setClosureDialogOpen}
        onSuccess={handleEncloseSuccess}
      />

      <AlertDialog open={closeConfirmDialogOpen} onOpenChange={setCloseConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la fermeture</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir fermer le registre {selectedRegisterToClose?.register_number} ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCloseRegister}
              disabled={closingRegisterId === selectedRegisterToClose?.id}
            >
              {closingRegisterId === selectedRegisterToClose?.id ? 'Fermeture...' : 'Oui'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default CashRegisterHistory;
