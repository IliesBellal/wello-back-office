import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { MFAProvider } from "./contexts/MFAContext";
import { ProtectedRoute } from "./components/shared/ProtectedRoute";
import GlobalLoadingBar from "./components/GlobalLoadingBar";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import Menu from "./pages/Menu";
import CategoriesTable from './pages/CategoriesTable';
import TagsTable from './pages/TagsTable';
import Components from './pages/Components';
import FinancialReports from './pages/FinancialReports';
import Orders from './pages/Orders';
import Locations from './pages/Locations';
import Users from './pages/Users';
import CashRegisters from './pages/CashRegisters';
import Customers from './pages/Customers';
import Stocks from './pages/Stocks';
import PriceGrid from './pages/PriceGrid';
import AttributesPage from './pages/Attributes';
import PromotionsAvailabilities from './pages/PromotionsAvailabilities';
import DashboardAnalysis from './pages/DashboardAnalysis';
import DashboardOrderHistory from './pages/DashboardOrderHistory';
import NotImplementedPage from './pages/NotImplementedPage';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <MFAProvider>
        <AuthProvider>
          <GlobalLoadingBar />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              
              {/* Orders Management */}
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              
              {/* Menu Management */}
              <Route path="/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
              <Route path="/menu/categories" element={<ProtectedRoute><CategoriesTable /></ProtectedRoute>} />
              <Route path="/menu/tags" element={<ProtectedRoute><TagsTable /></ProtectedRoute>} />
              <Route path="/menu/components" element={<ProtectedRoute><Components /></ProtectedRoute>} />
              <Route path="/menu/price-grid" element={<ProtectedRoute><PriceGrid /></ProtectedRoute>} />
              <Route path="/menu/attributes" element={<ProtectedRoute><AttributesPage /></ProtectedRoute>} />
              <Route path="/menu/promotions" element={<ProtectedRoute><PromotionsAvailabilities /></ProtectedRoute>} />
              
              {/* Location & Service */}
              <Route path="/locations" element={<ProtectedRoute><Locations /></ProtectedRoute>} />
              <Route path="/cash-registers" element={<ProtectedRoute><CashRegisters /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
              
              {/* Stocks */}
              <Route path="/stocks" element={<ProtectedRoute><Stocks /></ProtectedRoute>} />
              
              {/* Reports & Analytics */}
              <Route path="/reports/financial" element={<ProtectedRoute><FinancialReports /></ProtectedRoute>} />
              <Route path="/reports/performance" element={<ProtectedRoute><NotImplementedPage title="Performance" /></ProtectedRoute>} />
              
              {/* Administration */}
              <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/:section" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/integrations" element={<ProtectedRoute><NotImplementedPage title="Intégrations" /></ProtectedRoute>} />
              
              {/* Dashboard Sub-pages */}
              <Route path="/dashboard/analysis" element={<ProtectedRoute><DashboardAnalysis /></ProtectedRoute>} />
              <Route path="/dashboard/order-history" element={<ProtectedRoute><DashboardOrderHistory /></ProtectedRoute>} />
              
              {/* 404 Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </MFAProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
