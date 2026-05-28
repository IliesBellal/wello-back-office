import { useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Reservation,
  ReservationListMetadata,
  ReservationSortDirection,
  ReservationSortField,
  ReservationSource,
  ReservationStatus,
  getReservationsList,
  searchReservations,
} from '@/services/reservationsService';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

type SortField = ReservationSortField;
type SortDirection = ReservationSortDirection | null;

interface SortState {
  field: SortField | null;
  direction: SortDirection;
}

const toApiSort = (
  sort: SortState,
): { sortField: ReservationSortField; sortDir: ReservationSortDirection } | undefined => {
  if (!sort.field || !sort.direction) {
    return undefined;
  }

  return {
    sortField: sort.field,
    sortDir: sort.direction,
  };
};

const formatReservationDate = (value: string): string => {
  const parsed = parseISO(value);

  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return format(parsed, 'dd MMM yyyy - HH:mm', { locale: fr });
};

const statusLabels: Record<ReservationStatus, string> = {
  confirmed: 'Confirmee',
  pending: 'En attente',
  seated: 'Installee',
  cancelled: 'Annulee',
};

const sourceLabels: Record<ReservationSource, string> = {
  telephone: 'Telephone',
  site: 'Site web',
  google: 'Google',
  'walk-in': 'Sur place',
};

const statusClassNames: Record<ReservationStatus, string> = {
  confirmed: 'bg-emerald-100 text-emerald-800 border-transparent',
  pending: 'bg-amber-100 text-amber-800 border-transparent',
  seated: 'bg-sky-100 text-sky-800 border-transparent',
  cancelled: 'bg-rose-100 text-rose-800 border-transparent',
};

const sourceClassNames: Record<ReservationSource, string> = {
  telephone: 'bg-slate-100 text-slate-700 border-transparent',
  site: 'bg-indigo-100 text-indigo-800 border-transparent',
  google: 'bg-violet-100 text-violet-800 border-transparent',
  'walk-in': 'bg-orange-100 text-orange-800 border-transparent',
};

const ReservationsListPage = () => {
  const { toast } = useToast();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [pagination, setPagination] = useState<ReservationListMetadata>({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 8,
  });
  const [sort, setSort] = useState<SortState>({ field: 'reserved_at', direction: 'asc' });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadReservations = async (
    searchValue?: string,
    sortOverride?: SortState,
    pageOverride?: number,
  ) => {
    setLoading(true);

    try {
      const term = searchValue !== undefined ? searchValue : searchTerm;
      const apiSort = toApiSort(sortOverride ?? sort);
      const targetPage = pageOverride ?? page;

      if (term.trim()) {
        const results = await searchReservations(term, apiSort);
        setReservations(results);
        setIsSearching(true);
        setPage(1);
        setPagination({
          totalItems: results.length,
          totalPages: 1,
          currentPage: 1,
          limit: results.length || limit,
        });
      } else {
        const result = await getReservationsList(targetPage, limit, apiSort);
        setReservations(result.data);
        setIsSearching(false);
        setPage(result.metadata.currentPage);
        setPagination(result.metadata);
      }
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les reservations.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReservations();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSearch = (value: string) => {
    setSearchTerm(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void loadReservations(value, undefined, 1);
    }, 350);
  };

  const handleSort = (field: SortField) => {
    let nextDirection: SortDirection = 'asc';

    if (sort.field === field) {
      if (sort.direction === 'asc') {
        nextDirection = 'desc';
      } else if (sort.direction === 'desc') {
        nextDirection = null;
      }
    }

    const nextSort: SortState = {
      field: nextDirection === null ? null : field,
      direction: nextDirection,
    };

    setSort(nextSort);
    void loadReservations(undefined, nextSort, 1);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage === page || nextPage < 1 || nextPage > pagination.totalPages) {
      return;
    }

    void loadReservations(undefined, undefined, nextPage);
  };

  const totalReservations = isSearching ? reservations.length : pagination.totalItems;
  const currentPage = isSearching ? 1 : pagination.currentPage;
  const totalPages = isSearching ? 1 : pagination.totalPages;
  const currentLimit = isSearching ? (reservations.length || limit) : pagination.limit;
  const displayStart = reservations.length === 0 ? 0 : ((currentPage - 1) * currentLimit) + 1;
  const displayEnd = reservations.length === 0 ? 0 : displayStart + reservations.length - 1;

  const getSortIcon = (field: SortField) => {
    if (sort.field !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }

    return sort.direction === 'asc'
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className="flex items-center gap-2 transition-colors hover:text-primary"
    >
      {label}
      {getSortIcon(field)}
    </button>
  );

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold text-foreground">Liste des reservations</h1>
            <p className="text-sm text-muted-foreground">
              {totalReservations} reservation{totalReservations > 1 ? 's' : ''}
            </p>
          </div>
        }
        description="Vue mockee des reservations a venir, calquee sur la liste clients pour preparer l integration API."
      >
        <div className="space-y-8">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher une reservation..."
              value={searchTerm}
              onChange={(event) => handleSearch(event.target.value)}
              className="pl-10"
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {loading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3, 4, 5].map((index) => (
                  <Skeleton key={index} className="h-12" />
                ))}
              </div>
            ) : reservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarClock className="mb-4 h-12 w-12" />
                <p>{searchTerm ? 'Aucune reservation trouvee' : 'Aucune reservation'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border">
                      <TableHead className="cursor-pointer font-semibold hover:bg-muted">
                        <SortButton field="guest_name" label="Client" />
                      </TableHead>
                      <TableHead className="cursor-pointer font-semibold hover:bg-muted">
                        <SortButton field="reserved_at" label="Creneau" />
                      </TableHead>
                      <TableHead className="font-semibold">Table</TableHead>
                      <TableHead className="cursor-pointer text-right font-semibold hover:bg-muted">
                        <SortButton field="party_size" label="Couverts" />
                      </TableHead>
                      <TableHead className="cursor-pointer font-semibold hover:bg-muted">
                        <SortButton field="source" label="Canal" />
                      </TableHead>
                      <TableHead className="cursor-pointer font-semibold hover:bg-muted">
                        <SortButton field="status" label="Statut" />
                      </TableHead>
                      <TableHead className="font-semibold">Demande</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservations.map((reservation) => (
                      <TableRow key={reservation.id} className="border-b border-border transition-colors hover:bg-muted/50">
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">{reservation.guestName}</div>
                            <div className="text-sm text-muted-foreground">{reservation.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatReservationDate(reservation.reservedAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{reservation.tableName}</TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                          {reservation.partySize}
                        </TableCell>
                        <TableCell>
                          <Badge className={sourceClassNames[reservation.source]}>
                            {sourceLabels[reservation.source]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusClassNames[reservation.status]}>
                            {statusLabels[reservation.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                          {reservation.specialRequest || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Affichage {displayStart} a {displayEnd} sur {totalReservations}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading || isSearching}
                className="rounded border border-border p-2 transition hover:bg-muted disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[120px] text-center text-sm font-medium text-foreground">
                Page {currentPage} sur {totalPages}
              </span>
              <button
                type="button"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages || loading || isSearching}
                className="rounded border border-border p-2 transition hover:bg-muted disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
};

export default ReservationsListPage;