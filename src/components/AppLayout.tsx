import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Wifi, WifiOff, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LockScreen } from "@/components/auth/LockScreen";
import { IdleTracker } from "@/components/auth/ProtectedRoute";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const notifications = [
  { id: 1, title: "Low stock: Chicken", body: "Below minimum threshold", time: "5m" },
  { id: 2, title: "New QR order", body: "Table 7 placed an order", time: "12m" },
  { id: 3, title: "Payment received", body: "Order #ORD-147 paid via QRIS", time: "20m" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [online] = useState(true);
  const { user, locked, lock } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (user && !user.pinSet && locked) {
      useAuthStore.setState({ locked: false });
    }
  }, [user, user?.pinSet, locked]);

  // No chrome on login page
  if (location.pathname === "/login" || location.pathname.startsWith("/qr-order")) {
    return <>{children}</>;
  }

  if (!user) return <>{children}</>;

  return (
    <SidebarProvider>
      <IdleTracker />
      {locked && user?.pinSet ? <LockScreen /> : null}
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card/50 backdrop-blur-sm px-4 sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-3">
              {online ? (
                <div className="flex items-center gap-1.5 text-success text-xs font-medium">
                  <Wifi className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-warning text-xs font-medium animate-pulse-soft">
                  <WifiOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Offline</span>
                </div>
              )}
              {user.pinSet ? (
                <button type="button" onClick={() => lock()} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Lock screen">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.map((n) => (
                    <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2.5">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-medium">{n.title}</span>
                        <span className="text-[11px] text-muted-foreground">{n.time}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{n.body}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
