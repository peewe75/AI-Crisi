"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type SyncResult = {
  message?: string;
  runStatus?: string;
  skippedDueToInterval?: boolean;
  insertedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  nextEligibleSyncAt?: string | null;
  error?: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function BackgroundSyncRunTrigger() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    if (!result || error) {
      return null;
    }

    const nextSlot = formatDateTime(result.nextEligibleSyncAt);

    return [
      result.message,
      typeof result.insertedCount === "number"
        ? `Inseriti: ${result.insertedCount}`
        : null,
      typeof result.skippedCount === "number"
        ? `Gia presenti: ${result.skippedCount}`
        : null,
      typeof result.failedCount === "number"
        ? `Errori batch: ${result.failedCount}`
        : null,
      nextSlot ? `Prossimo slot: ${nextSlot}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }, [error, result]);

  function handleTrigger() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/sync-giurisprudenza", {
          method: "POST",
        });
        const payload = (await response.json().catch(() => null)) as SyncResult | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Sync manuale fallito.");
        }

        setResult(payload);
        router.refresh();
      } catch (requestError) {
        setResult(null);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Errore inatteso durante il sync manuale."
        );
      }
    });
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={handleTrigger}
        disabled={isPending}
        className="h-11 bg-emerald-700 text-white hover:bg-emerald-600"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        Esegui sync manuale
      </Button>

      {summary ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {summary}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}
    </div>
  );
}
