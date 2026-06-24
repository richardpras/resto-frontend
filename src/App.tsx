import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { RoutePageSkeleton } from "@/components/skeletons/route/RoutePageSkeleton";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { EmployeeLayout } from "./components/employee/EmployeeLayout";
import { EmployeeProtectedRoute } from "./components/employee/EmployeeProtectedRoute";
import { LocaleSync } from "@/hooks/useLocaleSync";
import { PwaRouteController } from "@/pwa/useStaffPwa";
import { PublicGuestStandaloneGuard } from "@/components/pwa/PublicGuestStandaloneGuard";
import { PERMISSIONS } from "@/stores/authStore";
import { canAccessPayrollModule, canViewEmployees } from "@/domain/permissionGates";
import type { HrBootstrapKey } from "@/hooks/useHrPayrollBootstrap";
import { LegacyPayrollRedirect } from "./pages/hr/LegacyPayrollRedirect";
import { wrapHrPage } from "./pages/hr/wrapHrPage";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const MenuIntelligenceDashboard = lazy(() => import("./pages/dashboard/MenuIntelligenceDashboard"));
const POS = lazy(() => import("./pages/POS"));
const Kitchen = lazy(() => import("./pages/Kitchen"));
const MenuManagement = lazy(() => import("./pages/MenuManagement"));
const MenuCostDashboard = lazy(() => import("./pages/menu/costing/MenuCostDashboard"));
const MenuCostList = lazy(() => import("./pages/menu/costing/MenuCostList"));
const MenuCostDetail = lazy(() => import("./pages/menu/costing/MenuCostDetail"));
const RecipeCostComparison = lazy(() => import("./pages/menu/costing/RecipeCostComparison"));
const MenuCategoriesPage = lazy(() => import("./pages/menu/MenuCategoriesPage"));
const Inventory = lazy(() => import("./pages/Inventory"));
const QROrder = lazy(() => import("./pages/QROrder"));
const QrOrderDetail = lazy(() => import("./pages/QrOrderDetail"));
const QROrdersList = lazy(() => import("./pages/QROrdersList"));
const Tables = lazy(() => import("./pages/Tables"));
const Reservations = lazy(() => import("./pages/Reservations"));
const ReservationDashboard = lazy(() => import("./pages/ReservationDashboard"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Cashier = lazy(() => import("./pages/Cashier"));
const HrShifts = lazy(() => import("./pages/payroll/Shifts"));
const HrScheduling = lazy(() => import("./pages/payroll/Scheduling"));
const HrShiftAssignments = lazy(() => import("./pages/payroll/ShiftAssignments"));
const HrAttendance = lazy(() => import("./pages/payroll/Attendance"));
const HrAttendanceReview = lazy(() => import("./pages/payroll/AttendanceReview"));
const HrLeave = lazy(() => import("./pages/payroll/Leave"));
const HrOvertime = lazy(() => import("./pages/payroll/Overtime"));
const HrPreparation = lazy(() => import("./pages/payroll/Preparation"));
const HrEngine = lazy(() => import("./pages/payroll/Engine"));
const HrAdjustments = lazy(() => import("./pages/payroll/Adjustments"));
const HrPayslips = lazy(() => import("./pages/payroll/Payslips"));
const HrBpjs = lazy(() => import("./pages/payroll/Bpjs"));
const HrTax = lazy(() => import("./pages/payroll/Tax"));
const HrReimbursements = lazy(() => import("./pages/payroll/Reimbursements"));
const HrLoans = lazy(() => import("./pages/payroll/Loans"));
const HrCashAdvances = lazy(() => import("./pages/payroll/CashAdvances"));
const HrClosing = lazy(() => import("./pages/payroll/Closing"));
const HrPosting = lazy(() => import("./pages/payroll/Posting"));
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
const Members = lazy(() => import("./pages/Members"));
const MemberProfilePage = lazy(() => import("./pages/MemberProfilePage"));
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

const hrPayrollPage = (el: React.ReactElement, bootstrapKeys?: HrBootstrapKey[]) =>
  payrollGuarded(wrapHrPage(el, bootstrapKeys));

const hrMasterPage = (el: React.ReactElement) => wrapHrPage(el);
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
        <LocaleSync />
        <PwaRouteController />
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
                <PublicGuestStandaloneGuard>
                  <QROrder />
                </PublicGuestStandaloneGuard>
              </Suspense>
            }
          />
          <Route
            path="/qr/:qrPublicId"
            element={
              <Suspense fallback={routeFallback}>
                <PublicGuestStandaloneGuard>
                  <QROrder />
                </PublicGuestStandaloneGuard>
              </Suspense>
            }
          />
          <Route
            path="/qr/order/:orderCode"
            element={
              <Suspense fallback={routeFallback}>
                <PublicGuestStandaloneGuard>
                  <QrOrderDetail />
                </PublicGuestStandaloneGuard>
              </Suspense>
            }
          />
          <Route
            path="/payment-status"
            element={
              <Suspense fallback={routeFallback}>
                <PublicGuestStandaloneGuard>
                  <PaymentStatus />
                </PublicGuestStandaloneGuard>
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
            <Route path="/menu/categories" element={guarded(PERMISSIONS.MENU, <MenuCategoriesPage />)} />
            <Route path="/menu/costing" element={guarded(PERMISSIONS.COST_VIEW, <MenuCostDashboard />)} />
            <Route path="/menu/costing/items" element={guarded(PERMISSIONS.COST_VIEW, <MenuCostList />)} />
            <Route path="/menu/costing/items/:id" element={guarded(PERMISSIONS.COST_VIEW, <MenuCostDetail />)} />
            <Route path="/menu/costing/comparison" element={guarded(PERMISSIONS.COST_VIEW, <RecipeCostComparison />)} />
            <Route path="/inventory" element={guarded(PERMISSIONS.INVENTORY, <Inventory />)} />
            <Route path="/suppliers" element={guarded(PERMISSIONS.SUPPLIERS, <Suppliers />)} />
            <Route path="/members" element={guarded(PERMISSIONS.MEMBERS, <Members />)} />
            <Route path="/members/:memberId" element={guarded(PERMISSIONS.MEMBERS, <MemberProfilePage />)} />
            <Route path="/customers" element={guarded(PERMISSIONS.CUSTOMERS, <Customers />)} />
            <Route path="/customers/:customerId" element={guarded(PERMISSIONS.CUSTOMERS, <CustomerProfile />)} />
            <Route path="/loyalty-dashboard" element={guarded(PERMISSIONS.LOYALTY_DASHBOARD, <LoyaltyDashboard />)} />
            <Route path="/loyalty-programs" element={guarded(PERMISSIONS.MEMBERS, <LoyaltyPrograms />)} />
            <Route path="/gift-cards" element={guarded(PERMISSIONS.GIFT_CARDS, <GiftCards />)} />
            <Route path="/purchases" element={guarded(PERMISSIONS.PURCHASE, <Purchases />)} />
            <Route path="/payroll" element={<LegacyPayrollRedirect />} />
            <Route path="/users" element={guarded(PERMISSIONS.USERS, <Users />)} />
            <Route path="/employees" element={<Navigate to="/hr/employees" replace />} />
            <Route path="/departments" element={<Navigate to="/hr/departments" replace />} />
            <Route path="/positions" element={<Navigate to="/hr/positions" replace />} />
            <Route path="/hr/employees" element={employeesGuarded(hrMasterPage(<Employees />))} />
            <Route path="/hr/departments" element={guarded(PERMISSIONS.USERS, hrMasterPage(<Departments />))} />
            <Route path="/hr/positions" element={guarded(PERMISSIONS.USERS, hrMasterPage(<Positions />))} />
            <Route path="/hr/shifts" element={hrPayrollPage(<HrShifts />, ["shifts"])} />
            <Route path="/hr/scheduling" element={hrPayrollPage(<HrScheduling />)} />
            <Route path="/hr/shift-assignments" element={hrPayrollPage(<HrShiftAssignments />)} />
            <Route path="/hr/attendance" element={hrPayrollPage(<HrAttendance />)} />
            <Route path="/hr/attendance-review" element={hrPayrollPage(<HrAttendanceReview />)} />
            <Route path="/hr/leave" element={hrPayrollPage(<HrLeave />)} />
            <Route path="/hr/overtime" element={hrPayrollPage(<HrOvertime />)} />
            <Route path="/hr/payroll" element={payrollGuarded(<Navigate to="/hr/payroll/engine" replace />)} />
            <Route path="/hr/payroll/preparation" element={hrPayrollPage(<HrPreparation />)} />
            <Route path="/hr/payroll/engine" element={hrPayrollPage(<HrEngine />)} />
            <Route path="/hr/payroll/adjustments" element={hrPayrollPage(<HrAdjustments />)} />
            <Route path="/hr/payroll/payslips" element={hrPayrollPage(<HrPayslips />)} />
            <Route path="/hr/payroll/bpjs" element={hrPayrollPage(<HrBpjs />)} />
            <Route path="/hr/payroll/tax" element={hrPayrollPage(<HrTax />)} />
            <Route path="/hr/payroll/reimbursements" element={hrPayrollPage(<HrReimbursements />)} />
            <Route path="/hr/payroll/loans" element={hrPayrollPage(<HrLoans />)} />
            <Route path="/hr/payroll/cash-advances" element={hrPayrollPage(<HrCashAdvances />)} />
            <Route path="/hr/payroll/closing" element={hrPayrollPage(<HrClosing />)} />
            <Route path="/hr/payroll/posting" element={hrPayrollPage(<HrPosting />)} />
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
