import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { extractDocumentTextFromStoragePath } from "@/lib/documents/extract-pdf-text";
import { createClerkSupabaseClient } from "@/lib/supabase/client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { documentId?: string; force?: boolean }
      | null;

    const documentId =
      typeof body?.documentId === "string" ? body.documentId : "";
    const force = body?.force === true;

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId obbligatorio." },
        { status: 400 }
      );
    }

    const token = await getToken({ template: "supabase" });
    const supabase = createClerkSupabaseClient(token);
    const { data: document, error } = await supabase
      .from("documents")
      .select("id, file_path, extracted_text")
      .eq("id", documentId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: `Lettura documento fallita: ${error.message}` },
        { status: 500 }
      );
    }

    if (!document) {
      return NextResponse.json(
        { error: "Documento non trovato o non accessibile." },
        { status: 404 }
      );
    }

    if (!document.file_path) {
      return NextResponse.json(
        { error: "Il documento non ha un file_path associato." },
        { status: 409 }
      );
    }

    if (!force && document.extracted_text?.trim()) {
      return NextResponse.json(
        {
          documentId,
          extractedText: document.extracted_text,
          extractedTextLength: document.extracted_text.length,
          skipped: true,
        },
        { status: 200 }
      );
    }

    const extractedText = await extractDocumentTextFromStoragePath(
      document.file_path
    );

    const admin = getSupabaseAdminClient();
    const { error: updateError } = await admin
      .from("documents")
      .update({ extracted_text: extractedText || null })
      .eq("id", documentId);

    if (updateError) {
      return NextResponse.json(
        { error: `Aggiornamento documento fallito: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        documentId,
        extractedText,
        extractedTextLength: extractedText.length,
        skipped: false,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore inatteso durante l'estrazione del testo documento.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
