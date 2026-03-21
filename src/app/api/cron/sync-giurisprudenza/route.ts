import { NextResponse } from "next/server";
import { syncGiurisprudenzaFromIlCaso } from "@/lib/ai/giurisprudenza-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    throw new Error("Variabile d'ambiente mancante: CRON_SECRET");
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json(
        { error: "Richiesta cron non autorizzata." },
        { status: 401 }
      );
    }

    const result = await syncGiurisprudenzaFromIlCaso();

    return NextResponse.json(
      {
        message: result.skippedDueToInterval
          ? "Sincronizzazione giurisprudenza saltata per intervallo minimo di 48 ore."
          : "Sincronizzazione giurisprudenza completata.",
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore inatteso durante la sincronizzazione giurisprudenziale.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
