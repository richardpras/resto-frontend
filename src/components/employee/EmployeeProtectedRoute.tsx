import { Navigate, useLocation } from "react-router-dom";
import { useEmployeeAuthStore } from "@/stores/employeeAuthStore";

export function EmployeeProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useEmployeeAuthStore((s) => s.accessToken);
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/employee/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
