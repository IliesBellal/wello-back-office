import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ordersService, Order } from "@/services/ordersService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { OrderDetailsSheet } from "@/components/orders/OrderDetailsSheet";

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  
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

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreHistory && !loadingMore) {
          loadMoreHistory();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMoreHistory, hasMoreHistory, loadingMore]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp * 1000), "PPp", { locale: fr });
  };

  const openOrder = (orderId: string) => {
    searchParams.set("orderId", orderId);
    setSearchParams(searchParams);
  };

  const getBrandColor = (brand: string) => {
    switch (brand) {
      case "UBER":
        return "bg-black text-white";
      case "DELIVEROO":
        return "bg-[#00CCBC] text-white";
      case "WELLO_RESTO":
        return "bg-gradient-primary text-white";
      default:
        return "bg-gradient-primary text-white";
    }
  };

  const getBrandLabel = (brand: string) => {
    switch (brand) {
      case "WELLO_RESTO":
        return "Wello";
      case "UBER":
        return "Uber";
      case "DELIVEROO":
        return "Deliveroo";
      default:
        return brand;
    }
  };

  const OrderCard = ({ order }: { order: Order }) => (
    <Card
      className="p-4 cursor-pointer hover:shadow-card transition-shadow"
      onClick={() => openOrder(order.order_id)}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-foreground">
              Cmd #{order.order_num}
            </span>
            <Badge className={getBrandColor(order.brand)} variant="secondary">
              {getBrandLabel(order.brand)}
            </Badge>
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
            variant={order.state === "OPEN" ? "default" : "secondary"}
            className="mb-1"
          >
            {order.state === "OPEN" ? "En cours" : "Fermée"}
          </Badge>
          <p className="font-bold text-primary">
            {formatCurrency(order.TTC)}
          </p>
        </div>
      </div>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Commandes</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos commandes en cours et consultez l'historique
          </p>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending">En Cours</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-6">
            {loadingPending ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))
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

          <TabsContent value="history" className="space-y-3 mt-6">
            {loadingHistory ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))
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
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
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
