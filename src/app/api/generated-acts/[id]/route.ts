import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  createGeneratedActFilename,
  getDocumentGenerationOption,
  isDocumentGenerationType,
} from "@/lib/ai/officina";
import {
  buildDocxBuffer,
  buildExportFilename,
  buildExportPayload,
  buildMarkdownBuffer,
  getContentType,
  normalizeExportFormat,
} from "@/lib/documents/generated-act-export";
import { getPracticeForCurrentUser } from "@/lib/practices";
import { createClerkSupabaseClient } from "@/lib/supabase/client";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { status?: string }
      | null;
    const status = typeof body?.status === "string" ? body.status : "";

    if (status !== "active" && status !== "archived") {
      return NextResponse.json(
        { error: "Lo stato deve essere 'active' o 'archived'." },
        { status: 400 }
      );
    }

    const { id } = await context.params;
    const token = await getToken({ template: "supabase" });
    const supabase = createClerkSupabaseClient(token);
    const archivedAt = status === "archived" ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from("generated_acts")
      .update({
        status,
        archived_at: archivedAt,
      })
      .eq("id", id)
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
      throw new Error(`Aggiornamento atto fallito: ${error.message}`);
    }

    if (!data) {
      return NextResponse.json(
        { error: "Atto non trovato o non accessibile." },
        { status: 404 }
      );
    }

    return NextResponse.json({ act: data });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore inatteso durante l'aggiornamento dell'atto.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const token = await getToken({ template: "supabase" });
    const supabase = createClerkSupabaseClient(token);

    const { data: act, error } = await supabase
      .from("generated_acts")
      .select(
        `
          id,
          practice_id,
          document_type,
          title,
          content_markdown,
          version
        `
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Lettura atto fallita: ${error.message}`);
    }

    if (!act) {
      return NextResponse.json(
        { error: "Atto non trovato o non accessibile." },
        { status: 404 }
      );
    }

    const practice = await getPracticeForCurrentUser({
      practiceId: act.practice_id,
      clerkToken: token,
    });

    if (!practice?.client) {
      return NextResponse.json(
        { error: "Pratica associata non trovata." },
        { status: 404 }
      );
    }

    const requestedFormat = new URL(request.url).searchParams.get("format");
    if (requestedFormat === "pdf") {
      return NextResponse.json(
        { error: "L'export PDF e stato disabilitato." },
        { status: 400 }
      );
    }

    const format = normalizeExportFormat(requestedFormat);
    const baseFilename = isDocumentGenerationType(act.document_type)
      ? createGeneratedActFilename({
          companyName: practice.client.company_name,
          documentType: act.document_type,
          version: act.version,
        })
      : `atto-${act.id}.md`;
    const documentTypeLabel = isDocumentGenerationType(act.document_type)
      ? getDocumentGenerationOption(act.document_type).title
      : act.document_type;
    const payload = buildExportPayload({
      title: act.title,
      companyName: practice.client.company_name,
      documentTypeLabel,
      version: act.version,
      markdown: act.content_markdown,
    });

    const fileBuffer =
      format === "docx"
        ? await buildDocxBuffer(payload)
        : buildMarkdownBuffer(payload);
    const filename = buildExportFilename({
      baseFilename,
      format,
    });

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": getContentType(format),
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
          filename
        )}`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore inatteso durante il download dell'atto.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
