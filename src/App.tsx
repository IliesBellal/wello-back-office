import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { MFAProvider } from "./contexts/MFAContext";
import { ProductCreateSheetProvider } from "./contexts/ProductCreateSheetContext";
import { OrganizeModalProvider } from "./contexts/OrganizeModalContext";
import { CommandPaletteProvider } from "./components/command-palette";
import { ProtectedRoute } from "./components/shared/ProtectedRoute";
import { checkPermission } from "@/lib/permissions";
import GlobalLoadingBar from "./components/GlobalLoadingBar";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import Menu from "./pages/Menu";
import CategoriesTable from './pages/CategoriesTable';
import MarketCategoriesTable from './pages/MarketCategoriesTable';
import TagsTable from './pages/TagsTable';
import PrintersTable from './pages/PrintersTable';
import ProductionProfilesTable from './pages/ProductionProfilesTable';
import Components from './pages/Components';
import ComponentCategoriesTable from './pages/ComponentCategoriesTable';
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
import EquipePage from './pages/equipe/EquipePage';
import PlanningPage from './pages/equipe/PlanningPage';
import MyPlanningPage from './pages/equipe/MyPlanningPage';
import Pointages from './pages/equipe/Pointages';
import CongesEchanges from './pages/equipe/CongesEchanges';
import EquipeSettings from './pages/equipe/EquipeSettings';
import RolesPage from './pages/equipe/RolesPage';
import MyPermissionsPage from './pages/settings/MyPermissionsPage';
import HacCPActivity from './pages/haccp/Activity';
import HacCPSettings from './pages/haccp/Settings';
import ReservationsListPage from './pages/reservations/List';
import ReservationsSettingsPage from './pages/reservations/Settings';
import KiosksPage from './pages/kiosks/KiosksPage';
import KioskSettingsPage from './pages/kiosks/KioskSettingsPage';
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
              {/* Public: the visitor has lost their password, so no ProtectedRoute. */}
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              
              {/* Menu Management */}
              <Route path="/menu/products" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
              <Route path="/menu/categories" element={<ProtectedRoute><CategoriesTable /></ProtectedRoute>} />
              <Route path="/menu/market-categories" element={<ProtectedRoute accessCheck={(authData) => checkPermission(authData, 'platforms.manage')}><MarketCategoriesTable /></ProtectedRoute>} />
              <Route path="/menu/tags" element={<ProtectedRoute><TagsTable /></ProtectedRoute>} />
              <Route path="/menu/components" element={<ProtectedRoute><Components /></ProtectedRoute>} />
              <Route path="/menu/components/categories" element={<ProtectedRoute><ComponentCategoriesTable /></ProtectedRoute>} />
              <Route path="/menu/price-grid" element={<ProtectedRoute><PriceGrid /></ProtectedRoute>} />
              <Route path="/menu/attributes" element={<ProtectedRoute><AttributesPage /></ProtectedRoute>} />
              <Route path="/menu/promotions" element={<ProtectedRoute><PromotionsAvailabilities /></ProtectedRoute>} />
              
              {/* Location & Service */}
              <Route path="/locations" element={<ProtectedRoute accessCheck={(authData) => checkPermission(authData, 'seating_plan.manage')}><Locations /></ProtectedRoute>} />
              <Route path="/reservations/list" element={<ProtectedRoute requiredModule="bookings"><ReservationsListPage /></ProtectedRoute>} />
              <Route path="/reservations/settings" element={<ProtectedRoute requiredModule="bookings" accessCheck={(authData) => checkPermission(authData, 'bookings.manage')}><ReservationsSettingsPage /></ProtectedRoute>} />
              <Route path="/customers/list" element={<ProtectedRoute><CustomersList /></ProtectedRoute>} />
              <Route path="/customers/loyalty-programs" element={<ProtectedRoute><LoyaltyPrograms /></ProtectedRoute>} />
              
              {/* Stocks */}
              <Route path="/stocks" element={<ProtectedRoute requiredModule="stock"><Stocks /></ProtectedRoute>} />
              
              {/* Accounting */}
              <Route path="/accounting/registers" element={<ProtectedRoute><CashRegisterHistory /></ProtectedRoute>} />
              <Route path="/accounting/vat" element={<ProtectedRoute><VAT /></ProtectedRoute>} />
              <Route path="/accounting/report" element={<ProtectedRoute><FinancialReports /></ProtectedRoute>} />
              
              {/* Reports & Analytics */}
              {/* Consolidated under Accounting section */}
              
              {/* Kiosk */}
              <Route path="/kiosk/devices" element={<ProtectedRoute requiredModule="kiosks" accessCheck={(authData) => checkPermission(authData, 'kiosk.manage')}><KiosksPage /></ProtectedRoute>} />
              <Route path="/kiosk/settings" element={<ProtectedRoute requiredModule="kiosks" accessCheck={(authData) => checkPermission(authData, 'kiosk.manage')}><KioskSettingsPage /></ProtectedRoute>} />

              {/* Administration */}
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/:section" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/integrations" element={<ProtectedRoute><NotImplementedPage title="Intégrations" /></ProtectedRoute>} />
              <Route path="/settings/printers" element={<ProtectedRoute><PrintersTable /></ProtectedRoute>} />
              <Route path="/settings/production-profiles" element={<ProtectedRoute><ProductionProfilesTable /></ProtectedRoute>} />
              {/* Mes droits — diagnostic page, no gate: every authenticated user sees their own rights */}
              <Route path="/settings/my-permissions" element={<ProtectedRoute><MyPermissionsPage /></ProtectedRoute>} />

              {/* Dashboard Sub-pages */}
              <Route path="/dashboard/analysis" element={<ProtectedRoute accessCheck={(authData) => checkPermission(authData, 'pos.analytics')}><DashboardAnalysis /></ProtectedRoute>} />
              <Route path="/dashboard/order-history" element={<ProtectedRoute><DashboardOrderHistory /></ProtectedRoute>} />
              
              {/* Équipe */}
              <Route path="/equipe" element={<Navigate to="/equipe/equipiers" replace />} />
              <Route path="/equipe/equipiers" element={<ProtectedRoute><EquipePage /></ProtectedRoute>} />
              <Route path="/equipe/planning" element={<ProtectedRoute requiredModule="planning"><PlanningPage /></ProtectedRoute>} />
              <Route path="/equipe/mon-planning" element={<ProtectedRoute requiredModule="planning"><MyPlanningPage /></ProtectedRoute>} />
              <Route path="/equipe/pointages" element={<ProtectedRoute><Pointages /></ProtectedRoute>} />
              <Route path="/equipe/conges-echanges" element={<ProtectedRoute><CongesEchanges /></ProtectedRoute>} />
              <Route path="/equipe/parametres" element={<ProtectedRoute><EquipeSettings /></ProtectedRoute>} />
              <Route path="/equipe/roles" element={<ProtectedRoute><RolesPage /></ProtectedRoute>} />

              {/* Integrations */}
              <Route path="/integrations" element={<ProtectedRoute accessCheck={(authData) => checkPermission(authData, 'platforms.manage')}><IntegrationsOverview /></ProtectedRoute>} />
              <Route path="/integrations/overview" element={<ProtectedRoute accessCheck={(authData) => checkPermission(authData, 'platforms.manage')}><IntegrationsOverview /></ProtectedRoute>} />
              <Route path="/integrations/scannorder" element={<ProtectedRoute requiredModule="scannorder" accessCheck={(authData) => checkPermission(authData, 'platforms.manage')}><ScanNOrder /></ProtectedRoute>} />
              <Route path="/integrations/uber-eats" element={<ProtectedRoute accessCheck={(authData) => checkPermission(authData, 'platforms.manage')}><UberEats /></ProtectedRoute>} />
              <Route path="/integrations/deliveroo" element={<ProtectedRoute accessCheck={(authData) => checkPermission(authData, 'platforms.manage')}><Deliveroo /></ProtectedRoute>} />
              
              {/* HACCP - Hygiene & Safety */}
              <Route path="/haccp/activity" element={<ProtectedRoute requiredModule="haccp"><HacCPActivity /></ProtectedRoute>} />
              <Route path="/haccp/history" element={<ProtectedRoute requiredModule="haccp"><Navigate to="/haccp/activity" replace /></ProtectedRoute>} />
              <Route path="/haccp/settings" element={<ProtectedRoute requiredModule="haccp"><HacCPSettings /></ProtectedRoute>} />
              
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
