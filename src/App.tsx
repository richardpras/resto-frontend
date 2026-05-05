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
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PERMISSIONS } from "@/stores/authStore";
import Suppliers from "./pages/Suppliers";
import Members from "./pages/Members";

const queryClient = new QueryClient();
const guarded = (perm: string | undefined, el: React.ReactNode) =>
  <ProtectedRoute permission={perm}>{el}</ProtectedRoute>

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
          {/* Guest QR menu: full viewport, no sidebar (not a bug). Staff list: /qr-orders inside shell. */}
          <Route path="/qr-order" element={<QROrder />} />
          <Route element={<AppShell />}>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/pos" element={guarded(PERMISSIONS.POS, <POS />)} />
            <Route path="/kitchen" element={guarded(PERMISSIONS.KITCHEN, <Kitchen />)} />
            <Route path="/qr-orders" element={guarded(PERMISSIONS.QR_ORDERS, <QROrdersList />)} />
            <Route path="/cashier" element={guarded(PERMISSIONS.POS, <Cashier />)} />
            <Route path="/tables" element={guarded(PERMISSIONS.TABLES, <Tables />)} />
            <Route path="/menu" element={guarded(PERMISSIONS.MENU, <MenuManagement />)} />
            <Route path="/inventory" element={guarded(PERMISSIONS.INVENTORY, <Inventory />)} />
            <Route path="/suppliers" element={guarded(PERMISSIONS.SUPPLIERS, <Suppliers />)} />
            <Route path="/members" element={guarded(PERMISSIONS.MEMBERS, <Members />)} />
            <Route path="/purchases" element={guarded(PERMISSIONS.PURCHASE, <Purchases />)} />
            <Route path="/promotions" element={guarded(PERMISSIONS.PROMOTIONS, <Promotions />)} />
            <Route path="/payroll" element={guarded(PERMISSIONS.PAYROLL, <Payroll />)} />
            <Route path="/users" element={guarded(PERMISSIONS.USERS, <Users />)} />
            <Route path="/accounting" element={guarded(PERMISSIONS.ACCOUNTING, <Accounting />)} />
            <Route path="/reports" element={guarded(PERMISSIONS.REPORTS, <PlaceholderPage title="Reports" description="Sales, purchases, P&L, and employee performance reports." />)} />
            <Route path="/settings" element={guarded(PERMISSIONS.SETTINGS, <Settings />)} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
