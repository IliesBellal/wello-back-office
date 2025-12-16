import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Users } from "lucide-react";
import CustomerCard from "@/components/customers/CustomerCard";
import CustomerDetailsSheet from "@/components/customers/CustomerDetailsSheet";
import CreateLoyaltyProgramDialog from "@/components/customers/CreateLoyaltyProgramDialog";
import { Customer, getCustomersList, searchCustomers } from "@/services/customersService";
import { toast } from "sonner";

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loyaltyDialogOpen, setLoyaltyDialogOpen] = useState(false);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const loadCustomers = async (pageNum: number = 1, append: boolean = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const result = await getCustomersList(pageNum, 20);
      if (append) {
        setCustomers(prev => [...prev, ...result.data]);
      } else {
        setCustomers(result.data);
      }
      setHasMore(result.hasMore);
      setPage(pageNum);
    } catch (error) {
      toast.error("Erreur lors du chargement des clients");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setIsSearching(false);
      loadCustomers(1, false);
      return;
    }

    setIsSearching(true);
    setLoading(true);
    try {
      const results = await searchCustomers(term);
      setCustomers(results);
      setHasMore(false);
    } catch (error) {
      toast.error("Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  }, []);

  const onSearchChange = (value: string) => {
    setSearchTerm(value);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      handleSearch(value);
    }, 500);
  };

  useEffect(() => {
    loadCustomers();
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isSearching || !hasMore || loadingMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadCustomers(page + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [page, hasMore, loadingMore, isSearching]);

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailsOpen(true);
  };

  const handleOrderClick = (orderId: string) => {
    // Navigate to order or open order sheet
    window.history.pushState({}, "", `?orderId=${orderId}`);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          </div>
          <Button onClick={() => setLoyaltyDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Programme Fidélité
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Customer List */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? "Aucun client trouvé" : "Aucun client"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {customers.map(customer => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onClick={() => handleCustomerClick(customer)}
                />
              ))}
            </div>

            {/* Infinite scroll trigger */}
            {!isSearching && hasMore && (
              <div ref={loadMoreRef} className="py-4">
                {loadingMore && (
                  <div className="flex justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Customer Details Sheet */}
      <CustomerDetailsSheet
        customer={selectedCustomer}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onOrderClick={handleOrderClick}
      />

      {/* Create Loyalty Program Dialog */}
      <CreateLoyaltyProgramDialog
        open={loyaltyDialogOpen}
        onOpenChange={setLoyaltyDialogOpen}
        onSuccess={() => toast.success("Programme créé avec succès")}
      />
    </DashboardLayout>
  );
};

export default Customers;
