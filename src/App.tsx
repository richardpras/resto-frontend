import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { RoutePageSkeleton } from "@/components/skeletons/route/RoutePageSkeleton";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PERMISSIONS } from "@/stores/authStore";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const POS = lazy(() => import("./pages/POS"));
const Kitchen = lazy(() => import("./pages/Kitchen"));
const MenuManagement = lazy(() => import("./pages/MenuManagement"));
const Inventory = lazy(() => import("./pages/Inventory"));
const QROrder = lazy(() => import("./pages/QROrder"));
const QROrdersList = lazy(() => import("./pages/QROrdersList"));
const Tables = lazy(() => import("./pages/Tables"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Promotions = lazy(() => import("./pages/Promotions"));
const Payroll = lazy(() => import("./pages/Payroll"));
const Cashier = lazy(() => import("./pages/Cashier"));
const Users = lazy(() => import("./pages/Users"));
const Accounting = lazy(() => import("./pages/Accounting"));
const Settings = lazy(() => import("./pages/Settings"));
const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Members = lazy(() => import("./pages/Members"));

const queryClient = new QueryClient();

const routeFallback = <RoutePageSkeleton />;

const guarded = (perm: string | undefined, el: React.ReactElement) => (
  <ProtectedRoute permission={perm}>
    <Suspense fallback={routeFallback}>{el}</Suspense>
  </ProtectedRoute>
);

function AppShell() {
  return (
    <AppLayout>
      <Suspense fallback={routeFallback}>
        <Outlet />
      </Suspense>
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
          <Route
            path="/login"
            element={
              <Suspense fallback={routeFallback}>
                <Login />
              </Suspense>
            }
          />
          {/* Guest QR menu: full viewport, no sidebar (not a bug). Staff list: /qr-orders inside shell. */}
          <Route
            path="/qr-order"
            element={
              <Suspense fallback={routeFallback}>
                <QROrder />
              </Suspense>
            }
          />
          <Route element={<AppShell />}>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Suspense fallback={routeFallback}>
                    <Dashboard />
                  </Suspense>
                </ProtectedRoute>
              }
            />
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
            <Route
              path="/reports"
              element={guarded(
                PERMISSIONS.REPORTS,
                <PlaceholderPage title="Reports" description="Sales, purchases, P&L, and employee performance reports." />,
              )}
            />
            <Route path="/settings" element={guarded(PERMISSIONS.SETTINGS, <Settings />)} />
            <Route
              path="*"
              element={
                <Suspense fallback={routeFallback}>
                  <NotFound />
                </Suspense>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
