import { NextResponse } from "next/server";
import { syncGiurisprudenzaFromIlCaso } from "@/lib/ai/giurisprudenza-sync";
import { assertAdminApiAccess } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST() {
  try {
    const access = await assertAdminApiAccess();

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const result = await syncGiurisprudenzaFromIlCaso();

    return NextResponse.json(
      {
        message: result.skippedDueToInterval
          ? "Sync saltato per intervallo minimo di 48 ore."
          : "Sync giurisprudenza eseguito.",
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore inatteso durante il sync manuale.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
