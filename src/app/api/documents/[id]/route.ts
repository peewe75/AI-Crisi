import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import {
  getAccessiblePracticeDocument,
  getPracticeDocumentsBucket,
} from "@/lib/documents/access";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const document = await getAccessiblePracticeDocument({
      documentId: id,
      userId,
      isAdmin: await isCurrentUserAdmin(),
    });

    if (!document) {
      return NextResponse.json(
        { error: "Documento non trovato o non accessibile." },
        { status: 404 }
      );
    }

    const disposition =
      new URL(request.url).searchParams.get("disposition") === "attachment"
        ? "attachment"
        : "inline";

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(getPracticeDocumentsBucket())
      .download(document.filePath);

    if (error) {
      throw new Error(`Download documento fallito: ${error.message}`);
    }

    const bytes = new Uint8Array(await data.arrayBuffer());
    const contentType = data.type || document.contentType;

    return new Response(bytes, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="${document.filename}"; filename*=UTF-8''${encodeURIComponent(document.filename)}`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore inatteso durante la lettura del documento.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
