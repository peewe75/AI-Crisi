import { auth } from "@clerk/nextjs/server";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { NextResponse } from "next/server";
import {
  getAnyDocumentGenerationOption,
  isAnyDocumentGenerationType,
  isSovraindebitamentoPractice,
} from "@/lib/ai/officina";
import {
  searchKnowledgeBase,
  searchSovraindebitamentoKnowledgeBase,
} from "@/lib/ai/vector-search";
import {
  getMissingPracticeCategories,
  getPracticeForCurrentUser,
  type PracticeDocumentRecord,
} from "@/lib/practices";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_DOCUMENT_CHARS = 12000;
const MAX_TOTAL_CONTEXT_CHARS = 70000;

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function clipText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n[...contenuto troncato per limiti di contesto...]`;
}

function buildDocumentContext(documents: PracticeDocumentRecord[]) {
  let currentLength = 0;

  return documents
    .filter(
      (document) =>
        typeof document.extracted_text === "string" &&
        document.extracted_text.trim().length > 0
    )
    .sort((left, right) => left.category.localeCompare(right.category))
    .map((document) => {
      const normalized = compactText(document.extracted_text as string);
      const available = Math.max(0, MAX_TOTAL_CONTEXT_CHARS - currentLength);

      if (available === 0) {
        return null;
      }

      const clipped = clipText(
        normalized,
        Math.min(MAX_DOCUMENT_CHARS, available)
      );

      currentLength += clipped.length;

      return [
        `Categoria documento: ${document.category}`,
        `Percorso file: ${document.file_path ?? "non disponibile"}`,
        "Testo estratto:",
        clipped,
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n\n====\n\n");
}

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
      | { practiceId?: string; documentType?: string }
      | null;

    const practiceId =
      typeof body?.practiceId === "string" ? body.practiceId : "";
    const documentType =
      typeof body?.documentType === "string" ? body.documentType : "";

    if (!practiceId || !documentType) {
      return NextResponse.json(
        { error: "practiceId e documentType sono obbligatori." },
        { status: 400 }
      );
    }

    if (!isAnyDocumentGenerationType(documentType)) {
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

    if (!practice) {
      return NextResponse.json(
        { error: "Pratica non trovata o non accessibile." },
        { status: 404 }
      );
    }

    if (!practice.client) {
      return NextResponse.json(
        { error: "Anagrafica cliente mancante per la pratica selezionata." },
        { status: 409 }
      );
    }

    if (practice.documents.length === 0) {
      return NextResponse.json(
        {
          error:
            "La pratica non contiene ancora documenti. Carica almeno un documento nel fascicolo prima di generare l'atto.",
        },
        { status: 409 }
      );
    }

    const documentsWithText = practice.documents.filter(
      (document) =>
        typeof document.extracted_text === "string" &&
        document.extracted_text.trim().length > 0
    );

    if (documentsWithText.length === 0) {
      return NextResponse.json(
        {
          error:
            "I documenti caricati non hanno testo estratto disponibile. Completa OCR/estrazione prima di usare l'Officina Atti.",
        },
        { status: 409 }
      );
    }

    const missingCategories = getMissingPracticeCategories(practice.documents);
    const isSovraindebitamento = isSovraindebitamentoPractice(practice.type);
    const requestedDocument = getAnyDocumentGenerationOption(documentType as Parameters<typeof getAnyDocumentGenerationOption>[0]);
    const documentContext = buildDocumentContext(practice.documents);

    const legalSources = isSovraindebitamento
      ? await searchSovraindebitamentoKnowledgeBase(
          `${requestedDocument.title} per pratica ${practice.type} in materia di sovraindebitamento e procedure minori CCII`,
          5,
          practice.type
        )
      : await searchKnowledgeBase(
          `${requestedDocument.title} per pratica ${practice.type} in materia di crisi d'impresa e CCII`
        );

    const systemPrompt = isSovraindebitamento
      ? [
          "Sei un avvocato Senior esperto in procedure di sovraindebitamento (D.Lgs. n. 14/2019, CCII, Titolo IV-bis e segg.).",
          "Redigi l'atto richiesto esclusivamente in italiano e in formato Markdown.",
          "Il soggetto è un debitore NON FALLIBILE: consumatore, professionista, piccolo imprenditore o imprenditore agricolo.",
          "Usa i dati del debitore, i documenti interni e la giurisprudenza/normativa recuperata dalla knowledge base sovraindebitamento.",
          "Mantieni tono formale, analitico e professionale tipico dell'avvocato del debitore.",
          "Quando richiami norme o arresti giurisprudenziali, cita soltanto le fonti presenti nel contesto fornito.",
          "Se il fascicolo presenta lacune documentali (es. mancanza relazione OCC, elenco creditori), evidenziale in un paragrafo finale denominato 'Cautele e integrazioni istruttorie'.",
          "Non inventare fatti non presenti nel fascicolo.",
          "Usa intestazioni Markdown coerenti con la struttura richiesta.",
        ].join(" ")
      : [
          "Sei un avvocato Senior esperto in Crisi d'Impresa (CCII).",
          "Redigi l'atto richiesto esclusivamente in italiano e in formato Markdown.",
          "Usa i dati del cliente, i documenti interni e la giurisprudenza/normativa recuperata.",
          "Mantieni tono formale, analitico e professionale.",
          "Quando richiami norme o arresti giurisprudenziali, cita soltanto le fonti presenti nel contesto fornito.",
          "Se il fascicolo presenta lacune documentali, evidenziale in un paragrafo finale denominato 'Cautele e integrazioni istruttorie'.",
          "Non inventare fatti non presenti nel fascicolo.",
          "Usa intestazioni Markdown coerenti con la struttura richiesta.",
        ].join(" ");

    const userPrompt = [
      `ATTO DA REDIGERE: ${requestedDocument.title}`,
      `DESCRIZIONE OPERATIVA: ${requestedDocument.subtitle}`,
      "",
      "DATI CLIENTE",
      `- Ragione sociale: ${practice.client.company_name}`,
      `- Partita IVA: ${practice.client.vat_number ?? "non disponibile"}`,
      `- Sede: ${practice.client.address ?? "non disponibile"}`,
      "",
      "DATI PRATICA",
      `- Tipologia: ${practice.type}`,
      `- Stato: ${practice.status}`,
      `- ID pratica: ${practice.id}`,
      "",
      "COPERTURA DOCUMENTALE",
      `- Categorie mancanti: ${
        missingCategories.length > 0
          ? missingCategories.join(", ")
          : "nessuna"
      }`,
      `- Documenti con testo disponibile: ${documentsWithText.length}`,
      "",
      "TESTI ESTRATTI DAL FASCICOLO",
      documentContext,
      "",
      "FONTI RECUPERATE DALLA KNOWLEDGE BASE",
      legalSources.aggregatedContext || "Nessuna fonte vettoriale trovata.",
      "",
      "STRUTTURA ATTESA",
      ...requestedDocument.sections.map((section, index) => `- ${index + 1}. ${section}`),
      "",
      "ISTRUZIONI REDAZIONALI",
      "- Fornisci intestazione, premessa fattuale, analisi giuridica, conclusioni e richieste operative coerenti con il tipo di atto.",
      "- Organizza il documento usando i titoli della sezione 'STRUTTURA ATTESA' come heading Markdown di secondo livello (##).",
      "- Evidenzia i punti che richiedono conferma o integrazione documentale.",
      "- Non usare placeholder generici del tipo [NOME CLIENTE] se l'informazione e gia disponibile.",
    ].join("\n");

    const result = streamText({
      model: google("gemini-3.1-pro-preview"),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.2,
      maxOutputTokens: 8192,
      abortSignal: request.signal,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore inatteso durante la generazione dell'atto.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

