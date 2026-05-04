import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
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
import Payroll from "./pages/Payroll";
import Cashier from "./pages/Cashier";
import Users from "./pages/Users";
import Accounting from "./pages/Accounting";
import Settings from "./pages/Settings";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";

const queryClient = new QueryClient();

function AppShell() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/kitchen" element={<Kitchen />} />
            <Route path="/qr-order" element={<QROrder />} />
            <Route path="/qr-orders" element={<QROrdersList />} />
            <Route path="/tables" element={<Tables />} />
            <Route path="/menu" element={<MenuManagement />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/cashier" element={<Cashier />} />
            <Route path="/users" element={<Users />} />
            <Route path="/accounting" element={<Accounting />} />
            <Route path="/reports" element={<PlaceholderPage title="Reports" description="Sales, purchases, P&L, and employee performance reports." />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
