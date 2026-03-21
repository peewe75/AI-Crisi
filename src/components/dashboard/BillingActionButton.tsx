"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type BillingActionButtonProps = {
  hasActivePlan: boolean;
};

export default function BillingActionButton({
  hasActivePlan,
}: BillingActionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const actionLabel = hasActivePlan
    ? "Gestisci Piano"
    : "Attiva Abbonamento";

  const handleCheckout = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(
          payload.error ?? "Creazione checkout non riuscita. Riprova."
        );
      }

      window.location.href = payload.url;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Errore inatteso in apertura checkout."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleCheckout}
        disabled={loading}
        className="bg-blue-900 hover:bg-blue-800 text-white w-full sm:w-auto"
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {actionLabel}
      </Button>
      {errorMessage ? (
        <p className="text-sm text-red-600">{errorMessage}</p>
      ) : null}
    </div>
  );
}
