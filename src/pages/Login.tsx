import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { Store, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuthStore, DEMO_CREDENTIALS } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

export default function Login() {
  const { user, login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");

  if (user) return <Navigate to={from} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await login(email.trim(), password);
    if (!res.ok) setError(res.error ?? "Login failed");
    else navigate(from, { replace: true });
  };

  const quickFill = (em: string, pw: string) => { setEmail(em); setPassword(pw); };

  return (
    <div className="min-h-screen w-full flex bg-sidebar-background">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 text-sidebar-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-sidebar-primary/20" />
        <div className="relative max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-12 w-12 rounded-2xl bg-sidebar-primary/20 flex items-center justify-center">
              <Store className="h-6 w-6 text-sidebar-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">RestoHub</h1>
              <p className="text-xs text-sidebar-foreground/60">Restaurant ERP & POS</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">Run your entire restaurant from one place.</h2>
          <p className="text-sidebar-foreground/70 text-base">
            POS, inventory, kitchen, accounting and payroll — unified across all your outlets.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-[480px] bg-card flex flex-col justify-center p-8 md:p-12"
      >
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-lg font-bold">RestoHub</h1>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back</h2>
        <p className="text-sm text-muted-foreground mb-8">Sign in to access your dashboard.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@restaurant.com" className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password" type={showPwd ? "text" : "password"} autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" className="h-11 rounded-xl pr-10"
              />
              <button
                type="button" onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          <Button type="submit" className="w-full h-11 rounded-xl text-base">Sign in</Button>
        </form>

        <div className="mt-8 pt-6 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Demo accounts</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_CREDENTIALS.map((c) => (
              <button
                key={c.email} onClick={() => quickFill(c.email, c.password)}
                className="text-left p-2.5 rounded-xl border border-border/60 hover:border-primary hover:bg-muted/40 transition-colors"
              >
                <p className="text-xs font-semibold text-foreground">{c.role}</p>
                <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
