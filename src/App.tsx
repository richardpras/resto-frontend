import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Kitchen from "./pages/Kitchen";
import MenuManagement from "./pages/MenuManagement";
import Inventory from "./pages/Inventory";
import QROrder from "./pages/QROrder";
import QROrdersList from "./pages/QROrdersList";
import Tables from "./pages/Tables";
import Purchases from "./pages/Purchases";
import Promotions from "./pages/Promotions";
import Cashier from "./pages/Cashier";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/cashier" element={<Cashier />} />
            <Route path="/kitchen" element={<Kitchen />} />
            <Route path="/qr-order" element={<QROrder />} />
            <Route path="/qr-orders" element={<QROrdersList />} />
            <Route path="/tables" element={<Tables />} />
            <Route path="/menu" element={<MenuManagement />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/payroll" element={<PlaceholderPage title="Payroll" description="Employee list, salary structure, and payroll summaries." />} />
            <Route path="/reports" element={<PlaceholderPage title="Reports" description="Sales, purchases, P&L, and employee performance reports." />} />
            <Route path="/settings" element={<PlaceholderPage title="Settings" description="Merchant, outlets, tax, printer mapping, roles & permissions." />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
