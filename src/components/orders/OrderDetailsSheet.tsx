import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone } from "lucide-react";
import { ordersService, Order } from "@/services/ordersService";

export const OrderDetailsSheet = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderId) {
      setLoading(true);
      ordersService
        .getOrderById(orderId)
        .then(setOrder)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setOrder(null);
    }
  }, [orderId]);

  const handleClose = () => {
    searchParams.delete("orderId");
    setSearchParams(searchParams);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
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

  return (
    <Sheet open={!!orderId} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : order ? (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between">
                <SheetTitle>Commande #{order.order_num}</SheetTitle>
                <div className="flex gap-2">
                  <Badge
                    variant={order.state === "OPEN" ? "default" : "secondary"}
                  >
                    {order.state === "OPEN" ? "En cours" : "Fermée"}
                  </Badge>
                  <Badge className={getBrandColor(order.brand)}>
                    {getBrandLabel(order.brand)}
                  </Badge>
                </div>
              </div>
            </SheetHeader>

            <Tabs defaultValue="resume" className="mt-6">
              <TabsList className="w-full">
                <TabsTrigger value="resume" className="flex-1">
                  Résumé
                </TabsTrigger>
                <TabsTrigger value="panier" className="flex-1">
                  Panier
                </TabsTrigger>
              </TabsList>

              <TabsContent value="resume" className="space-y-6 mt-4">
                {/* Customer Section */}
                {order.customer && (
                  <div className="bg-card rounded-xl p-4 shadow-soft space-y-3">
                    <h3 className="font-semibold text-foreground">Client</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Nom:</span>{" "}
                        <span className="font-medium">{order.customer.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Téléphone:</span>
                        <a
                          href={`tel:${order.customer.customer_tel}`}
                          className="font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          {order.customer.customer_tel}
                          <Phone className="w-3 h-3" />
                        </a>
                      </div>
                      {order.customer.customer_address && (
                        <div>
                          <span className="text-muted-foreground">Adresse:</span>{" "}
                          <span className="font-medium">
                            {order.customer.customer_address}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Nb de commandes:</span>{" "}
                        <span className="font-medium">{order.customer.customer_nb_orders}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Info Section */}
                <div className="bg-card rounded-xl p-4 shadow-soft space-y-3">
                  <h3 className="font-semibold text-foreground">Informations</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">État:</span>{" "}
                      <span className="font-medium">{order.state}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>{" "}
                      <span className="font-medium">{order.fulfillment_type}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Statut Marchand:</span>{" "}
                      <span className="font-medium">{order.merchant_approval}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Section */}
                <div className="bg-card rounded-xl p-4 shadow-soft space-y-3">
                  <h3 className="font-semibold text-foreground">Paiements</h3>
                  <div className="space-y-2">
                    {order.payments.map((payment, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-sm items-center"
                      >
                        <span className="text-muted-foreground">
                          {payment.mop}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals Section */}
                <div className="bg-card rounded-xl p-4 shadow-soft space-y-3">
                  <h3 className="font-semibold text-foreground">Totaux</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">HT:</span>
                      <span className="font-medium">
                        {formatCurrency(order.HT)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TVA:</span>
                      <span className="font-medium">
                        {formatCurrency(order.TVA)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold">TTC:</span>
                      <span className="font-bold text-primary">
                        {formatCurrency(order.TTC)}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="panier" className="space-y-3 mt-4">
                {order.products.map((product, idx) => (
                  <div
                    key={idx}
                    className="bg-card rounded-xl p-4 shadow-soft space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {product.name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            x{product.quantity}
                          </Badge>
                        </div>
                        {product.description && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {product.description}
                          </div>
                        )}
                        {product.components && product.components.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground space-y-1">
                            <div className="font-semibold">Composants:</div>
                            {product.components.map((comp, compIdx) => (
                              <div key={compIdx}>
                                - {comp.name} ({comp.quantity} {comp.unit_of_measure})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(product.price * product.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};
