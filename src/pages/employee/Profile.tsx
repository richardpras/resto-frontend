import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiHttpError } from "@/lib/api-integration/client";
import { type EssProfile } from "@/lib/api-integration/essEndpoints";
import { useEmployeeAuthStore } from "@/stores/employeeAuthStore";
import { toast } from "sonner";

export default function EmployeeProfile() {
  const fetchProfile = useEmployeeAuthStore((s) => s.fetchProfile);
  const [profile, setProfile] = useState<EssProfile | null>(null);

  useEffect(() => {
    void fetchProfile()
      .then(setProfile)
      .catch((e) => toast.error(e instanceof ApiHttpError ? e.message : "Failed to load profile"));
  }, [fetchProfile]);

  if (!profile) {
    return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">My Profile</h2>
        <p className="text-sm text-muted-foreground">Read-only employment information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{profile.employee.fullName}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <p>
            <span className="text-muted-foreground">Employee No:</span> {profile.employee.employeeNo}
          </p>
          {profile.employee.email && (
            <p>
              <span className="text-muted-foreground">Email:</span> {profile.employee.email}
            </p>
          )}
          {profile.employee.phone && (
            <p>
              <span className="text-muted-foreground">Phone:</span> {profile.employee.phone}
            </p>
          )}
          {profile.position && (
            <p>
              <span className="text-muted-foreground">Position:</span> {profile.position.name}
            </p>
          )}
          {profile.department && (
            <p>
              <span className="text-muted-foreground">Department:</span> {profile.department.name}
            </p>
          )}
          {profile.outlet && (
            <p>
              <span className="text-muted-foreground">Outlet:</span> {profile.outlet.name}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Status:</span>{" "}
            <Badge variant="secondary">{profile.employmentStatus.status}</Badge>
          </p>
          {profile.employmentStatus.hireDate && (
            <p>
              <span className="text-muted-foreground">Hire Date:</span> {profile.employmentStatus.hireDate}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
