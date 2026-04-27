import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageContainer } from "@/components/shared";
import { TabSystem } from "@/components/shared/TabSystem";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Calendar, Minus, Package, Plus } from "lucide-react";
import { getStocksList, StockComponent, getStockMovements, StockMovement, StockMovementType } from "@/services/stocksService";
import { StockMovementDialog } from "@/components/stocks/StockMovementDialog";
import { AdvancedDatePicker } from "@/components/shared/AdvancedDatePicker";
import { Tile } from "@/components/shared/Tile";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const Stocks = () => {
  const [activeTab, setActiveTab] = useState<string>("actuel");
  const [stocks, setStocks] = useState<StockComponent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<StockComponent | null>(null);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);

  // Tab "Mouvements" state
  const [movementDateRange, setMovementDateRange] = useState<{ from: Date; to: Date }>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);
    return { from, to };
  });
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [selectedMovementTypes, setSelectedMovementTypes] = useState<StockMovementType[]>([
    "add",
    "remove",
    "loss",
    "consumption",
  ]);

  // Fetch stocks
  const fetchStocks = async () => {
    setIsLoading(true);
    try {
      const data = await getStocksList();
      setStocks(data);
    } catch (error) {
      console.error("Error fetching stocks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch movements
  const fetchMovements = async () => {
    setMovementsLoading(true);
    try {
      const mvts = await getStockMovements(movementDateRange.from, movementDateRange.to);
      setMovements(mvts);
    } catch (error) {
      console.error("Error fetching movements:", error);
    } finally {
      setMovementsLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  useEffect(() => {
    if (activeTab === "mouvements") {
      fetchMovements();
    }
  }, [activeTab, movementDateRange]);

  const filteredStocks = showLowStockOnly
    ? stocks.filter((s) => s.quantity < s.alert_threshold)
    : stocks;

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  const toggleMovementType = (type: StockMovementType, checked: boolean) => {
    setSelectedMovementTypes((current) => {
      if (checked) {
        return current.includes(type) ? current : [...current, type];
      }

      return current.filter((entry) => entry !== type);
    });
  };

  const filteredMovements = movements.filter((movement) => selectedMovementTypes.includes(movement.type));

  const movementSummary = Array.from(
    filteredMovements.reduce((summaryMap, movement) => {
      const stockComponent = stocks.find((component) => component.component_id === movement.component_id);
      const purchasingPrice = stockComponent?.purchasing_price ?? 0;
      const existing = summaryMap.get(movement.component_id);

      if (existing) {
        existing.totalQuantity += movement.quantity;
        existing.totalValue += movement.quantity * purchasingPrice;
        return summaryMap;
      }

      summaryMap.set(movement.component_id, {
        component_id: movement.component_id,
        component_name: movement.component_name,
        unit: {
          unit_short_name: movement.unit.unit_short_name,
          unit_name: movement.unit.unit_name,
          unit_id: movement.unit.unit_id,
        },
        totalQuantity: movement.quantity,
        totalValue: movement.quantity * purchasingPrice,
      });

      return summaryMap;
    }, new Map<string, {
      component_id: string;
      component_name: string;
      unit: {
        unit_short_name: string;
        unit_name: string;
        unit_id: string;
      };
      totalQuantity: number;
      totalValue: number;
    }>()).values()
  );

  const movementTypeLabels: Record<StockMovementType, string> = {
    add: "Ajouts",
    remove: "Retraits",
    loss: "Pertes",
    consumption: "Consommations",
  };

  const movementTypeIcons: Record<StockMovementType, React.ReactNode> = {
    add: <Plus className="w-5 h-5" />,
    remove: <Minus className="w-5 h-5" />,
    loss: <AlertTriangle className="w-5 h-5" />,
    consumption: <Package className="w-5 h-5" />,
  };

  const handleMovementClick = (component: StockComponent) => {
    setSelectedComponent(component);
    setIsMovementDialogOpen(true);
  };

  const handleMovementSuccess = () => {
    fetchStocks();
  };

  // Render current stock tab
  const renderCurrentStockTab = () => {
    const filteredStocks = showLowStockOnly
      ? stocks.filter((s) => s.quantity < s.alert_threshold)
      : stocks;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Switch
            id="low-stock-filter"
            checked={showLowStockOnly}
            onCheckedChange={setShowLowStockOnly}
          />
          <Label htmlFor="low-stock-filter" className="text-sm font-medium cursor-pointer">
            Alerte Stock Bas
          </Label>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>En stock</TableHead>
                <TableHead>Coût Moyen</TableHead>
                <TableHead>Valeur</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredStocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {showLowStockOnly
                      ? "Aucun stock bas détecté"
                      : "Aucun composant trouvé"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStocks.map((component) => {
                  const isLowStock = component.quantity < component.alert_threshold;
                  const totalValue = component.quantity * component.purchasing_price;

                  return (
                    <TableRow key={component.component_id}>
                      <TableCell className="font-medium">{component.name}</TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-2 ${isLowStock ? "text-destructive" : ""}`}>
                          {isLowStock && <AlertTriangle className="h-4 w-4" />}
                          <span className="font-medium">
                            {component.quantity} {component.unit.unit_short_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{formatPrice(component.purchasing_price)}/{component.unit.unit_short_name}</TableCell>
                      <TableCell className="font-medium">{formatPrice(totalValue)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMovementClick(component)}
                        >
                          Mouvement
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  // Render movements tab
  const renderMovementsTab = () => {
    return (
      <div className="space-y-6">
        {/* Date Range Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <AdvancedDatePicker
                  value={movementDateRange}
                  onChange={setMovementDateRange}
                />
              </div>

              <div className="flex flex-wrap gap-4">
                {(["add", "remove", "loss", "consumption"] as StockMovementType[]).map((type) => (
                  <label
                    key={type}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-all whitespace-nowrap",
                      selectedMovementTypes.includes(type)
                        ? "border-primary bg-primary/5"
                        : "border-input hover:border-primary/50 hover:bg-accent/50"
                    )}
                  >
                    <Checkbox
                      checked={selectedMovementTypes.includes(type)}
                      onCheckedChange={(checked) => toggleMovementType(type, Boolean(checked))}
                      className="mt-0.5"
                    />
                    <div className="flex items-center gap-2">
                      <div className="text-muted-foreground">
                        {movementTypeIcons[type]}
                      </div>
                      <span className="text-sm font-medium">{movementTypeLabels[type]}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consumption Summary Tiles */}
        {movementsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : movementSummary.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Aucun mouvement ne correspond aux filtres selectionnes
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {movementSummary.map((item) => (
              <Tile
                key={item.component_id}
                title={item.component_name}
                value={`${item.totalQuantity.toFixed(1)} ${item.unit.unit_short_name}`}
                isHighlighted={false}
              >
                <p className="text-xs text-muted-foreground mt-2">Valorisation: {formatPrice(item.totalValue)}</p>
              </Tile>
            ))}
          </div>
        )}

        {/* Movements Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Ingrédient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Commentaire</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movementsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  </TableRow>
                ))
              ) : filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun mouvement pour les filtres selectionnes
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="text-sm">
                      {format(new Date(movement.created_at), 'dd MMM HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {movement.type === 'consumption' ? (
                        <div>
                          <p className="font-medium">{movement.component_name}</p>
                          <p className="text-xs text-muted-foreground italic">{movement.product_name}</p>
                        </div>
                      ) : (
                        <p className="font-medium">{movement.component_name}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        movement.type === 'add' ? 'bg-green-100 text-green-700' :
                        movement.type === 'consumption' ? 'bg-blue-100 text-blue-700' :
                        movement.type === 'remove' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {movementTypeLabels[movement.type]}
                      </span>
                    </TableCell>
                    <TableCell>{movement.quantity} {movement.unit.unit_short_name}</TableCell>
                    <TableCell className="text-sm">{movement.created_by}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{movement.comment || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Gestion des Stocks</h1>
          </div>
        }
      >
        <TabSystem
          tabs={[
            { id: "actuel", label: "Stock actuel" },
            { id: "mouvements", label: "Mouvements" }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          renderContent={(tabId) => {
            if (tabId === "actuel") return renderCurrentStockTab();
            if (tabId === "mouvements") return renderMovementsTab();
            return null;
          }}
        />
      </PageContainer>

      <StockMovementDialog
        component={selectedComponent}
        open={isMovementDialogOpen}
        onOpenChange={setIsMovementDialogOpen}
        onSuccess={handleMovementSuccess}
      />
    </DashboardLayout>
  );
};

export default Stocks;
