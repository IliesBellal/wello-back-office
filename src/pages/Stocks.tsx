import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageContainer } from "@/components/shared";
import { TabSystem } from "@/components/shared/TabSystem";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Package, Calendar } from "lucide-react";
import { getStocksList, StockComponent, getStockMovements, getMovementsSummary, StockMovement } from "@/services/stocksService";
import { StockMovementDialog } from "@/components/stocks/StockMovementDialog";
import { AdvancedDatePicker } from "@/components/shared/AdvancedDatePicker";
import { Tile } from "@/components/shared/Tile";
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
  const [movementsSummary, setMovementsSummary] = useState<any[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

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
      const fromStr = format(movementDateRange.from, 'yyyy-MM-dd');
      const toStr = format(movementDateRange.to, 'yyyy-MM-dd');
      const [mvts, summary] = await Promise.all([
        getStockMovements(fromStr, toStr),
        getMovementsSummary(fromStr, toStr)
      ]);
      setMovements(mvts);
      setMovementsSummary(summary);
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
                            {component.quantity} {component.unit.unit_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{formatPrice(component.purchasing_price)}/{component.unit.unit_name}</TableCell>
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
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <AdvancedDatePicker
                value={movementDateRange}
                onChange={setMovementDateRange}
              />
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
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {movementsSummary.map((item) => (
              <Tile
                key={item.component_id}
                title={item.component_name}
                value={`${item.total_consumed.toFixed(1)} ${item.unit}`}
                isHighlighted={false}
              >
                <p className="text-xs text-muted-foreground mt-2">Consommé</p>
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
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun mouvement pour cette période
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="text-sm">
                      {format(new Date(movement.created_at), 'dd MMM HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {movement.type === 'consommation' ? (
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
                        movement.type === 'ajout' ? 'bg-green-100 text-green-700' :
                        movement.type === 'consommation' ? 'bg-blue-100 text-blue-700' :
                        movement.type === 'retrait' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {movement.type}
                      </span>
                    </TableCell>
                    <TableCell>{movement.quantity} {movement.unit}</TableCell>
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
