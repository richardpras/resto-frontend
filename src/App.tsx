import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import { PromotionsRouteElement } from "@/components/promotions/PromotionsRouteElement";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { RoutePageSkeleton } from "@/components/skeletons/route/RoutePageSkeleton";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { EmployeeLayout } from "./components/employee/EmployeeLayout";
import { EmployeeProtectedRoute } from "./components/employee/EmployeeProtectedRoute";
import { PERMISSIONS } from "@/stores/authStore";
import { canAccessPayrollModule, canViewEmployees } from "@/domain/permissionGates";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const MenuIntelligenceDashboard = lazy(() => import("./pages/dashboard/MenuIntelligenceDashboard"));
const POS = lazy(() => import("./pages/POS"));
const Kitchen = lazy(() => import("./pages/Kitchen"));
const MenuManagement = lazy(() => import("./pages/MenuManagement"));
const MenuCostDashboard = lazy(() => import("./pages/menu/costing/MenuCostDashboard"));
const MenuCostList = lazy(() => import("./pages/menu/costing/MenuCostList"));
const MenuCostDetail = lazy(() => import("./pages/menu/costing/MenuCostDetail"));
const RecipeCostComparison = lazy(() => import("./pages/menu/costing/RecipeCostComparison"));
const Inventory = lazy(() => import("./pages/Inventory"));
const QROrder = lazy(() => import("./pages/QROrder"));
const QrOrderDetail = lazy(() => import("./pages/QrOrderDetail"));
const QROrdersList = lazy(() => import("./pages/QROrdersList"));
const Tables = lazy(() => import("./pages/Tables"));
const Reservations = lazy(() => import("./pages/Reservations"));
const ReservationDashboard = lazy(() => import("./pages/ReservationDashboard"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Promotions = lazy(() => import("./pages/Promotions"));
const Payroll = lazy(() => import("./pages/Payroll"));
const Cashier = lazy(() => import("./pages/Cashier"));
const OrdersExplorer = lazy(() => import("./pages/OrdersExplorer"));
const Users = lazy(() => import("./pages/Users"));
const Employees = lazy(() => import("./pages/Employees"));
const Departments = lazy(() => import("./pages/Departments"));
const Positions = lazy(() => import("./pages/Positions"));
const Accounting = lazy(() => import("./pages/Accounting"));
const Settings = lazy(() => import("./pages/Settings"));
const PaymentHealth = lazy(() => import("./pages/settings/PaymentHealth"));
const ProductionStationsSettings = lazy(() => import("./pages/settings/ProductionStationsSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Customers = lazy(() => import("./pages/Customers"));
const CustomerProfile = lazy(() => import("./pages/CustomerProfile"));
const LoyaltyDashboard = lazy(() => import("./pages/LoyaltyDashboard"));
const PaymentStatus = lazy(() => import("./pages/PaymentStatus"));
const ReportsHub = lazy(() => import("./pages/ReportsHub"));
const ExecutiveSalesReport = lazy(() => import("./pages/ExecutiveSalesReport"));
const ExecutiveDashboard = lazy(() => import("./pages/ExecutiveDashboard"));
const GiftCards = lazy(() => import("./pages/GiftCards"));
const ShiftClose = lazy(() => import("./pages/ShiftClose"));
const Login = lazy(() => import("./pages/Login"));
const EmployeeLogin = lazy(() => import("./pages/employee/Login"));
const EmployeeDashboard = lazy(() => import("./pages/employee/Dashboard"));
const EmployeeProfile = lazy(() => import("./pages/employee/Profile"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Members = lazy(() => import("./pages/Members"));
const LoyaltyPrograms = lazy(() => import("./pages/LoyaltyPrograms"));
const NotificationCenter = lazy(() => import("./pages/NotificationCenter"));
const FailedJobsDashboard = lazy(() => import("./pages/system/FailedJobsDashboard"));
const AuditCenterPage = lazy(() => import("./pages/system/AuditCenterPage"));
const BugReportsPage = lazy(() => import("./pages/system/BugReportsPage"));
const SystemHealthCenterPage = lazy(() => import("./pages/system/SystemHealthCenterPage"));

const queryClient = new QueryClient();

const routeFallback = <RoutePageSkeleton />;

const guarded = (perm: string | undefined, el: React.ReactElement) => (
  <ProtectedRoute permission={perm}>
    <Suspense fallback={routeFallback}>{el}</Suspense>
  </ProtectedRoute>
);

const payrollGuarded = (el: React.ReactElement) => (
  <ProtectedRoute accessCheck={(user) => canAccessPayrollModule(user)}>
    <Suspense fallback={routeFallback}>{el}</Suspense>
  </ProtectedRoute>
);

const employeesGuarded = (el: React.ReactElement) => (
  <ProtectedRoute accessCheck={(user) => canViewEmployees(user)}>
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
          <Route
            path="/employee/login"
            element={
              <Suspense fallback={routeFallback}>
                <EmployeeLogin />
              </Suspense>
            }
          />
          <Route
            path="/employee"
            element={
              <EmployeeProtectedRoute>
                <EmployeeLayout />
              </EmployeeProtectedRoute>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={routeFallback}>
                  <EmployeeDashboard />
                </Suspense>
              }
            />
            <Route
              path="profile"
              element={
                <Suspense fallback={routeFallback}>
                  <EmployeeProfile />
                </Suspense>
              }
            />
          </Route>
          {/* Guest QR menu: full viewport, no sidebar (not a bug). Staff list: /qr-orders inside shell. */}
          <Route
            path="/qr-order"
            element={
              <Suspense fallback={routeFallback}>
                <QROrder />
              </Suspense>
            }
          />
          <Route
            path="/qr/:qrPublicId"
            element={
              <Suspense fallback={routeFallback}>
                <QROrder />
              </Suspense>
            }
          />
          <Route
            path="/qr/order/:orderCode"
            element={
              <Suspense fallback={routeFallback}>
                <QrOrderDetail />
              </Suspense>
            }
          />
          <Route
            path="/payment-status"
            element={
              <Suspense fallback={routeFallback}>
                <PaymentStatus />
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
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Suspense fallback={routeFallback}>
                    <NotificationCenter />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/menu"
              element={guarded(PERMISSIONS.MENU_DASHBOARD, <MenuIntelligenceDashboard />)}
            />
            <Route path="/pos" element={guarded(PERMISSIONS.POS, <POS />)} />
            <Route path="/kitchen" element={guarded(PERMISSIONS.KITCHEN, <Kitchen />)} />
            <Route path="/qr-orders" element={guarded(PERMISSIONS.QR_ORDERS, <QROrdersList />)} />
            <Route path="/cashier" element={guarded(PERMISSIONS.POS, <Cashier />)} />
            <Route path="/shift-close" element={guarded(PERMISSIONS.FINANCE_SHIFT_CLOSE, <ShiftClose />)} />
            <Route path="/orders" element={guarded(PERMISSIONS.POS, <OrdersExplorer />)} />
            <Route path="/tables" element={guarded(PERMISSIONS.TABLES, <Tables />)} />
            <Route path="/reservations" element={guarded(PERMISSIONS.POS, <Reservations />)} />
            <Route
              path="/reservations/operations"
              element={guarded(PERMISSIONS.POS, <ReservationDashboard />)}
            />
            <Route path="/menu" element={guarded(PERMISSIONS.MENU, <MenuManagement />)} />
            <Route path="/menu/costing" element={guarded(PERMISSIONS.COST_VIEW, <MenuCostDashboard />)} />
            <Route path="/menu/costing/items" element={guarded(PERMISSIONS.COST_VIEW, <MenuCostList />)} />
            <Route path="/menu/costing/items/:id" element={guarded(PERMISSIONS.COST_VIEW, <MenuCostDetail />)} />
            <Route path="/menu/costing/comparison" element={guarded(PERMISSIONS.COST_VIEW, <RecipeCostComparison />)} />
            <Route path="/inventory" element={guarded(PERMISSIONS.INVENTORY, <Inventory />)} />
            <Route path="/suppliers" element={guarded(PERMISSIONS.SUPPLIERS, <Suppliers />)} />
            <Route path="/members" element={guarded(PERMISSIONS.MEMBERS, <Members />)} />
            <Route path="/customers" element={guarded(PERMISSIONS.CUSTOMERS, <Customers />)} />
            <Route path="/customers/:customerId" element={guarded(PERMISSIONS.CUSTOMERS, <CustomerProfile />)} />
            <Route path="/loyalty-dashboard" element={guarded(PERMISSIONS.LOYALTY_DASHBOARD, <LoyaltyDashboard />)} />
            <Route path="/loyalty-programs" element={guarded(PERMISSIONS.MEMBERS, <LoyaltyPrograms />)} />
            <Route path="/gift-cards" element={guarded(PERMISSIONS.GIFT_CARDS, <GiftCards />)} />
            <Route path="/purchases" element={guarded(PERMISSIONS.PURCHASE, <Purchases />)} />
            <Route
              path="/promotions"
              element={
                <PromotionsRouteElement>
                  {guarded(PERMISSIONS.PROMOTIONS, <Promotions />)}
                </PromotionsRouteElement>
              }
            />
            <Route path="/payroll" element={payrollGuarded(<Payroll />)} />
            <Route path="/users" element={guarded(PERMISSIONS.USERS, <Users />)} />
            <Route path="/employees" element={employeesGuarded(<Employees />)} />
            <Route path="/departments" element={guarded(PERMISSIONS.USERS, <Departments />)} />
            <Route path="/positions" element={guarded(PERMISSIONS.USERS, <Positions />)} />
            <Route path="/accounting" element={guarded(PERMISSIONS.ACCOUNTING, <Accounting />)} />
            <Route path="/reports" element={guarded(PERMISSIONS.REPORTS, <ReportsHub />)} />
            <Route path="/executive-dashboard" element={guarded(PERMISSIONS.REPORTS, <ExecutiveDashboard />)} />
            <Route path="/reports/executive-sales" element={guarded(PERMISSIONS.REPORTS, <ExecutiveSalesReport />)} />
            <Route path="/settings" element={guarded(PERMISSIONS.SETTINGS, <Settings />)} />
            <Route path="/settings/payments/health" element={guarded(PERMISSIONS.SETTINGS, <PaymentHealth />)} />
            <Route path="/settings/production-stations" element={guarded(PERMISSIONS.SETTINGS, <ProductionStationsSettings />)} />
            <Route path="/system/failed-jobs" element={guarded(PERMISSIONS.SETTINGS, <FailedJobsDashboard />)} />
            <Route path="/system/audit" element={guarded(PERMISSIONS.SETTINGS, <AuditCenterPage />)} />
            <Route path="/system/health" element={guarded(PERMISSIONS.SETTINGS, <SystemHealthCenterPage />)} />
            <Route path="/system/bug-reports" element={guarded(PERMISSIONS.SETTINGS, <BugReportsPage />)} />
            <Route path="/system/bug-reports/:id" element={guarded(PERMISSIONS.SETTINGS, <BugReportsPage />)} />
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
