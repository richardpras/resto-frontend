import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { isDevelopmentEnvironment } from "@/domain/environment";
import { useAuthStore, DEMO_CREDENTIALS, isSessionRestoreReady } from "@/stores/authStore";
import { hasStaffAppAccess, resolvePostLoginPath } from "@/domain/permissionGates";
import { isNativePosShell } from "@/mobile/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { RestoHubMark } from "@/components/brand/RestoHubMark";
import { motion } from "framer-motion";

export default function Login() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/";
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const sessionRestoreStatus = useAuthStore((s) => s.sessionRestoreStatus);
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sessionReady = isSessionRestoreReady(accessToken, sessionRestoreStatus);

  if (accessToken && sessionRestoreStatus === "pending") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-sidebar">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("auth.restoringSession", { defaultValue: "Restoring session…" })}
        </div>
      </div>
    );
  }

  if (user && sessionReady && hasStaffAppAccess(user)) {
    const target = resolvePostLoginPath(user, from);
    if (target !== "/login") {
      return <Navigate to={target} replace />;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError("");
    setIsLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (!res.ok) setError(res.error ?? t("auth.loginFailed"));
      else {
        const nextUser = useAuthStore.getState().user;
        if (!nextUser || !hasStaffAppAccess(nextUser)) {
          setError(t("auth.noModuleAccess", { defaultValue: "Your account has no module access. Contact an administrator." }));
          useAuthStore.getState().logout();
          return;
        }
        navigate(resolvePostLoginPath(nextUser, isNativePosShell() ? "/pos" : from), { replace: true });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const quickFill = (em: string, pw: string) => { setEmail(em); setPassword(pw); };

  return (
    <div className="min-h-screen w-full flex bg-sidebar">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-sidebar" />
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar-primary/25 via-sidebar to-sidebar-accent/70" />
        {/* Soft edge vignette — top / bottom / left / right */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/40" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/25" />
        {/* Blurred light blobs on all sides */}
        <div className="pointer-events-none absolute -left-28 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-sidebar-primary/25 blur-[100px]" />
        <div className="pointer-events-none absolute -right-24 top-1/3 h-[22rem] w-[22rem] rounded-full bg-sidebar-primary/20 blur-[90px]" />
        <div className="pointer-events-none absolute left-1/4 -top-32 h-72 w-72 rounded-full bg-sidebar-primary/18 blur-[80px]" />
        <div className="pointer-events-none absolute bottom-[-6rem] right-1/4 h-80 w-80 rounded-full bg-sidebar-primary/15 blur-[90px]" />
        <div className="relative max-w-md">
          <div className="flex items-center gap-3.5 mb-10">
            <div className="h-12 w-12 rounded-2xl bg-white shadow-md shadow-black/15 ring-1 ring-white/30 flex items-center justify-center">
              <RestoHubMark className="h-8 w-8" title={t("auth.brandName")} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">{t("auth.brandName")}</h1>
              <p className="text-sm font-medium text-sidebar-primary">{t("auth.brandTagline")}</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4 text-white">{t("auth.headline")}</h2>
          <p className="text-base leading-relaxed text-sidebar-foreground/90">{t("auth.description")}</p>
        </div>
      </div>

      {/* Form panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-[480px] bg-card flex flex-col justify-center p-8 md:p-12 relative"
      >
        <div className="absolute top-6 right-6 md:top-8 md:right-8">
          <LanguageSwitcher variant="login" />
        </div>

        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-primary/8 ring-1 ring-primary/10 flex items-center justify-center">
            <RestoHubMark className="h-6 w-6" title={t("auth.brandName")} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">{t("auth.brandName")}</h1>
            <p className="text-xs text-muted-foreground">{t("auth.brandTagline")}</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-1">{t("auth.welcomeBack")}</h2>
        <p className="text-sm text-muted-foreground mb-8">{t("auth.signInSubtitle")}</p>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" aria-busy={isLoading}>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")} className="h-11 rounded-xl"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <div className="relative">
              <Input
                id="password" type={showPwd ? "text" : "password"} autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" className="h-11 rounded-xl pr-10"
                disabled={isLoading}
              />
              <button
                type="button" onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
                aria-label={showPwd ? t("auth.hidePassword") : t("auth.showPassword")}
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

          <Button type="submit" className="w-full h-11 rounded-xl text-base" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t("auth.signingIn")}
              </>
            ) : (
              t("auth.signIn")
            )}
          </Button>
        </form>

        {isDevelopmentEnvironment() ? (
          <div className="mt-8 pt-6 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">{t("auth.demoAccounts")}</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_CREDENTIALS.map((c) => (
                <button
                  key={c.email}
                  type="button"
                  onClick={() => quickFill(c.email, c.password)}
                  disabled={isLoading}
                  className="text-left p-2.5 rounded-xl border border-border/60 hover:border-primary hover:bg-muted/40 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <p className="text-xs font-semibold text-foreground">{c.role}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
