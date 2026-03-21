import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  createGeneratedActTitle,
  isDocumentGenerationType,
} from "@/lib/ai/officina";
import { getPracticeForCurrentUser } from "@/lib/practices";
import { createClerkSupabaseClient } from "@/lib/supabase/client";

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
      | {
          practiceId?: string;
          documentType?: string;
          contentMarkdown?: string;
        }
      | null;

    const practiceId = typeof body?.practiceId === "string" ? body.practiceId : "";
    const documentType =
      typeof body?.documentType === "string" ? body.documentType : "";
    const contentMarkdown =
      typeof body?.contentMarkdown === "string" ? body.contentMarkdown.trim() : "";

    if (!practiceId || !documentType || !contentMarkdown) {
      return NextResponse.json(
        {
          error:
            "practiceId, documentType e contentMarkdown sono obbligatori.",
        },
        { status: 400 }
      );
    }

    if (!isDocumentGenerationType(documentType)) {
      return NextResponse.json(
        { error: "Tipo di atto non supportato." },
        { status: 400 }
      );
    }

    const token = await getToken({ template: "supabase" });
    const practice = await getPracticeForCurrentUser({
      practiceId,
      clerkToken: token,
    });

    if (!practice || !practice.client) {
      return NextResponse.json(
        { error: "Pratica non trovata o non accessibile." },
        { status: 404 }
      );
    }

    const supabase = createClerkSupabaseClient(token);
    const { data: latestAct, error: versionError } = await supabase
      .from("generated_acts")
      .select("version")
      .eq("practice_id", practiceId)
      .eq("document_type", documentType)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError) {
      throw new Error(`Calcolo versione atto fallito: ${versionError.message}`);
    }

    const nextVersion = (latestAct?.version ?? 0) + 1;
    const title = createGeneratedActTitle({
      companyName: practice.client.company_name,
      documentType,
      version: nextVersion,
    });

    const { data, error } = await supabase
      .from("generated_acts")
      .insert({
        practice_id: practiceId,
        document_type: documentType,
        title,
        content_markdown: contentMarkdown,
        version: nextVersion,
        status: "active",
        metadata: {
          origin: "officina_ai",
          company_name: practice.client.company_name,
        },
      })
      .select(
        `
          id,
          practice_id,
          document_type,
          title,
          content_markdown,
          version,
          status,
          metadata,
          created_at,
          updated_at,
          archived_at
        `
      )
      .maybeSingle();

    if (error) {
      throw new Error(`Salvataggio atto fallito: ${error.message}`);
    }

    return NextResponse.json({ act: data }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore inatteso durante il salvataggio dell'atto.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
