import { Link, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEmployeeAuthStore } from "@/stores/employeeAuthStore";
import { LayoutDashboard, LogOut, User } from "lucide-react";

export function EmployeeLayout() {
  const navigate = useNavigate();
  const { me, logout } = useEmployeeAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate("/employee/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Employee Portal</p>
            <p className="font-semibold">{me?.employee?.fullName ?? "Employee"}</p>
          </div>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/employee">
                <LayoutDashboard className="h-4 w-4 mr-1" />
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/employee/profile">
                <User className="h-4 w-4 mr-1" />
                Profile
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
