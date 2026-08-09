import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Download, Minus, Plus, Search, Trash2, Upload, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGuestLocaleBootstrap } from "@/hooks/useGuestLocaleBootstrap";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import { cn } from "@/lib/utils";
import {
  createPublicReservation,
  createPublicReservationFromInvite,
  downloadPublicReservationPdf,
  estimateDepositAmount,
  fetchPublicReservationByCode,
  fetchPublicReservationContext,
  fetchPublicReservationInviteContext,
  fetchPublicReservationInviteMenu,
  fetchPublicReservationMenu,
  uploadPublicReservationDepositProof,
  type PublicReservationApi,
  type PublicReservationContextApi,
} from "@/lib/api-integration/publicReservationEndpoints";
import type { PublicMenuItemApi } from "@/lib/api-integration/publicMenuEndpoints";

type CartLine = { menuItemId: number; name: string; price: number; qty: number };
type Step = "form" | "proof" | "status";

function formatRp(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatInviteExpiry(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(locale === "id" ? "id-ID" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function itemCategory(item: PublicMenuItemApi): string {
  return (
    item.menuCategory?.displayName?.trim() ||
    item.menuCategory?.name?.trim() ||
    item.category?.trim() ||
    ""
  );
}

export default function PublicReservation() {
  const { t, i18n } = useOpsTranslation();
  const navigate = useNavigate();
  const { outletSlug, reservationCode: routeReservationCode, token: inviteTokenParam } = useParams<{
    outletSlug?: string;
    reservationCode?: string;
    token?: string;
  }>();
  useGuestLocaleBootstrap();

  const inviteToken = inviteTokenParam?.trim() ?? "";
  const isInviteMode = inviteToken.length > 0;
  const slug = outletSlug?.trim() ?? "";

  const [step, setStep] = useState<Step>(routeReservationCode ? "status" : "form");
  const [context, setContext] = useState<PublicReservationContextApi | null>(null);
  const [menuItems, setMenuItems] = useState<PublicMenuItemApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reservation, setReservation] = useState<PublicReservationApi | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [menuSearch, setMenuSearch] = useState("");
  const [menuCategory, setMenuCategory] = useState("all");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const statusSlug = context?.publicSlug?.trim() || slug;

  useEffect(() => {
    if (isInviteMode) {
      let active = true;
      setLoading(true);
      Promise.all([fetchPublicReservationInviteContext(inviteToken), fetchPublicReservationInviteMenu(inviteToken)])
        .then(([ctx, menu]) => {
          if (!active) return;
          setContext(ctx);
          setMenuItems(menu);
        })
        .catch((error: unknown) => {
          if (!active) return;
          toast.error(error instanceof Error ? error.message : t("publicReservation.loadFailed"));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }

    if (!slug) return;
    let active = true;
    const shouldBlockForContext = !routeReservationCode;
    if (shouldBlockForContext) setLoading(true);
    fetchPublicReservationContext(slug)
      .then(async (ctx) => {
        if (!active) return;
        setContext(ctx);
        if (!routeReservationCode) {
          const menu = await fetchPublicReservationMenu(slug);
          if (!active) return;
          setMenuItems(menu);
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (!routeReservationCode) {
          toast.error(error instanceof Error ? error.message : t("publicReservation.loadFailed"));
        }
      })
      .finally(() => {
        if (active && shouldBlockForContext) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [inviteToken, isInviteMode, routeReservationCode, slug, t]);

  useEffect(() => {
    if (!routeReservationCode) return;
    let active = true;
    setLoading(true);
    fetchPublicReservationByCode(routeReservationCode)
      .then((row) => {
        if (!active) return;
        setReservation(row);
        if (row.status === "pending_deposit") setStep("proof");
        else setStep("status");
      })
      .catch((error: unknown) => {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : t("publicReservation.loadFailed"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [routeReservationCode, t]);

  const orderTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.qty, 0),
    [cart],
  );
  const depositAmount = context ? estimateDepositAmount(context.settings, orderTotal) : 0;

  const menuCategories = useMemo(() => {
    const set = new Set<string>();
    for (const item of menuItems) {
      const cat = itemCategory(item);
      if (cat) set.add(cat);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [menuItems]);

  const filteredMenu = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    return menuItems.filter((item) => {
      const cat = itemCategory(item);
      if (menuCategory !== "all" && cat !== menuCategory) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || cat.toLowerCase().includes(q);
    });
  }, [menuItems, menuSearch, menuCategory]);

  const cartQtyById = useMemo(() => {
    const map = new Map<number, number>();
    for (const line of cart) map.set(line.menuItemId, line.qty);
    return map;
  }, [cart]);

  const addToCart = (item: PublicMenuItemApi) => {
    const menuItemId = Number(item.id);
    if (!Number.isFinite(menuItemId) || menuItemId < 1) return;
    setCart((prev) => {
      const existing = prev.find((line) => line.menuItemId === menuItemId);
      if (existing) {
        return prev.map((line) =>
          line.menuItemId === menuItemId ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      return [...prev, { menuItemId, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const updateQty = (menuItemId: number, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((line) => line.menuItemId !== menuItemId);
      return prev.map((line) => (line.menuItemId === menuItemId ? { ...line, qty } : line));
    });
  };

  const handleSubmit = async () => {
    if (!context) return;
    if (!isInviteMode && !slug) return;
    if (!customerName.trim() || !date || !time) {
      toast.error(t("publicReservation.fillRequired"));
      return;
    }
    const party = Number(partySize);
    if (!Number.isFinite(party) || party < 1) {
      toast.error(t("publicReservation.invalidPartySize"));
      return;
    }
    if ((context.settings.preorderRequired || context.settings.depositMode === "percent") && cart.length === 0) {
      toast.error(t("publicReservation.preorderRequired"));
      return;
    }
    const reservationAt = new Date(`${date}T${time}:00`).toISOString();
    const payload = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      partySize: party,
      reservationAt,
      items: cart.map((line) => ({ menuItemId: line.menuItemId, qty: line.qty })),
    };
    setSubmitting(true);
    try {
      const created = isInviteMode
        ? await createPublicReservationFromInvite(inviteToken, payload)
        : await createPublicReservation(slug, payload);
      setReservation(created);
      const nextSlug = context.publicSlug?.trim() || slug;
      if (nextSlug) {
        navigate(`/reserve/${nextSlug}/${created.reservationCode}`, { replace: true });
      }
      setStep("proof");
      toast.success(t("publicReservation.created"));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("publicReservation.createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadProof = async () => {
    if (!reservation || !proofFile) {
      toast.error(t("publicReservation.proofRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const updated = await uploadPublicReservationDepositProof(reservation.reservationCode, proofFile);
      setReservation(updated);
      setStep("status");
      toast.success(t("publicReservation.proofUploaded"));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("publicReservation.proofFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!reservation) return;
    setDownloadingPdf(true);
    try {
      await downloadPublicReservationPdf(reservation.reservationCode);
      toast.success(t("publicReservation.pdfDownloaded"));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("publicReservation.pdfFailed"));
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background text-muted-foreground">
        {t("publicReservation.loading")}
      </div>
    );
  }

  if (!context && !routeReservationCode) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <p className="text-lg font-medium">
          {t(isInviteMode ? "publicReservation.inviteUnavailableTitle" : "publicReservation.unavailableTitle")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t(isInviteMode ? "publicReservation.inviteUnavailableBody" : "publicReservation.unavailableBody")}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">{context?.outlet.name ?? t("publicReservation.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("publicReservation.title")}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-4 pb-10">
        {step === "form" && context ? (
          <>
            {context.invite?.expiresAt ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
                {t("publicReservation.inviteValidUntil", {
                  at: formatInviteExpiry(context.invite.expiresAt, i18n.language),
                })}
              </div>
            ) : null}

            <section className="space-y-4 rounded-xl border bg-card p-4">
              <h2 className="font-medium">{t("publicReservation.bookingDetails")}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label>{t("reservations.customerName")}</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{t("reservations.phone")}</Label>
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{t("reservations.partySizeLabel")}</Label>
                  <Input type="number" min={1} value={partySize} onChange={(e) => setPartySize(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{t("reservations.date")}</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{t("reservations.time")}</Label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>
            </section>

            <section className="space-y-3 rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium">{t("publicReservation.preorderTitle")}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("reservations.preorderHint")}</p>
                </div>
                {cart.length > 0 ? (
                  <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    {t("reservations.preorderSelectedCount", { n: cart.reduce((s, l) => s + l.qty, 0) })}
                  </span>
                ) : null}
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder={t("reservations.preorderSearch")}
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                />
              </div>

              {menuCategories.length > 1 ? (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMenuCategory("all")}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      menuCategory === "all"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {t("reservations.preorderCategoryAll")}
                  </button>
                  {menuCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setMenuCategory(cat)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        menuCategory === cat
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="max-h-72 overflow-y-auto rounded-lg border divide-y bg-background">
                {filteredMenu.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                    <UtensilsCrossed className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">{t("publicReservation.menuEmpty")}</p>
                  </div>
                ) : (
                  filteredMenu.map((item) => {
                    const menuItemId = Number(item.id);
                    const qty = cartQtyById.get(menuItemId) ?? 0;
                    const cat = itemCategory(item);
                    return (
                      <div
                        key={item.id}
                        className={cn("flex items-center gap-3 px-3 py-2.5", qty > 0 && "bg-primary/5")}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            {cat ? <span>{cat}</span> : null}
                            <span className="font-medium text-foreground">{formatRp(item.price)}</span>
                          </div>
                        </div>
                        {qty > 0 ? (
                          <div className="flex items-center gap-1 shrink-0 rounded-md border bg-background">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              aria-label={t("reservations.preorderDecrease")}
                              onClick={() => updateQty(menuItemId, qty - 1)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-6 text-center text-sm font-semibold tabular-nums">{qty}</span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              aria-label={t("reservations.preorderIncrease")}
                              onClick={() => updateQty(menuItemId, qty + 1)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="shrink-0"
                            onClick={() => addToCart(item)}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            {t("reservations.preorderAdd")}
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {cart.length > 0 ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{t("reservations.preorderSelectedTitle")}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => setCart([])}
                    >
                      {t("reservations.preorderClear")}
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {cart.map((line) => (
                      <li key={line.menuItemId} className="flex items-center gap-2 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{line.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {line.qty} × {formatRp(line.price)}
                          </p>
                        </div>
                        <span className="shrink-0 tabular-nums text-sm font-medium">
                          {formatRp(line.price * line.qty)}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 text-muted-foreground"
                          aria-label={t("reservations.preorderRemove")}
                          onClick={() => updateQty(line.menuItemId, 0)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm font-medium pt-1 border-t border-primary/10">
                    {t("publicReservation.orderTotal", { amount: formatRp(orderTotal) })}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">{t("publicReservation.depositSummary")}</p>
              <p className="text-2xl font-semibold">{formatRp(depositAmount)}</p>
              <Button className="mt-4 w-full" disabled={submitting} onClick={() => void handleSubmit()}>
                {submitting ? t("publicReservation.submitting") : t("publicReservation.submitBooking")}
              </Button>
            </section>
          </>
        ) : null}

        {step === "proof" && reservation ? (
          <section className="space-y-4 rounded-xl border bg-card p-4">
            <h2 className="font-medium">{t("publicReservation.proofTitle")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("publicReservation.proofBody", {
                code: reservation.reservationCode,
                amount: formatRp(reservation.requiredDepositAmount ?? depositAmount),
              })}
            </p>
            {context?.settings.depositInstructions ? (
              <Textarea readOnly value={context.settings.depositInstructions} className="min-h-24" />
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="deposit-proof">{t("publicReservation.proofFile")}</Label>
              <Input
                id="deposit-proof"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button className="w-full" disabled={submitting || !proofFile} onClick={() => void handleUploadProof()}>
              <Upload className="mr-2 h-4 w-4" />
              {submitting ? t("publicReservation.uploading") : t("publicReservation.uploadProof")}
            </Button>
            {statusSlug ? (
              <Button variant="link" className="px-0" asChild>
                <Link to={`/reserve/${statusSlug}/${reservation.reservationCode}`}>{t("publicReservation.viewStatus")}</Link>
              </Button>
            ) : null}
          </section>
        ) : null}

        {step === "status" && reservation ? (
          <section className="space-y-4 rounded-xl border bg-card p-4">
            <h2 className="font-medium">{t("publicReservation.statusTitle")}</h2>
            <p className="text-sm">
              {t("publicReservation.statusCode")}: <strong>{reservation.reservationCode}</strong>
            </p>
            <p className="text-sm">
              {t("publicReservation.statusLabel")}:{" "}
              <strong>{t(`reservations.status.${reservation.status as "pending_deposit"}`, { defaultValue: reservation.status })}</strong>
            </p>
            {reservation.depositRejectionReason ? (
              <p className="text-sm text-destructive">{reservation.depositRejectionReason}</p>
            ) : null}
            {reservation.status === "pending_deposit" ? (
              <Button onClick={() => setStep("proof")}>{t("publicReservation.uploadProof")}</Button>
            ) : null}
            {reservation.status === "deposit_submitted" ? (
              <p className="text-sm text-muted-foreground">{t("publicReservation.awaitingReview")}</p>
            ) : null}
            {reservation.status === "confirmed" ? (
              <p className="text-sm text-success">{t("publicReservation.confirmedMessage")}</p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={downloadingPdf}
              onClick={() => void handleDownloadPdf()}
            >
              <Download className="mr-2 h-4 w-4" />
              {downloadingPdf ? t("publicReservation.downloadingPdf") : t("publicReservation.downloadPdf")}
            </Button>
          </section>
        ) : null}
      </main>
    </div>
  );
}
