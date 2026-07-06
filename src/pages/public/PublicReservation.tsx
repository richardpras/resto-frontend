import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Minus, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGuestLocaleBootstrap } from "@/hooks/useGuestLocaleBootstrap";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import {
  createPublicReservation,
  estimateDepositAmount,
  fetchPublicReservationByCode,
  fetchPublicReservationContext,
  fetchPublicReservationMenu,
  uploadPublicReservationDepositProof,
  type PublicReservationApi,
  type PublicReservationContextApi,
} from "@/lib/api-integration/publicReservationEndpoints";
import type { PublicMenuItemApi } from "@/lib/api-integration/publicMenuEndpoints";

type CartLine = PublicMenuItemApi & { qty: number };
type Step = "form" | "proof" | "status";

function formatRp(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function PublicReservation() {
  const { t } = useOpsTranslation();
  const navigate = useNavigate();
  const { outletSlug, reservationCode: routeReservationCode } = useParams<{
    outletSlug: string;
    reservationCode?: string;
  }>();
  useGuestLocaleBootstrap();

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
  const [proofFile, setProofFile] = useState<File | null>(null);

  const slug = outletSlug?.trim() ?? "";

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    Promise.all([fetchPublicReservationContext(slug), fetchPublicReservationMenu(slug)])
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
  }, [slug, t]);

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

  const addToCart = (item: PublicMenuItemApi) => {
    setCart((prev) => {
      const existing = prev.find((line) => line.id === item.id);
      if (existing) {
        return prev.map((line) => (line.id === item.id ? { ...line, qty: line.qty + 1 } : line));
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) => (line.id === id ? { ...line, qty: line.qty + delta } : line))
        .filter((line) => line.qty > 0),
    );
  };

  const handleSubmit = async () => {
    if (!context || !slug) return;
    if (!customerName.trim() || !date || !time) {
      toast.error(t("publicReservation.fillRequired"));
      return;
    }
    const party = Number(partySize);
    if (!Number.isFinite(party) || party < 1) {
      toast.error(t("publicReservation.invalidPartySize"));
      return;
    }
    if (context.settings.preorderRequired && cart.length === 0) {
      toast.error(t("publicReservation.preorderRequired"));
      return;
    }
    const reservationAt = new Date(`${date}T${time}:00`).toISOString();
    setSubmitting(true);
    try {
      const created = await createPublicReservation(slug, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        partySize: party,
        reservationAt,
        items: cart.map((line) => ({ menuItemId: Number(line.id), qty: line.qty })),
      });
      setReservation(created);
      navigate(`/reserve/${slug}/${created.reservationCode}`, { replace: true });
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

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background text-muted-foreground">
        {t("publicReservation.loading")}
      </div>
    );
  }

  if (!context) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <p className="text-lg font-medium">{t("publicReservation.unavailableTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("publicReservation.unavailableBody")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">{context.outlet.name}</h1>
            <p className="text-sm text-muted-foreground">{t("publicReservation.title")}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-4 pb-10">
        {step === "form" ? (
          <>
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

            {(context.settings.preorderRequired || cart.length > 0) && (
              <section className="space-y-3 rounded-xl border bg-card p-4">
                <h2 className="font-medium">{t("publicReservation.preorderTitle")}</h2>
                {menuItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("publicReservation.menuEmpty")}</p>
                ) : (
                  <div className="space-y-2">
                    {menuItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{formatRp(item.price)}</p>
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={() => addToCart(item)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {cart.length > 0 ? (
                  <div className="space-y-2 border-t pt-3">
                    {cart.map((line) => (
                      <div key={line.id} className="flex items-center justify-between gap-2">
                        <span>{line.name}</span>
                        <div className="flex items-center gap-2">
                          <Button type="button" size="icon" variant="outline" onClick={() => updateQty(line.id, -1)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-6 text-center">{line.qty}</span>
                          <Button type="button" size="icon" variant="outline" onClick={() => updateQty(line.id, 1)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <p className="text-sm font-medium">{t("publicReservation.orderTotal", { amount: formatRp(orderTotal) })}</p>
                  </div>
                ) : null}
              </section>
            )}

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
            {context.settings.depositInstructions ? (
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
            <Button variant="link" className="px-0" asChild>
              <Link to={`/reserve/${slug}/${reservation.reservationCode}`}>{t("publicReservation.viewStatus")}</Link>
            </Button>
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
          </section>
        ) : null}
      </main>
    </div>
  );
}
