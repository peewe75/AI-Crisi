import { auth } from "@clerk/nextjs/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClerkSupabaseClient } from "@/lib/supabase/client";
import BillingActionButton from "@/components/dashboard/BillingActionButton";

type SubscriptionRow = {
  status: string;
  stripe_current_period_end: string | null;
  stripe_price_id: string | null;
};

function formatDate(value: string | null): string {
  if (!value) {
    return "n/d";
  }

  return new Date(value).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function BillingPage() {
  const { userId, getToken } = await auth();

  if (!userId) {
    return <div className="p-4">Utente non autenticato.</div>;
  }

  const token = await getToken({ template: "supabase" });
  const supabase = createClerkSupabaseClient(token);

  const { data: rawData, error } = await supabase
    .from("user_subscriptions")
    .select("status, stripe_current_period_end, stripe_price_id")
    .eq("user_id", userId)
    .maybeSingle();

  const data = (rawData as SubscriptionRow | null) ?? null;

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Errore caricamento Billing</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-red-700">
            {error.message}
          </CardContent>
        </Card>
      </div>
    );
  }

  const periodEndMs = data?.stripe_current_period_end
    ? new Date(data.stripe_current_period_end).getTime()
    : null;

  const hasFuturePeriod = periodEndMs ? periodEndMs > Date.now() : false;

  const inTrial = data?.status === "trialing" && hasFuturePeriod;
  const active = data?.status === "active" && (hasFuturePeriod || !periodEndMs);
  const hasActivePlan = inTrial || active;

  const statusLabel = inTrial
    ? `In prova gratuita (scade il ${formatDate(data?.stripe_current_period_end ?? null)})`
    : active
    ? "Attivo"
    : "Scaduto / Nessun piano";

  const statusClass = inTrial
    ? "bg-amber-100 text-amber-800"
    : active
    ? "bg-green-100 text-green-800"
    : "bg-slate-200 text-slate-700";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Gestione Abbonamento
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Piano Pro a 30 EUR/mese con 14 giorni di prova gratuita.
        </p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg text-slate-900">
            Stato Piano Pro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-slate-500">Stato attuale</p>
              <span
                className={`inline-flex mt-2 rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
              >
                {statusLabel}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Prossima scadenza</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">
                {formatDate(data?.stripe_current_period_end ?? null)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p>
              Piano: <strong>Pro</strong>
            </p>
            <p className="mt-1">Prezzo: 30 EUR / mese</p>
            <p className="mt-1">Trial iniziale: 14 giorni</p>
            <p className="mt-1 break-all">
              Price ID Stripe: {data?.stripe_price_id ?? "non disponibile"}
            </p>
          </div>

          <BillingActionButton hasActivePlan={hasActivePlan} />
        </CardContent>
      </Card>
    </div>
  );
}
