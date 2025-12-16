import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Package } from "lucide-react";
import { getStocksList, StockComponent } from "@/services/stocksService";
import { StockMovementDialog } from "@/components/stocks/StockMovementDialog";

const Stocks = () => {
  const [stocks, setStocks] = useState<StockComponent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<StockComponent | null>(null);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);

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

  useEffect(() => {
    fetchStocks();
  }, []);

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Gestion des Stocks</h1>
          </div>

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
        </div>

        {/* Data Table */}
        <div className="rounded-xl border bg-card shadow-sm">
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
