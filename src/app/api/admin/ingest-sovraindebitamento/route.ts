import { NextResponse } from "next/server";
import { createKnowledgeBaseEmbedding } from "@/lib/ai/embedding";
import { assertAdminApiAccess } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ALLOWED_CATEGORIES = [
  "Giurisprudenza",
  "Normativa",
  "Dottrina",
  "Sentenza",
  "Template",
] as const;

const ALLOWED_PROCEDURE_TYPES = [
  "Piano Consumatore",
  "Concordato Minore",
  "Liquidazione Controllata",
  "Esdebitazione Incapiente",
] as const;

type AllowedCategory = (typeof ALLOWED_CATEGORIES)[number];
type AllowedProcedureType = (typeof ALLOWED_PROCEDURE_TYPES)[number];
type IngestDocument = {
  filename?: string;
  content?: string;
};
type ChunkPayload = {
  chunk: string;
  sourceFile: string | null;
  localIndex: number;
};

function isAllowedCategory(value: string): value is AllowedCategory {
  return ALLOWED_CATEGORIES.includes(value as AllowedCategory);
}

function isAllowedProcedureType(
  value: string
): value is AllowedProcedureType {
  return ALLOWED_PROCEDURE_TYPES.includes(value as AllowedProcedureType);
}

function extractTitleFromChunk(
  chunk: string,
  category: AllowedCategory,
  index: number,
  sourceFile?: string | null
) {
  const headingLine = chunk
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("#"));

  if (!headingLine) {
    if (sourceFile) {
      const baseName = sourceFile.replace(/\.[^/.]+$/, "");
      return `${baseName} - ${category} ${index + 1}`;
    }
    return `${category} ${index + 1}`;
  }

  const title = headingLine.replace(/^#+\s*/, "").trim();
  if (title) return title;

  if (sourceFile) {
    const baseName = sourceFile.replace(/\.[^/.]+$/, "");
    return `${baseName} - ${category} ${index + 1}`;
  }

  return `${category} ${index + 1}`;
}

function splitMarkdownIntoChunks(markdownText: string, sourceFile: string | null) {
  return markdownText
    .split("---")
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk, localIndex) => ({
      chunk,
      sourceFile,
      localIndex,
    }));
}

export async function POST(request: Request) {
  try {
    const access = await assertAdminApiAccess();

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | {
          markdownText?: string;
          documents?: IngestDocument[];
          category?: string;
          procedureType?: string;
          source?: string;
        }
      | null;

    const markdownText =
      typeof body?.markdownText === "string" ? body.markdownText : "";
    const documents = Array.isArray(body?.documents) ? body.documents : [];
    const category = typeof body?.category === "string" ? body.category : "";
    const procedureType =
      typeof body?.procedureType === "string" && body.procedureType.trim()
        ? body.procedureType.trim()
        : null;
    const source =
      typeof body?.source === "string" && body.source.trim()
        ? body.source.trim()
        : null;

    if (!isAllowedCategory(category)) {
      return NextResponse.json(
        {
          error: `Categoria non valida. Valori ammessi: ${ALLOWED_CATEGORIES.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    if (procedureType && !isAllowedProcedureType(procedureType)) {
      return NextResponse.json(
        {
          error: `procedureType non valido. Valori ammessi: ${ALLOWED_PROCEDURE_TYPES.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const structuredDocuments = documents
      .map((document) => ({
        filename:
          typeof document?.filename === "string" && document.filename.trim()
            ? document.filename.trim()
            : null,
        content:
          typeof document?.content === "string" ? document.content.trim() : "",
      }))
      .filter((document) => document.content.length > 0);

    if (!markdownText.trim() && structuredDocuments.length === 0) {
      return NextResponse.json(
        {
          error:
            "Fornisci markdownText oppure almeno un file strutturato da importare.",
        },
        { status: 400 }
      );
    }

    const chunks: ChunkPayload[] = [
      ...(markdownText.trim()
        ? splitMarkdownIntoChunks(markdownText, null)
        : []),
      ...structuredDocuments.flatMap((document) =>
        splitMarkdownIntoChunks(document.content, document.filename)
      ),
    ];

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "Nessun blocco Markdown valido trovato dopo il chunking." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    let processedCount = 0;
    const insertedTitles: string[] = [];
    const errors: Array<{ index: number; sourceFile: string | null; message: string }> = [];

    for (const [index, payload] of chunks.entries()) {
      try {
        const title = extractTitleFromChunk(
          payload.chunk,
          category,
          payload.localIndex,
          payload.sourceFile
        );
        const embedding = await createKnowledgeBaseEmbedding({
          value: payload.chunk,
          taskType: "RETRIEVAL_DOCUMENT",
        });

        const { error } = await supabase
          .from("knowledge_base_sovraindebitamento")
          .insert({
            title,
            content: payload.chunk,
            embedding,
            category,
            procedure_type: procedureType,
            source,
            metadata: {
              ingest_mode: payload.sourceFile ? "file-import" : "manual-paste",
              source_file: payload.sourceFile,
              procedure_type: procedureType,
              source,
            },
          });

        if (error) {
          throw new Error(error.message);
        }

        processedCount += 1;
        insertedTitles.push(title);
      } catch (error) {
        errors.push({
          index,
          sourceFile: payload.sourceFile,
          message:
            error instanceof Error
              ? error.message
              : "Errore sconosciuto durante l'ingestione del chunk.",
        });
      }
    }

    return NextResponse.json(
      {
        totalChunks: chunks.length,
        processedCount,
        failedCount: errors.length,
        insertedTitles,
        errors,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore inatteso durante l'ingestione della knowledge base sovraindebitamento.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
