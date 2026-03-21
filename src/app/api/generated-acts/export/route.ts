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

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | {
          markdown?: string;
          title?: string;
          companyName?: string;
          documentType?: string;
          version?: number | null;
          format?: string;
        }
      | null;

    const markdown = typeof body?.markdown === "string" ? body.markdown.trim() : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const companyName =
      typeof body?.companyName === "string" ? body.companyName.trim() : "";
    const documentType =
      typeof body?.documentType === "string" ? body.documentType : "";
    const version = typeof body?.version === "number" ? body.version : null;
    if (body?.format === "pdf") {
      return NextResponse.json(
        { error: "L'export PDF e stato disabilitato." },
        { status: 400 }
      );
    }

    const format = normalizeExportFormat(body?.format);

    if (!markdown || !title || !companyName || !documentType) {
      return NextResponse.json(
        {
          error:
            "markdown, title, companyName e documentType sono obbligatori.",
        },
        { status: 400 }
      );
    }

    const documentTypeLabel = isDocumentGenerationType(documentType)
      ? getDocumentGenerationOption(documentType).title
      : documentType;
    const payload = buildExportPayload({
      title,
      companyName,
      documentTypeLabel,
      version,
      markdown,
    });
    const baseFilename = isDocumentGenerationType(documentType)
      ? createGeneratedActFilename({
          companyName,
          documentType,
          version: version ?? 1,
        })
      : `${title.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.md`;
    const filename = buildExportFilename({ baseFilename, format });
    const fileBuffer =
      format === "docx"
        ? await buildDocxBuffer(payload)
        : buildMarkdownBuffer(payload);

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
        : "Errore inatteso durante l'export dell'atto.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
