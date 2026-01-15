import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
} from "@/components/ui/responsive-sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, MapPin } from "lucide-react";
import { ordersService, Order } from "@/services/ordersService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  getOrderSource,
  getOrderSourceConfig,
  getOrderStateLabel,
  getOrderStateClassName,
  getOrderTypeLabel,
  getMerchantApprovalLabel,
  getMerchantApprovalClassName,
} from "@/utils/orderUtils";
import { CardSkeleton } from "@/components/shared/CardSkeleton";

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

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp * 1000), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
  };

  if (!order && !loading) return null;

  const source = order ? getOrderSource(order) : null;
  const sourceConfig = source ? getOrderSourceConfig(source) : null;

  return (
    <ResponsiveSheet open={!!orderId} onOpenChange={(open) => !open && handleClose()}>
      <ResponsiveSheetContent>
        {loading ? (
          <div className="space-y-4">
            <CardSkeleton lines={2} />
            <CardSkeleton lines={4} />
            <CardSkeleton lines={3} />
          </div>
        ) : order ? (
          <>
            <ResponsiveSheetHeader className="space-y-3 md:space-y-4">
              <div className="flex items-center justify-between pr-8">
                <ResponsiveSheetTitle>Commande #{order.order_num}</ResponsiveSheetTitle>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Badge
                    variant="outline"
                    className={getOrderStateClassName(order.state)}
                  >
                    {getOrderStateLabel(order.state)}
                  </Badge>
                  {sourceConfig && (
                    <Badge className={sourceConfig.className}>
                      {sourceConfig.label}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Order Date & Type */}
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="capitalize">{formatDate(order.creation_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Badge variant="secondary" className="font-normal">
                    {getOrderTypeLabel(order.order_type || order.fulfillment_type)}
                  </Badge>
                </div>
              </div>
            </ResponsiveSheetHeader>

            <Tabs defaultValue="resume" className="mt-4 md:mt-6">
              <TabsList className="w-full">
                <TabsTrigger value="resume" className="flex-1 min-h-[44px]">
                  Résumé
                </TabsTrigger>
                <TabsTrigger value="panier" className="flex-1 min-h-[44px]">
                  Panier
                </TabsTrigger>
              </TabsList>

              <TabsContent value="resume" className="space-y-4 md:space-y-6 mt-4">
                {/* Customer Section */}
                {order.customer && (
                  <div className="bg-card rounded-xl p-3 md:p-4 shadow-soft space-y-3">
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
                          className="font-medium text-primary hover:underline flex items-center gap-1 min-h-[44px] py-2"
                        >
                          {order.customer.customer_tel}
                          <Phone className="w-4 h-4" />
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

                {/* Products Section */}
                <div className="bg-card rounded-xl p-3 md:p-4 shadow-soft space-y-3">
                  <h3 className="font-semibold text-foreground">
                    Panier ({order.products.length} article{order.products.length > 1 ? 's' : ''})
                  </h3>
                  <div className="space-y-3">
                    {order.products.map((product, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-start py-2 border-b border-border last:border-0"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
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
                        </div>
                        <span className="font-medium text-foreground ml-2">
                          {formatCurrency(product.price * product.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Section */}
                <div className="bg-card rounded-xl p-3 md:p-4 shadow-soft space-y-3">
                  <h3 className="font-semibold text-foreground">Paiements</h3>
                  <div className="space-y-2">
                    {order.payments.map((payment, idx) => {
                      const isCancelled = payment.enabled === 0;
                      return (
                        <div
                          key={idx}
                          className={`flex justify-between text-sm items-center min-h-[44px] ${
                            isCancelled ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-muted-foreground ${isCancelled ? 'line-through' : ''}`}>
                              {payment.mop}
                            </span>
                            {isCancelled && (
                              <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                                Annulé
                              </Badge>
                            )}
                          </div>
                          <span className={`font-medium ${isCancelled ? 'line-through text-muted-foreground' : ''}`}>
                            {formatCurrency(payment.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Order Info Section */}
                <div className="bg-card rounded-xl p-3 md:p-4 shadow-soft space-y-3">
                  <h3 className="font-semibold text-foreground">Informations</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center min-h-[44px]">
                      <span className="text-muted-foreground">Statut Marchand:</span>
                      <Badge 
                        variant="outline" 
                        className={getMerchantApprovalClassName(order.merchant_approval)}
                      >
                        {getMerchantApprovalLabel(order.merchant_approval)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Totals Section */}
                <div className="bg-card rounded-xl p-3 md:p-4 shadow-soft space-y-3">
                  <h3 className="font-semibold text-foreground">Totaux</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between min-h-[44px] items-center">
                      <span className="text-muted-foreground">HT:</span>
                      <span className="font-medium">
                        {formatCurrency(order.HT)}
                      </span>
                    </div>
                    <div className="flex justify-between min-h-[44px] items-center">
                      <span className="text-muted-foreground">TVA:</span>
                      <span className="font-medium">
                        {formatCurrency(order.TVA)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 min-h-[44px] items-center">
                      <span className="font-semibold">TTC:</span>
                      <span className="font-bold text-primary text-lg">
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
                    className="bg-card rounded-xl p-3 md:p-4 shadow-soft space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
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
                      <span className="font-semibold text-foreground ml-2">
                        {formatCurrency(product.price * product.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
};
