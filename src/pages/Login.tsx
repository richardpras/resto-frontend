import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { login } from "@/lib/api-integration/userManagementEndpoints";
import { setApiAccessToken, ApiHttpError, API_BASE_URL, getApiAccessToken } from "@/lib/api-integration/client";
import { useUserStore } from "@/stores/userStore";
import { toast } from "sonner";
import { Store, Smartphone, Shield, ArrowRight, Loader2 } from "lucide-react";

function safeRedirectPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (getApiAccessToken()) {
      navigate(safeRedirectPath(searchParams.get("redirect")), { replace: true });
    }
  }, [navigate, searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      const res = await login(email.trim(), password);
      setApiAccessToken(res.data.accessToken);
      await useUserStore.getState().refreshSessionFromApi();
      toast.success("Signed in successfully");
      navigate(safeRedirectPath(searchParams.get("redirect")));
    } catch (err) {
      const msg = err instanceof ApiHttpError ? err.message : "Login failed";
      toast.error(msg);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Brand panel — matches AppSidebar (hsl sidebar tokens) */}
      <aside className="lg:w-[44%] min-h-[220px] lg:min-h-screen bg-sidebar text-sidebar-foreground flex flex-col justify-between p-8 lg:p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar-primary/15 via-transparent to-transparent pointer-events-none" aria-hidden />
        <div className="relative space-y-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-sidebar-primary/25 flex items-center justify-center shrink-0 ring-1 ring-sidebar-primary/30">
              <Store className="h-6 w-6 text-sidebar-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">RestoHub</h1>
              <p className="text-sm text-sidebar-foreground/60">Restaurant ERP + POS</p>
            </div>
          </div>
          <p className="text-sidebar-foreground/85 text-sm leading-relaxed max-w-sm">
            Sign in with your staff account. The same API powers this web app,{" "}
            <span className="text-sidebar-primary font-medium">Android</span>, and{" "}
            <span className="text-sidebar-primary font-medium">iOS</span> — use{" "}
            <span className="font-mono text-xs bg-sidebar-accent/50 px-1.5 py-0.5 rounded">Authorization: Bearer &lt;token&gt;</span>{" "}
            on every request after login.
          </p>
          <ul className="space-y-4 text-sm text-sidebar-foreground/75">
            <li className="flex gap-3">
              <Shield className="h-5 w-5 text-sidebar-primary shrink-0 mt-0.5" />
              <span>Laravel Passport access tokens (OAuth2-style) issued from this login endpoint.</span>
            </li>
            <li className="flex gap-3">
              <Smartphone className="h-5 w-5 text-sidebar-primary shrink-0 mt-0.5" />
              <span>Mobile apps: POST JSON to the same route; store <code className="text-xs bg-sidebar-accent/40 px-1 rounded">accessToken</code> and optional <code className="text-xs bg-sidebar-accent/40 px-1 rounded">expiresIn</code>.</span>
            </li>
          </ul>
        </div>
        <p className="relative text-[11px] text-sidebar-foreground/45 max-w-xs leading-relaxed">
          API base: <span className="font-mono break-all">{API_BASE_URL}</span>
        </p>
      </aside>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-muted/40 via-background to-accent/10">
        <Card className="w-full max-w-md rounded-2xl border-border/60 bg-card pos-shadow-md shadow-sm">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-2xl font-bold text-foreground">Welcome back</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your email and password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void submit(e)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  className="rounded-xl h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  className="rounded-xl h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={pending}
                />
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl gap-2" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Dev: set <span className="font-mono">VITE_API_ACCESS_TOKEN</span> in <span className="font-mono">web/.env</span> to skip this screen for API-only work.
            </p>
            <div className="mt-4 text-center">
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link to="/">Back to dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
