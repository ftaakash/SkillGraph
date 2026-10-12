"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CreditCard, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PlanId = "student_free" | "student_pro" | "college_licence" | "recruiter_free" | "recruiter_team";

interface Plan {
  id: PlanId;
  name: string;
  pricePaise: number;
  perSeat: boolean;
  minSeats?: number;
  periodMonths: number;
  purchasable: boolean;
  highlights: string[];
  limits: { aiTokensPerDay: number; openclawPerDay: number; revealRequestsPerMonth: number };
}

interface Overview {
  role: "STUDENT" | "FACULTY" | "RECRUITER";
  canBuyCollegeLicence: boolean;
  paymentsEnabled: boolean;
  entitlements: { plan: PlanId; source: "self" | "college" | "company" | "free"; limits: Plan["limits"]; periodEnd: string | null };
  usage: { aiTokens24h: number; openclawPreparedToday: number; revealRequestsThisMonth: number };
  plans: Plan[];
  subscriptions: { id: string; plan: PlanId; status: string; seats: number | null; amountPaise: number; periodStart: string | null; periodEnd: string | null }[];
}

interface RazorpayResponse { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
type RazorpayCtor = new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };

const inr = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const period = (months: number) => (months === 12 ? "year" : months === 1 ? "month" : `${months} months`);

const SOURCE_COPY: Record<Overview["entitlements"]["source"], string> = {
  self: "Purchased by you",
  college: "Provided by your college licence",
  company: "Provided by your company plan",
  free: "Free plan",
};

function loadCheckout(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error("Checkout unavailable")));
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout"));
    document.body.appendChild(script);
  });
}

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium tabular-nums">{used.toLocaleString("en-IN")} / {limit.toLocaleString("en-IN")}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${pct >= 90 ? "bg-destructive" : "gradient-primary"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [seats, setSeats] = useState(100);
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    fetch("/api/billing").then(r => r.json()).then(setData).catch(() => setMessage({ kind: "error", text: "Could not load billing details." }));
  }, []);

  useEffect(() => { load(); }, [load]);

  const buy = async (plan: Plan) => {
    setBusy(plan.id);
    setMessage(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.id, seats: plan.perSeat ? seats : undefined }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error ?? "Could not start checkout");

      const Razorpay = await loadCheckout();
      const checkout = new Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "SkillGraph",
        description: order.planName,
        prefill: order.prefill,
        theme: { color: "#0e7490" },
        handler: async (response: RazorpayResponse) => {
          const verify = await fetch("/api/billing/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const result = await verify.json();
          setMessage(verify.ok
            ? { kind: "ok", text: "Payment received — your plan is active." }
            : { kind: "error", text: result.error ?? "Payment could not be verified." });
          setBusy(null);
          load();
        },
        modal: { ondismiss: () => setBusy(null) },
      });
      checkout.on("payment.failed", r => {
        setMessage({ kind: "error", text: r.error?.description ?? "Payment failed. You have not been charged." });
        setBusy(null);
      });
      checkout.open();
    } catch (err) {
      setMessage({ kind: "error", text: (err as Error).message });
      setBusy(null);
    }
  };

  const title = data?.role === "FACULTY" ? "Licence & Billing" : "Plan & Billing";

  if (!data) {
    return (
      <DashboardLayout title={title}>
        <div className="flex h-64 items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-primary" aria-label="Loading" /></div>
      </DashboardLayout>
    );
  }

  const current = data.plans.find(p => p.id === data.entitlements.plan);
  const { limits } = data.entitlements;

  return (
    <DashboardLayout title={title}>
      <div className="max-w-5xl space-y-6">
        {message && (
          <div role={message.kind === "error" ? "alert" : "status"}
            className={`text-sm px-4 py-3 rounded-lg border ${message.kind === "ok" ? "bg-primary/10 border-primary/30" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
            {message.text}
          </div>
        )}

        {/* Current plan & usage */}
        <section className="bg-card border border-border rounded-lg p-6 grid gap-6 md:grid-cols-2" aria-labelledby="current-plan">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Current plan</p>
            <h2 id="current-plan" className="font-heading text-2xl font-bold text-foreground mt-1">{current?.name ?? data.entitlements.plan}</h2>
            <p className="text-sm text-muted-foreground mt-1">{SOURCE_COPY[data.entitlements.source]}</p>
            {data.entitlements.periodEnd && <p className="text-sm text-foreground mt-2">Active until {date(data.entitlements.periodEnd)}</p>}
          </div>
          <div className="space-y-4">
            <Meter label="AI usage (last 24 h, tokens)" used={data.usage.aiTokens24h} limit={limits.aiTokensPerDay} />
            {data.role === "STUDENT" && <Meter label="OpenClaw applications prepared today" used={data.usage.openclawPreparedToday} limit={limits.openclawPerDay} />}
            {data.role === "RECRUITER" && <Meter label="Contact requests this month" used={data.usage.revealRequestsThisMonth} limit={limits.revealRequestsPerMonth} />}
          </div>
        </section>

        {!data.paymentsEnabled && (
          <p className="text-sm text-muted-foreground border border-border rounded-lg px-4 py-3">
            Online payments are not enabled yet. Contact us to upgrade.
          </p>
        )}

        {/* Plans */}
        <section aria-labelledby="plans-title">
          <h2 id="plans-title" className="font-heading text-lg font-semibold text-foreground mb-3">Plans</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {data.plans.map(plan => {
              const isCurrent = plan.id === data.entitlements.plan;
              const canBuy = plan.purchasable && data.paymentsEnabled && (plan.id !== "college_licence" || data.canBuyCollegeLicence);
              return (
                <div key={plan.id} className={`bg-card border rounded-lg p-5 flex flex-col ${isCurrent ? "border-primary" : "border-border"}`}>
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-heading text-lg font-semibold text-foreground">{plan.name}</h3>
                    {isCurrent && <span className="text-[11px] font-semibold text-primary">Current</span>}
                  </div>
                  <p className="mt-1 text-foreground">
                    {plan.pricePaise === 0 ? (
                      <span className="text-2xl font-bold">Free</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold">{inr(plan.pricePaise)}</span>
                        <span className="text-sm text-muted-foreground"> {plan.perSeat ? "per student " : ""}/ {period(plan.periodMonths)}</span>
                      </>
                    )}
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground flex-1">
                    {plan.highlights.map(h => (
                      <li key={h} className="flex gap-2"><Check size={14} className="text-primary mt-0.5 shrink-0" aria-hidden />{h}</li>
                    ))}
                  </ul>
                  {plan.perSeat && canBuy && (
                    <div className="mt-4">
                      <label htmlFor="seats" className="text-xs font-medium text-foreground">Student seats (min. {plan.minSeats})</label>
                      <Input id="seats" type="number" min={plan.minSeats} step={10} value={seats}
                        onChange={e => setSeats(Math.max(0, parseInt(e.target.value) || 0))} className="mt-1 bg-background" />
                      <p className="text-xs text-muted-foreground mt-1">Total: {inr(plan.pricePaise * seats)} for 12 months</p>
                    </div>
                  )}
                  {canBuy && (
                    <Button onClick={() => buy(plan)} disabled={busy !== null} className="mt-4 gradient-primary text-primary-foreground font-semibold gap-2">
                      <CreditCard size={16} aria-hidden />
                      {busy === plan.id ? "Opening checkout…" : isCurrent ? "Extend" : "Upgrade"}
                    </Button>
                  )}
                  {plan.id === "college_licence" && plan.purchasable && !data.canBuyCollegeLicence && data.role === "FACULTY" && (
                    <p className="mt-4 text-xs text-muted-foreground">Only your workspace admin can purchase the licence.</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* History */}
        {data.subscriptions.length > 0 && (
          <section className="bg-card border border-border rounded-lg p-6" aria-labelledby="history-title">
            <h2 id="history-title" className="font-heading text-lg font-semibold text-foreground mb-3">Purchase history</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <tr><th className="py-2 pr-4">Plan</th><th className="py-2 pr-4">Seats</th><th className="py-2 pr-4">Amount</th><th className="py-2 pr-4">Period</th><th className="py-2">Status</th></tr>
                </thead>
                <tbody>
                  {data.subscriptions.map(s => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="py-2 pr-4 text-foreground">{data.plans.find(p => p.id === s.plan)?.name ?? s.plan}</td>
                      <td className="py-2 pr-4 tabular-nums">{s.seats ?? "—"}</td>
                      <td className="py-2 pr-4 tabular-nums">{inr(s.amountPaise)}</td>
                      <td className="py-2 pr-4">{date(s.periodStart)} – {date(s.periodEnd)}</td>
                      <td className="py-2 capitalize">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
