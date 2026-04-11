import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { MFAProvider } from "./contexts/MFAContext";
import { ProductCreateSheetProvider } from "./contexts/ProductCreateSheetContext";
import { OrganizeModalProvider } from "./contexts/OrganizeModalContext";
import { CommandPaletteProvider } from "./components/command-palette";
import { ProtectedRoute } from "./components/shared/ProtectedRoute";
import GlobalLoadingBar from "./components/GlobalLoadingBar";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import Menu from "./pages/Menu";
import CategoriesTable from './pages/CategoriesTable';
import MarketCategoriesTable from './pages/MarketCategoriesTable';
import TagsTable from './pages/TagsTable';
import Components from './pages/Components';
import FinancialReports from './pages/FinancialReports';
import Locations from './pages/Locations';
import CashRegisterHistory from './pages/CashRegisterHistory';
import VAT from './pages/TVA';
import Customers from './pages/Customers';
import CustomersList from './pages/CustomersList';
import LoyaltyPrograms from './pages/LoyaltyPrograms';
import Stocks from './pages/Stocks';
import PriceGrid from './pages/PriceGrid';
import AttributesPage from './pages/Attributes';
import PromotionsAvailabilities from './pages/PromotionsAvailabilities';
import DashboardAnalysis from './pages/DashboardAnalysis';
import DashboardOrderHistory from './pages/DashboardOrderHistory';
import IntegrationsOverview from './pages/IntegrationsOverview';
import UberEats from './pages/UberEats';
import Deliveroo from './pages/Deliveroo';
import ScanNOrder from './pages/ScanNOrder';
import EquipePlanning from './pages/equipe/Planning';
import EquipeEmployes from './pages/equipe/Employees';
import EquipePointages from './pages/equipe/Timesheets';
import EquipeConges from './pages/equipe/Leaves';
import HacCPCompliance from './pages/haccp/Compliance';
import HacCPHistory from './pages/haccp/History';
import HacCPAlerts from './pages/haccp/Alerts';
import NotImplementedPage from './pages/NotImplementedPage';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <MFAProvider>
        <AuthProvider>
          <BrowserRouter>
            <ProductCreateSheetProvider>
              <OrganizeModalProvider>
                <CommandPaletteProvider>
                <GlobalLoadingBar />
                <Toaster />
                <Sonner />
                <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              
              {/* Menu Management */}
              <Route path="/menu/products" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
              <Route path="/menu/categories" element={<ProtectedRoute><CategoriesTable /></ProtectedRoute>} />
              <Route path="/menu/market-categories" element={<ProtectedRoute><MarketCategoriesTable /></ProtectedRoute>} />
              <Route path="/menu/tags" element={<ProtectedRoute><TagsTable /></ProtectedRoute>} />
              <Route path="/menu/components" element={<ProtectedRoute><Components /></ProtectedRoute>} />
              <Route path="/menu/price-grid" element={<ProtectedRoute><PriceGrid /></ProtectedRoute>} />
              <Route path="/menu/attributes" element={<ProtectedRoute><AttributesPage /></ProtectedRoute>} />
              <Route path="/menu/promotions" element={<ProtectedRoute><PromotionsAvailabilities /></ProtectedRoute>} />
              
              {/* Location & Service */}
              <Route path="/locations" element={<ProtectedRoute><Locations /></ProtectedRoute>} />
              <Route path="/customers/list" element={<ProtectedRoute><CustomersList /></ProtectedRoute>} />
              <Route path="/customers/loyalty-programs" element={<ProtectedRoute><LoyaltyPrograms /></ProtectedRoute>} />
              
              {/* Stocks */}
              <Route path="/stocks" element={<ProtectedRoute><Stocks /></ProtectedRoute>} />
              
              {/* Accounting */}
              <Route path="/accounting/registers" element={<ProtectedRoute><CashRegisterHistory /></ProtectedRoute>} />
              <Route path="/accounting/vat" element={<ProtectedRoute><VAT /></ProtectedRoute>} />
              <Route path="/accounting/report" element={<ProtectedRoute><FinancialReports /></ProtectedRoute>} />
              
              {/* Reports & Analytics */}
              {/* Consolidated under Accounting section */}
              
              {/* Administration */}
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/:section" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/integrations" element={<ProtectedRoute><NotImplementedPage title="Intégrations" /></ProtectedRoute>} />
              
              {/* Dashboard Sub-pages */}
              <Route path="/dashboard/analysis" element={<ProtectedRoute><DashboardAnalysis /></ProtectedRoute>} />
              <Route path="/dashboard/order-history" element={<ProtectedRoute><DashboardOrderHistory /></ProtectedRoute>} />
              
              {/* Team Management */}
              <Route path="/equipe/planning" element={<ProtectedRoute><EquipePlanning /></ProtectedRoute>} />
              <Route path="/equipe/employes" element={<ProtectedRoute><EquipeEmployes /></ProtectedRoute>} />
              <Route path="/equipe/pointages" element={<ProtectedRoute><EquipePointages /></ProtectedRoute>} />
              <Route path="/equipe/conges" element={<ProtectedRoute><EquipeConges /></ProtectedRoute>} />
              
              {/* Integrations */}
              <Route path="/integrations" element={<ProtectedRoute><IntegrationsOverview /></ProtectedRoute>} />
              <Route path="/integrations/overview" element={<ProtectedRoute><IntegrationsOverview /></ProtectedRoute>} />
              <Route path="/integrations/scannorder" element={<ProtectedRoute><ScanNOrder /></ProtectedRoute>} />
              <Route path="/integrations/uber-eats" element={<ProtectedRoute><UberEats /></ProtectedRoute>} />
              <Route path="/integrations/deliveroo" element={<ProtectedRoute><Deliveroo /></ProtectedRoute>} />
              
              {/* HACCP - Hygiene & Safety */}
              <Route path="/haccp/compliance" element={<ProtectedRoute><HacCPCompliance /></ProtectedRoute>} />
              <Route path="/haccp/history" element={<ProtectedRoute><HacCPHistory /></ProtectedRoute>} />
              <Route path="/haccp/alerts" element={<ProtectedRoute><HacCPAlerts /></ProtectedRoute>} />
              
              {/* 404 Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
                </CommandPaletteProvider>
              </OrganizeModalProvider>
            </ProductCreateSheetProvider>
          </BrowserRouter>
        </AuthProvider>
      </MFAProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
