import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [online] = useState(true);

  return (
    <SidebarProvider>
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
              <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
                <Bell className="h-4.5 w-4.5 text-muted-foreground" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
