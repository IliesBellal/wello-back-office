import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import Menu from "./pages/Menu";
import Components from './pages/Components';
import FinancialReports from './pages/FinancialReports';
import Orders from './pages/Orders';
import Locations from './pages/Locations';
import Users from './pages/Users';
import CashRegisters from './pages/CashRegisters';
import Customers from './pages/Customers';
import Stocks from './pages/Stocks';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Index />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/menu/components" element={<Components />} />
            <Route path="/reports/financial" element={<FinancialReports />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/users" element={<Users />} />
            <Route path="/cash-registers" element={<CashRegisters />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/stocks" element={<Stocks />} />
            <Route path="/settings/:section" element={<Settings />} />
            <Route path="/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
