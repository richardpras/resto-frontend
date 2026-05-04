import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UsersList from "./users/UsersList";
import RolesList from "./users/RolesList";
import AuditLog from "./users/AuditLog";
import { useUserStore } from "@/stores/userStore";
import { ApiHttpError, getApiAccessToken, setApiAccessToken } from "@/lib/api-integration/client";
import { logout } from "@/lib/api-integration/userManagementEndpoints";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export default function Users() {
  const session = useUserStore((s) => s.session);
  useEffect(() => {
    const s = useUserStore.getState();
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          s.refreshSessionFromApi(),
          s.refreshUsersFromApi(),
          s.refreshRolesFromApi(),
          s.refreshPermissionsFromApi(),
        ]);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiHttpError) {
          if (e.status === 401) {
            useUserStore.getState().setSession(null);
            setApiAccessToken(undefined);
            toast.error("Not authenticated. Open /login or set VITE_API_ACCESS_TOKEN.");
          } else {
            toast.error(e.message);
          }
        } else {
          toast.error("Failed to load user management data.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = async () => {
    try {
      if (getApiAccessToken()) {
        await logout();
      }
    } catch {
      /* still clear local session */
    }
    useUserStore.getState().setSession(null);
    setApiAccessToken(undefined);
    toast.success("Signed out");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm">Manage users, roles, permissions and view audit log.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {session && (
            <div className="text-right text-xs text-muted-foreground max-w-md">
              <span className="font-medium text-foreground">{session.name}</span>
              <span className="mx-1">·</span>
              <span>{session.email}</span>
              <span className="block mt-1">
                {(session.roles ?? []).map((r) => (
                  <Badge key={r.id} variant="secondary" className="mr-1 text-[10px]">
                    {r.name}
                  </Badge>
                ))}
                <span className="text-muted-foreground">({session.permissionCodes?.length ?? 0} permissions)</span>
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/login?redirect=/users">Sign in</Link>
            </Button>
            <Button variant="secondary" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4"><UsersList /></TabsContent>
        <TabsContent value="roles" className="mt-4"><RolesList /></TabsContent>
        <TabsContent value="audit" className="mt-4"><AuditLog /></TabsContent>
      </Tabs>
    </div>
  );
}
