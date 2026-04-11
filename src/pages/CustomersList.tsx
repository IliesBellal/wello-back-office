import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Customer, getCustomersList, searchCustomers } from '@/services/customersService';
import { Skeleton } from '@/components/ui/skeleton';
import CustomerDetailsSheet from '@/components/customers/CustomerDetailsSheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Users, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type SortField = 'first_name' | 'email' | 'phone' | 'customer_total_orders' | 'customer_total_spent';
type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  field: SortField | null;
  direction: SortDirection;
}

const CustomersList = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
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
      default:
        return '';
    }
  };

  const loadCustomers = async (searchVal?: string) => {
    setLoading(true);
    try {
      const term = searchVal !== undefined ? searchVal : searchTerm;
      
      let results: Customer[];
      if (term.trim()) {
        results = await searchCustomers(term);
        setIsSearching(true);
      } else {
        const result = await getCustomersList(1, 1000);
        results = result.data;
        setIsSearching(false);
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
      loadCustomers(value);
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

    setSort({
      field: newDirection === null ? null : field,
      direction: newDirection,
    });
  };

  const sortedCustomers = useCallback(() => {
    let sorted = [...customers];

    if (sort.field && sort.direction) {
      sorted.sort((a, b) => {
        let aVal: any = getSortValue(a, sort.field!);
        let bVal: any = getSortValue(b, sort.field!);

        // Handle null/undefined
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        // Convert to comparable values
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal as string).toLowerCase();
        }

        if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return sorted;
  }, [customers, sort]);

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
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Liste des clients</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {customers.length} client{customers.length !== 1 ? 's' : ''}
            </p>
          </div>
        }
      >
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
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-muted">
                      <SortButton field="first_name" label="Nom et prénom" />
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted">
                      <SortButton field="email" label="Email" />
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted">
                      <SortButton field="phone" label="Téléphone" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-muted">
                      <SortButton field="customer_total_spent" label="Total dépensé" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-muted">
                      <SortButton field="customer_total_orders" label="Nombre de commandes" />
                    </TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCustomers().map((customer) => (
                    <TableRow key={customer.id} className="cursor-pointer hover:bg-muted">
                      <TableCell className="font-medium">{getCustomerFullName(customer)}</TableCell>
                      <TableCell className="text-sm">{customer.email || '-'}</TableCell>
                      <TableCell className="text-sm">{customer.phone || '-'}</TableCell>
                      <TableCell className="text-right text-sm">
                        {customer.customer_total_spent ? `${customer.customer_total_spent.toFixed(2)}€` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {customer.customer_total_orders || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setDetailsOpen(true);
                          }}
                        >
                          Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </PageContainer>

      {/* Customer Details Sheet */}
      {selectedCustomer && (
        <CustomerDetailsSheet
          customer={selectedCustomer}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      )}
    </DashboardLayout>
  );
};

export default CustomersList;
