import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UsersList from "./users/UsersList";
import RolesList from "./users/RolesList";
import AuditLog from "./users/AuditLog";

export default function Users() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground text-sm">Manage users, roles, permissions and view audit log.</p>
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
