import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';

import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Customer,
  CustomerListMetadata,
  CustomerSortDirection,
  CustomerSortField,
  getCustomersList,
  searchCustomers,
} from '@/services/customersService';
import { Skeleton } from '@/components/ui/skeleton';
import CustomerDetailsSheet from '@/components/customers/CustomerDetailsSheet';
import { OrderDetailModal } from '@/pages/DashboardOrderHistory';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Users, ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

type SortField = 'first_name' | 'email' | 'phone' | 'customer_total_orders' | 'customer_total_spent' | 'created_at' | 'last_order_date';
type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  field: SortField | null;
  direction: SortDirection;
}

const SORT_FIELD_TO_API: Record<Exclude<SortField, 'created_at' | 'last_order_date'> | 'created_at' | 'last_order_date', CustomerSortField> = {
  first_name: 'customer_first_name',
  email: 'customer_email',
  phone: 'customer_tel',
  customer_total_orders: 'customer_nb_orders',
  customer_total_spent: 'customer_total_spent',
  created_at: 'creation_date',
  last_order_date: 'last_order_date',
};

const toApiSort = (sort: SortState): { sortField: CustomerSortField; sortDir: CustomerSortDirection } | undefined => {
  if (!sort.field || !sort.direction) {
    return undefined;
  }

  return {
    sortField: SORT_FIELD_TO_API[sort.field],
    sortDir: sort.direction,
  };
};

const formatCustomerDate = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const date = typeof value === 'number'
    ? new Date(value > 9999999999 ? value : value * 1000)
    : parseISO(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return format(date, 'dd MMM yyyy', { locale: fr });
};

const renderAcquisitionBadge = (source: string | undefined) => {
  const normalized = (source || '').toUpperCase();

  if (normalized === 'UBER_EATS') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-black px-2 py-0.5 text-[11px]">
        <img src="/uber_eats_logo.png" alt="Uber Eats" className="h-3 w-3 object-contain" />
        <span className="font-medium text-white">Uber Eats</span>
      </span>
    );
  }

  if (normalized === 'DELIVEROO') {
    return (
      <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: '#00CCBC' }}>
        <img src="/deliveroo_logo.png" alt="Deliveroo" className="h-3 w-3 object-contain" />
        <span>Deliveroo</span>
      </span>
    );
  }

  return null;
};

const isVipCustomer = (customer: Customer): boolean => customer.customer_total_spent > 50000;

const NEW_CUSTOMER_DAYS_THRESHOLD = 30;

const isNewCustomer = (customer: Customer): boolean => {
  if (!customer.created_at) {
    return false;
  }

  const createdAt = new Date(customer.created_at);
  if (Number.isNaN(createdAt.getTime())) {
    return false;
  }

  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= NEW_CUSTOMER_DAYS_THRESHOLD;
};

const CustomersList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [pagination, setPagination] = useState<CustomerListMetadata>({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 50,
  });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sort, setSort] = useState<SortState>({ field: null, direction: null });
  const { toast } = useToast();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const getCustomerFullName = (customer: Customer): string => {
    const parts = [];
    if (customer.first_name) parts.push(customer.first_name);
    if (customer.last_name) parts.push(customer.last_name);
    if (parts.length === 0 && customer.customer_name) return customer.customer_name;
    return parts.join(' ') || customer.customer_name || 'N/A';
  };

  const getSortValue = (customer: Customer, field: SortField): any => {
    switch (field) {
      case 'first_name':
        return getCustomerFullName(customer);
      case 'email':
        return customer.email || '';
      case 'phone':
        return customer.phone || '';
      case 'customer_total_orders':
        return customer.customer_total_orders || 0;
      case 'customer_total_spent':
        return customer.customer_total_spent || 0;
      case 'created_at':
        return customer.created_at ? new Date(customer.created_at).getTime() : 0;
      case 'last_order_date':
        return customer.last_order_date ? new Date(customer.last_order_date).getTime() : 0;
      default:
        return '';
    }
  };

  const loadCustomers = async (searchVal?: string, sortOverride?: SortState, pageOverride?: number) => {
    setLoading(true);
    try {
      const term = searchVal !== undefined ? searchVal : searchTerm;
      const apiSort = toApiSort(sortOverride ?? sort);
      const targetPage = pageOverride ?? page;
      
      let results: Customer[];
      if (term.trim()) {
        results = await searchCustomers(term, apiSort);
        setIsSearching(true);
        setPage(1);
        setPagination({
          totalItems: results.length,
          totalPages: 1,
          currentPage: 1,
          limit: results.length || limit,
        });
      } else {
        const result = await getCustomersList(targetPage, limit, apiSort);
        results = result.data;
        setIsSearching(false);
        setPage(result.metadata.currentPage);
        setPagination(result.metadata);
      }
      
      setCustomers(results);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les clients',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      loadCustomers(value, undefined, 1);
    }, 500);
  }, []);

  useEffect(() => {
    loadCustomers();
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSort = (field: SortField) => {
    let newDirection: SortDirection = 'asc';
    
    if (sort.field === field) {
      if (sort.direction === 'asc') {
        newDirection = 'desc';
      } else if (sort.direction === 'desc') {
        newDirection = null;
      }
    }

    const nextSort: SortState = {
      field: newDirection === null ? null : field,
      direction: newDirection,
    };

    setSort(nextSort);
    loadCustomers(undefined, nextSort, 1);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage === page || nextPage < 1 || nextPage > pagination.totalPages) {
      return;
    }

    loadCustomers(undefined, undefined, nextPage);
  };

  const totalCustomers = isSearching ? customers.length : pagination.totalItems;
  const currentPage = isSearching ? 1 : pagination.currentPage;
  const totalPages = isSearching ? 1 : pagination.totalPages;
  const currentLimit = isSearching ? (customers.length || limit) : pagination.limit;
  const displayStart = customers.length === 0 ? 0 : ((currentPage - 1) * currentLimit) + 1;
  const displayEnd = customers.length === 0 ? 0 : displayStart + customers.length - 1;

  const getSortIcon = (field: SortField) => {
    if (sort.field !== field) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    return sort.direction === 'asc' ? (
      <ArrowUp className="w-4 h-4" />
    ) : (
      <ArrowDown className="w-4 h-4" />
    );
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-2 hover:text-primary transition-colors"
    >
      {label}
      {getSortIcon(field)}
    </button>
  );

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-3xl font-bold text-foreground">Liste des clients</h1>
            <p className="text-sm text-muted-foreground">
              {totalCustomers} client{totalCustomers !== 1 ? 's' : ''}
            </p>
          </div>
        }
      >
        <div className="space-y-8">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Customers Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-4" />
              <p>{searchTerm ? 'Aucun client trouvé' : 'Aucun client'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="px-2" />
                    <TableHead className="cursor-pointer hover:bg-muted font-semibold">
                      <SortButton field="first_name" label="Nom et prénom" />
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted font-semibold">
                      <SortButton field="email" label="Email" />
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted font-semibold">
                      <SortButton field="phone" label="Téléphone" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-muted font-semibold">
                      <SortButton field="customer_total_spent" label="Total dépensé" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-muted font-semibold">
                      <SortButton field="customer_total_orders" label="Nombre de commandes" />
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted font-semibold">
                      <SortButton field="created_at" label="Client depuis" />
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted font-semibold">
                      <SortButton field="last_order_date" label="Dernière commande" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow 
                      key={customer.id} 
                      className="border-b border-border cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setDetailsOpen(true);
                      }}
                    >
                      <TableCell className="px-2">
                        <div className="flex items-center gap-1.5">
                          {isVipCustomer(customer) && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-500 px-2 py-0.5 text-[11px] font-medium text-white">
                              <Crown className="h-3 w-3" />
                              VIP
                            </span>
                          )}
                          {isNewCustomer(customer) && (
                            <span className="inline-flex items-center rounded bg-emerald-500 px-2 py-0.5 text-[11px] font-medium text-white">
                              NEW
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="pl-2">
                        <div className="flex items-center gap-2">
                          {renderAcquisitionBadge(customer.acquisition_source)}
                          <div className="font-medium text-foreground">{getCustomerFullName(customer)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {customer.email || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {customer.phone || '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {customer.customer_total_spent ? `${(customer.customer_total_spent / 100).toFixed(2)}\u00A0€` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {customer.customer_total_orders || 0}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatCustomerDate(customer.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatCustomerDate(customer.last_order_date)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Affichage {displayStart} à {displayEnd} sur {totalCustomers}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading || isSearching}
              className="p-2 border border-border rounded hover:bg-muted transition disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-foreground min-w-[120px] text-center">
              Page {currentPage} sur {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages || loading || isSearching}
              className="p-2 border border-border rounded hover:bg-muted transition disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        </div>
      </PageContainer>

      {/* Customer Details Sheet */}
      {selectedCustomer && (
        <CustomerDetailsSheet
          customer={selectedCustomer}
          open={detailsOpen}
          onOpenChange={(nextOpen) => {
            // Do not close the customer sheet when only the order modal is being closed.
            if (!nextOpen && orderId) {
              return;
            }
            setDetailsOpen(nextOpen);
          }}
          onOrderClick={(orderId) => {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set('orderId', orderId);
            setSearchParams(nextParams);
          }}
        />
      )}

      <OrderDetailModal
        isOpen={Boolean(orderId)}
        onClose={() => {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.delete('orderId');
          setSearchParams(nextParams);
        }}
        orderId={orderId || ''}
        // Render above the customer sheet and its overlay.
        zIndex={70}
      />
    </DashboardLayout>
  );
};

export default CustomersList;
