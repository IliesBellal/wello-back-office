import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Phone, Mail, MapPin, ShoppingBag, DollarSign, TrendingUp, 
  ExternalLink, Edit2, Crown, Gift, Check
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { 
  Customer, CustomerOrder, CustomerLoyalty, LoyaltyProgram, Reward,
  getCustomerOrders, getCustomerLoyalty, updateLoyaltyProgress, updateRewardStatus,
  acquisitionSourceLabels, deliveryTypeLabels
} from "@/services/customersService";

interface CustomerDetailsSheetProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderClick?: (orderId: string) => void;
}

const CustomerDetailsSheet = ({ customer, open, onOpenChange, onOrderClick }: CustomerDetailsSheetProps) => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loyalty, setLoyalty] = useState<CustomerLoyalty | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [editingProgram, setEditingProgram] = useState<string | null>(null);
  const [newProgramValue, setNewProgramValue] = useState("");

  useEffect(() => {
    if (open && customer) {
      setActiveTab("general");
      setOrders([]);
      setLoyalty(null);
    }
  }, [open, customer]);

  useEffect(() => {
    if (activeTab === "orders" && customer && orders.length === 0) {
      loadOrders();
    }
    if (activeTab === "loyalty" && customer && !loyalty) {
      loadLoyalty();
    }
  }, [activeTab, customer]);

  const loadOrders = async () => {
    if (!customer) return;
    setLoadingOrders(true);
    try {
      const data = await getCustomerOrders(customer.id);
      setOrders(data);
    } catch (error) {
      toast.error("Erreur lors du chargement des commandes");
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadLoyalty = async () => {
    if (!customer) return;
    setLoadingLoyalty(true);
    try {
      const data = await getCustomerLoyalty(customer.id);
      setLoyalty(data);
    } catch (error) {
      toast.error("Erreur lors du chargement de la fidélité");
    } finally {
      setLoadingLoyalty(false);
    }
  };

  const handleUpdateProgram = async (programId: string, targetValue: number) => {
    if (!customer || !newProgramValue) return;
    const value = parseInt(newProgramValue);
    if (isNaN(value) || value < 0) {
      toast.error("Valeur invalide");
      return;
    }

    try {
      await updateLoyaltyProgress(customer.id, programId, value);
      if (value >= targetValue) {
        toast.success("Récompense débloquée !");
      } else {
        toast.success("Progression mise à jour");
      }
      setEditingProgram(null);
      setNewProgramValue("");
      loadLoyalty();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleToggleReward = async (reward: Reward) => {
    if (!customer) return;
    try {
      await updateRewardStatus(customer.id, reward.id, !reward.is_used);
      toast.success(reward.is_used ? "Récompense marquée comme disponible" : "Récompense marquée comme utilisée");
      loadLoyalty();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  if (!customer) return null;

  const displayName = customer.first_name 
    ? `${customer.first_name} ${customer.last_name}` 
    : customer.customer_name || "Client";

  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const memberSince = format(new Date(customer.created_at), "MMMM yyyy", { locale: fr });
  const isVIP = customer.customer_total_spent > 50000;

  const totalSpent = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(customer.customer_total_spent / 100);
  const avgBasket = customer.customer_total_orders > 0 
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format((customer.customer_total_spent / customer.customer_total_orders) / 100)
    : "0,00 €";

  const fullAddress = customer.address 
    ? `${customer.address.street_number || ""} ${customer.address.street || ""}, ${customer.address.zip_code || ""} ${customer.address.city || ""}`.trim()
    : null;

  const googleMapsUrl = fullAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}` : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <SheetTitle className="text-xl">{displayName}</SheetTitle>
                {isVIP && (
                  <Badge variant="default" className="bg-amber-500">
                    <Crown className="h-3 w-3 mr-1" />
                    VIP
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Membre depuis {memberSince}</p>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="orders">Commandes</TabsTrigger>
            <TabsTrigger value="loyalty">Fidélité</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            {/* Contact Info */}
            <Card>
              <CardContent className="p-4 space-y-3">
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </a>
                )}
                {customer.email && (
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.email}</span>
                  </a>
                )}
                {fullAddress && googleMapsUrl && (
                  <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-sm hover:text-primary transition-colors">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="flex-1">{fullAddress}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Map Preview */}
            {customer.address?.lat && customer.address?.lng && (
              <Card>
                <CardContent className="p-0">
                  <div className="h-40 bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
                    <div className="text-center z-10">
                      <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Distance: ~2.5km</p>
                      <Badge variant="outline" className="mt-1">Zone de Livraison A</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <ShoppingBag className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">{customer.customer_total_orders}</p>
                  <p className="text-xs text-muted-foreground">Commandes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <DollarSign className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{totalSpent}</p>
                  <p className="text-xs text-muted-foreground">Total dépensé</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{avgBasket}</p>
                  <p className="text-xs text-muted-foreground">Panier moyen</p>
                </CardContent>
              </Card>
            </div>

            <div className="pt-2">
              <Badge variant="secondary">
                Source: {acquisitionSourceLabels[customer.acquisition_source] || customer.acquisition_source}
              </Badge>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-3 mt-4">
            {loadingOrders ? (
              <>
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </>
            ) : orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucune commande</p>
            ) : (
              orders.map(order => (
                <Card 
                  key={order.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onOrderClick?.(order.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.date), "dd/MM/yyyy HH:mm")}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {deliveryTypeLabels[order.delivery_type] || order.delivery_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{order.items_count} articles</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(order.total / 100)}
                        </p>
                        <Badge variant={order.status === "COMPLETED" ? "default" : "secondary"} className="text-xs">
                          {order.status === "COMPLETED" ? "Terminée" : order.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="loyalty" className="space-y-6 mt-4">
            {loadingLoyalty ? (
              <>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            ) : !loyalty ? (
              <p className="text-center text-muted-foreground py-8">Aucun programme de fidélité</p>
            ) : (
              <>
                {/* Active Programs */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Programmes en cours
                  </h3>
                  {loyalty.programs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun programme actif</p>
                  ) : (
                    <div className="space-y-3">
                      {loyalty.programs.map(program => (
                        <Card key={program.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium">{program.name}</p>
                                <p className="text-sm text-muted-foreground">{program.description}</p>
                              </div>
                              <Popover open={editingProgram === program.id} onOpenChange={(open) => {
                                setEditingProgram(open ? program.id : null);
                                if (!open) setNewProgramValue("");
                              }}>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64">
                                  <div className="space-y-3">
                                    <p className="text-sm font-medium">Modifier la progression</p>
                                    <Input
                                      type="number"
                                      placeholder={`Actuel: ${program.current_value}`}
                                      value={newProgramValue}
                                      onChange={(e) => setNewProgramValue(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      Si la valeur dépasse la cible ({program.target_value}), une récompense sera générée.
                                    </p>
                                    <Button 
                                      size="sm" 
                                      className="w-full"
                                      onClick={() => handleUpdateProgram(program.id, program.target_value)}
                                    >
                                      Valider
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>{program.current_value} / {program.target_value}</span>
                                <span>{Math.round((program.current_value / program.target_value) * 100)}%</span>
                              </div>
                              <Progress value={(program.current_value / program.target_value) * 100} className="h-2" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rewards */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Récompenses
                  </h3>
                  {loyalty.rewards.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune récompense</p>
                  ) : (
                    <div className="space-y-3">
                      {loyalty.rewards.map(reward => (
                        <Card key={reward.id} className={reward.is_used ? "opacity-60" : ""}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium flex items-center gap-2">
                                  {reward.reward_type === "percent_discount" && `${reward.reward_value}% de réduction`}
                                  {reward.reward_type === "fixed_discount" && `${(reward.reward_value / 100).toFixed(2)}€ de réduction`}
                                  {reward.reward_type === "free_product" && `Produit offert: ${reward.reward_products?.join(", ")}`}
                                  {reward.is_used && <Check className="h-4 w-4 text-muted-foreground" />}
                                </p>
                                <p className="text-sm text-muted-foreground">{reward.program_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(reward.created_at), "dd/MM/yyyy")}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  {reward.is_used ? "Utilisée" : "Disponible"}
                                </span>
                                <Switch
                                  checked={reward.is_used}
                                  onCheckedChange={() => handleToggleReward(reward)}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default CustomerDetailsSheet;
