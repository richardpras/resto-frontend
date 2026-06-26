import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/stores/authStore";
import { canAccessUserManagement, canManageRolesAndPermissions } from "@/domain/permissionGates";
import UsersList from "./users/UsersList";
import RolesList from "./users/RolesList";
import AuditLog from "./users/AuditLog";

export default function Users() {
  const { t } = useTranslation("common");
  const authUser = useAuthStore((s) => s.user);
  const showUsersTab = canAccessUserManagement(authUser);
  const showRolesTab = canManageRolesAndPermissions(authUser);
  const showAuditTab = canAccessUserManagement(authUser);
  const defaultTab = showUsersTab ? "users" : showAuditTab ? "audit" : "roles";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("usersManagement.pageTitle")}</h1>
        <p className="text-muted-foreground text-sm">{t("usersManagement.pageSubtitle")}</p>
      </div>
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {showUsersTab ? (
            <TabsTrigger value="users">{t("usersManagement.tabs.users")}</TabsTrigger>
          ) : null}
          {showRolesTab ? (
            <TabsTrigger value="roles">{t("usersManagement.tabs.roles")}</TabsTrigger>
          ) : null}
          {showAuditTab ? (
            <TabsTrigger value="audit">{t("usersManagement.tabs.audit")}</TabsTrigger>
          ) : null}
        </TabsList>
        {showUsersTab ? (
          <TabsContent value="users" className="mt-4"><UsersList /></TabsContent>
        ) : null}
        {showRolesTab ? (
          <TabsContent value="roles" className="mt-4"><RolesList /></TabsContent>
        ) : null}
        {showAuditTab ? (
          <TabsContent value="audit" className="mt-4"><AuditLog /></TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
