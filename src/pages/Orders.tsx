import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ordersService, Order } from "@/services/ordersService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { OrderDetailsSheet } from "@/components/orders/OrderDetailsSheet";
import {
  getOrderSource,
  getOrderSourceConfig,
  getOrderStateLabel,
  getOrderStateClassName,
  getOrderTypeLabel,
} from "@/utils/orderUtils";
import { Loader2, ChevronRight } from "lucide-react";
import { CardSkeleton } from "@/components/shared/CardSkeleton";

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  
  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch pending orders
  useEffect(() => {
    ordersService
      .getPendingOrders()
      .then(setPendingOrders)
      .finally(() => setLoadingPending(false));
  }, []);

  // Fetch initial history
  useEffect(() => {
    ordersService
      .getOrderHistory(1, 20)
      .then((orders) => {
        setHistoryOrders(orders);
        setHasMoreHistory(orders.length === 20);
      })
      .finally(() => setLoadingHistory(false));
  }, []);

  // Load more history
  const loadMoreHistory = useCallback(async () => {
    if (loadingMore || !hasMoreHistory) return;

    setLoadingMore(true);
    const nextPage = historyPage + 1;
    
    try {
      const orders = await ordersService.getOrderHistory(nextPage, 20);
      setHistoryOrders((prev) => [...prev, ...orders]);
      setHistoryPage(nextPage);
      setHasMoreHistory(orders.length === 20);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMore(false);
    }
  }, [historyPage, loadingMore, hasMoreHistory]);

  // Intersection observer for infinite scroll - only on history tab
  useEffect(() => {
    if (activeTab !== "history") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreHistory && !loadingMore) {
          loadMoreHistory();
        }
      },
      { 
        threshold: 0,
        rootMargin: "200px"
      }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMoreHistory, hasMoreHistory, loadingMore, activeTab]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp * 1000), "PPp", { locale: fr });
  };

  const formatDateShort = (timestamp: number) => {
    return format(new Date(timestamp * 1000), "dd/MM HH:mm", { locale: fr });
  };

  const openOrder = (orderId: string) => {
    searchParams.set("orderId", orderId);
    setSearchParams(searchParams);
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const source = getOrderSource(order);
    const sourceConfig = getOrderSourceConfig(source);
    
    return (
      <Card
        className="p-3 md:p-4 cursor-pointer hover:shadow-card transition-shadow active:scale-[0.99] touch-target"
        onClick={() => openOrder(order.order_id)}
      >
        {/* Mobile Layout */}
        <div className="md:hidden">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">
                  #{order.order_num}
                </span>
                <Badge className={`${sourceConfig.className} text-xs`}>
                  {sourceConfig.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDateShort(order.creation_date)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="font-bold text-primary">
                  {formatCurrency(order.TTC)}
                </p>
                <Badge
                  variant="outline"
                  className={`text-xs ${getOrderStateClassName(order.state)}`}
                >
                  {getOrderStateLabel(order.state)}
                </Badge>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          {order.order_type && (
            <div className="mt-2 pt-2 border-t border-border">
              <Badge variant="secondary" className="text-xs">
                {getOrderTypeLabel(order.order_type)}
              </Badge>
              <span className="text-xs text-muted-foreground ml-2">
                {order.products.length} article{order.products.length > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-semibold text-foreground">
                Cmd #{order.order_num}
              </span>
              <Badge className={sourceConfig.className}>
                {sourceConfig.label}
              </Badge>
              {order.order_type && (
                <Badge variant="outline" className="text-xs">
                  {getOrderTypeLabel(order.order_type)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(order.creation_date)}
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">Montant TTC</p>
            <p className="text-sm text-muted-foreground">
              {order.products.length} article{order.products.length > 1 ? "s" : ""}
            </p>
          </div>

          <div className="text-right">
            <Badge
              variant="outline"
              className={`mb-1 ${getOrderStateClassName(order.state)}`}
            >
              {getOrderStateLabel(order.state)}
            </Badge>
            <p className="font-bold text-primary">
              {formatCurrency(order.TTC)}
            </p>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="mobile-padding space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Commandes</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Gérez vos commandes en cours et consultez l'historique
          </p>
        </div>

        <Tabs 
          defaultValue="pending" 
          className="w-full"
          onValueChange={setActiveTab}
        >
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="pending" className="flex-1 md:flex-none min-h-[44px]">
              En Cours
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 md:flex-none min-h-[44px]">
              Historique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4 md:mt-6">
            {loadingPending ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <CardSkeleton key={i} lines={2} showBadge />
                ))}
              </div>
            ) : pendingOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Aucune commande en cours
                </p>
              </div>
            ) : (
              pendingOrders.map((order) => (
                <OrderCard key={order.order_id} order={order} />
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3 mt-4 md:mt-6">
            {loadingHistory ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <CardSkeleton key={i} lines={2} showBadge />
                ))}
              </div>
            ) : historyOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Aucun historique</p>
              </div>
            ) : (
              <>
                {historyOrders.map((order) => (
                  <OrderCard key={order.order_id} order={order} />
                ))}
                
                {/* Infinite scroll trigger */}
                <div ref={observerTarget} className="py-4">
                  {loadingMore && (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Chargement...</span>
                    </div>
                  )}
                  {!hasMoreHistory && historyOrders.length > 0 && (
                    <p className="text-center text-sm text-muted-foreground">
                      Fin de l'historique
                    </p>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <OrderDetailsSheet />
    </DashboardLayout>
  );
}
