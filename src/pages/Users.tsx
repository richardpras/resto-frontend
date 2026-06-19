import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UsersList from "./users/UsersList";
import RolesList from "./users/RolesList";
import AuditLog from "./users/AuditLog";

export default function Users() {
  const { t } = useTranslation("common");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("usersManagement.pageTitle")}</h1>
        <p className="text-muted-foreground text-sm">{t("usersManagement.pageSubtitle")}</p>
      </div>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">{t("usersManagement.tabs.users")}</TabsTrigger>
          <TabsTrigger value="roles">{t("usersManagement.tabs.roles")}</TabsTrigger>
          <TabsTrigger value="audit">{t("usersManagement.tabs.audit")}</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4"><UsersList /></TabsContent>
        <TabsContent value="roles" className="mt-4"><RolesList /></TabsContent>
        <TabsContent value="audit" className="mt-4"><AuditLog /></TabsContent>
      </Tabs>
    </div>
  );
}
