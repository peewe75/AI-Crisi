import "server-only";

import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import * as cheerio from "cheerio";
import { createKnowledgeBaseEmbedding } from "@/lib/ai/embedding";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const IL_CASO_CRISI_IMPRESA_URL = "https://www.ilcaso.it/riviste/CrisiImpresa";
const SCRAPE_LIMIT = 3;
const JOB_NAME = "sync-giurisprudenza-ilcaso";
const MIN_SYNC_INTERVAL_MS = 48 * 60 * 60 * 1000;
const REQUEST_HEADERS = {
  "user-agent":
    "AI-Crisi-Bot/1.0 (+https://ai-crisi.vercel.app; monitoring giurisprudenza)",
  accept: "text/html,application/xhtml+xml",
};
const LEGAL_SUMMARY_MODEL = "gemini-3.1-pro-preview";

type ScrapedDecisionPreview = {
  sourceId: string;
  title: string;
  url: string;
  publicationLabel: string | null;
  decisionLabel: string | null;
};

type ScrapedDecision = ScrapedDecisionPreview & {
  rawText: string;
};

type SyncLogItem = {
  sourceId: string;
  title: string;
  url: string;
  status: "inserted" | "skipped" | "failed";
  reason?: string;
};

type BackgroundSyncStatus =
  | "running"
  | "success"
  | "skipped_interval"
  | "failed";

type SyncGiurisprudenzaResult = {
  jobName: string;
  runStatus: BackgroundSyncStatus;
  skippedDueToInterval: boolean;
  lastSuccessfulSyncAt: string | null;
  nextEligibleSyncAt: string | null;
  sourceUrl: string;
  fetchedCount: number;
  pendingCount: number;
  insertedCount: number;
  skippedCount: number;
  failedCount: number;
  logs: SyncLogItem[];
};

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toIsoString(date: Date | null) {
  return date ? date.toISOString() : null;
}

function toAbsoluteIlCasoUrl(value: string) {
  return new URL(value, IL_CASO_CRISI_IMPRESA_URL).toString();
}

function normalizeDecisionTitle(value: string) {
  return compactWhitespace(value.replace(/\s+Leggi\.$/i, "").replace(/\.$/, ""));
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Fetch fallita (${response.status}) su ${url}`);
  }

  return response.text();
}

function extractDecisionPreviews(html: string) {
  const $ = cheerio.load(html);
  const section = $("section")
    .filter((_, element) =>
      compactWhitespace($(element).find("h2.section-title").text()).includes(
        "Ultime Pubblicate"
      )
    )
    .first();

  if (!section.length) {
    throw new Error(
      "Sezione 'Ultime Pubblicate' non trovata nella pagina CrisiImpresa."
    );
  }

  const seenUrls = new Set<string>();
  const previews: ScrapedDecisionPreview[] = [];

  section.find("li").each((_, element) => {
    if (previews.length >= SCRAPE_LIMIT) {
      return false;
    }

    const anchor = $(element)
      .find('a[href*="/sentenze/ultime/"][href*="CrisiImpresa"]')
      .first();

    if (!anchor.length) {
      return;
    }

    const href = anchor.attr("href");
    if (!href) {
      return;
    }

    const url = toAbsoluteIlCasoUrl(href);

    if (seenUrls.has(url)) {
      return;
    }

    const sourceIdMatch = url.match(/\/sentenze\/ultime\/(\d+)\//i);
    if (!sourceIdMatch) {
      return;
    }

    const decisionLabel = compactWhitespace(anchor.find(".testoBlu").text()) || null;
    const anchorClone = anchor.clone();
    anchorClone.find(".testoBlu").remove();
    const title = normalizeDecisionTitle(anchorClone.text());

    if (!title) {
      return;
    }

    previews.push({
      sourceId: sourceIdMatch[1],
      title,
      url,
      publicationLabel:
        compactWhitespace($(element).find(".entry-data").first().text()) || null,
      decisionLabel,
    });
    seenUrls.add(url);
  });

  return previews;
}

function extractDecisionText(html: string, preview: ScrapedDecisionPreview) {
  const $ = cheerio.load(html);
  const container = $('#primary div[style*="font-size: 18px"]').first().clone();

  if (!container.length) {
    throw new Error(`Contenuto decisione non trovato per ${preview.url}`);
  }

  container.find("script, style, ins, button, iframe").remove();
  container.find("div").remove();
  container.find('a[href$=".pdf"]').remove();

  const header = compactWhitespace(container.find("h6").first().text());
  const title = compactWhitespace(container.find("h5").first().text()) || preview.title;
  const paragraphs = container
    .find("p")
    .toArray()
    .map((element) => compactWhitespace($(element).text()))
    .filter(
      (paragraph) =>
        paragraph.length > 0 &&
        !/^Testo Integrale$/i.test(paragraph) &&
        !/riproduzione riservata/i.test(paragraph)
    );

  const rawText = [
    header,
    title,
    preview.publicationLabel ? `Pubblicazione: ${preview.publicationLabel}` : null,
    preview.decisionLabel ? `Decisione: ${preview.decisionLabel}` : null,
    `Fonte: ${preview.url}`,
    ...paragraphs,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!rawText.trim()) {
    throw new Error(`Testo decisione vuoto per ${preview.url}`);
  }

  return rawText;
}

async function fetchDecision(preview: ScrapedDecisionPreview): Promise<ScrapedDecision> {
  const html = await fetchHtml(preview.url);
  return {
    ...preview,
    rawText: extractDecisionText(html, preview),
  };
}

async function listExistingDecisionKeys() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("knowledge_base")
    .select("title, metadata")
    .eq("category", "Giurisprudenza")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(
      `Lettura knowledge_base per deduplica fallita: ${error.message}`
    );
  }

  const seenTitles = new Set<string>();
  const seenSourceIds = new Set<string>();
  const seenUrls = new Set<string>();

  for (const row of data ?? []) {
    if (typeof row.title === "string" && row.title.trim()) {
      seenTitles.add(row.title.trim().toLowerCase());
    }

    const metadata =
      row.metadata && typeof row.metadata === "object" ? row.metadata : null;

    const sourceId =
      metadata &&
      "source_id" in metadata &&
      typeof metadata.source_id === "string" &&
      metadata.source_id.trim()
        ? metadata.source_id.trim()
        : null;
    const sourceUrl =
      metadata &&
      "source_url" in metadata &&
      typeof metadata.source_url === "string" &&
      metadata.source_url.trim()
        ? metadata.source_url.trim()
        : null;

    if (sourceId) {
      seenSourceIds.add(sourceId);
    }

    if (sourceUrl) {
      seenUrls.add(sourceUrl);
    }
  }

  return { seenTitles, seenSourceIds, seenUrls };
}

async function getLatestSuccessfulSyncRun() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("background_sync_runs")
    .select("id, finished_at, metadata")
    .eq("job_name", JOB_NAME)
    .eq("status", "success")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Lettura ultimo run background_sync_runs fallita: ${error.message}`
    );
  }

  return data;
}

async function createBackgroundSyncRun(params: {
  status: BackgroundSyncStatus;
  startedAt?: string;
  finishedAt?: string | null;
  insertedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("background_sync_runs")
    .insert({
      job_name: JOB_NAME,
      status: params.status,
      started_at: params.startedAt ?? new Date().toISOString(),
      finished_at: params.finishedAt ?? null,
      inserted_count: params.insertedCount ?? 0,
      skipped_count: params.skippedCount ?? 0,
      failed_count: params.failedCount ?? 0,
      metadata: params.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(
      `Creazione run background_sync_runs fallita: ${error.message}`
    );
  }

  return data.id as string;
}

async function updateBackgroundSyncRun(params: {
  runId: string;
  status: BackgroundSyncStatus;
  finishedAt?: string;
  insertedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("background_sync_runs")
    .update({
      status: params.status,
      finished_at: params.finishedAt ?? new Date().toISOString(),
      inserted_count: params.insertedCount ?? 0,
      skipped_count: params.skippedCount ?? 0,
      failed_count: params.failedCount ?? 0,
      metadata: params.metadata ?? {},
    })
    .eq("id", params.runId);

  if (error) {
    throw new Error(
      `Aggiornamento run background_sync_runs fallito: ${error.message}`
    );
  }
}

async function rewriteDecisionAsMarkdown(decision: ScrapedDecision) {
  const prompt = [
    `TITOLO: ${decision.title}`,
    decision.publicationLabel
      ? `DATA PUBBLICAZIONE: ${decision.publicationLabel}`
      : null,
    decision.decisionLabel ? `DECISIONE: ${decision.decisionLabel}` : null,
    `URL FONTE: ${decision.url}`,
    "",
    "TESTO GREZZO DELLA PRONUNCIA",
    decision.rawText,
  ]
    .filter(Boolean)
    .join("\n");

  const { text } = await generateText({
    model: google(LEGAL_SUMMARY_MODEL),
    temperature: 0,
    maxOutputTokens: 2048,
    system:
      "Sei un Legal Data Engineer. Estrai dal testo fornito la Massima e le Norme Citate. Restituisci rigorosamente un output Markdown con i titoli: ### METADATI, ### MASSIMA, ### NORME CITATE.",
    prompt,
  });

  const markdown = text.trim();

  if (!markdown.includes("### METADATI") || !markdown.includes("### MASSIMA")) {
    throw new Error(
      `Output Gemini non conforme per la decisione ${decision.sourceId}.`
    );
  }

  return markdown;
}

async function insertDecisionInKnowledgeBase(params: {
  decision: ScrapedDecision;
  formattedMarkdown: string;
}) {
  const supabase = getSupabaseAdminClient();
  const embedding = await createKnowledgeBaseEmbedding({
    value: params.formattedMarkdown,
    taskType: "RETRIEVAL_DOCUMENT",
  });

  const { error } = await supabase.from("knowledge_base").insert({
    title: params.decision.title,
    content: params.formattedMarkdown,
    category: "Giurisprudenza",
    embedding,
    metadata: {
      ingest_mode: "cron-sync",
      source: "ilcaso.it",
      source_section: "CrisiImpresa",
      source_id: params.decision.sourceId,
      source_url: params.decision.url,
      publication_label: params.decision.publicationLabel,
      decision_label: params.decision.decisionLabel,
      scraped_at: new Date().toISOString(),
      model_rewrite: LEGAL_SUMMARY_MODEL,
    },
  });

  if (error) {
    throw new Error(
      `Inserimento knowledge_base fallito per ${params.decision.sourceId}: ${error.message}`
    );
  }
}

export async function syncGiurisprudenzaFromIlCaso(): Promise<SyncGiurisprudenzaResult> {
  const latestSuccess = await getLatestSuccessfulSyncRun();
  const lastSuccessfulSyncAt = latestSuccess?.finished_at
    ? new Date(latestSuccess.finished_at)
    : null;
  const nextEligibleSyncAt = lastSuccessfulSyncAt
    ? new Date(lastSuccessfulSyncAt.getTime() + MIN_SYNC_INTERVAL_MS)
    : null;
  const now = new Date();

  if (nextEligibleSyncAt && nextEligibleSyncAt.getTime() > now.getTime()) {
    await createBackgroundSyncRun({
      status: "skipped_interval",
      startedAt: now.toISOString(),
      finishedAt: now.toISOString(),
      metadata: {
        source_url: IL_CASO_CRISI_IMPRESA_URL,
        last_successful_sync_at: toIsoString(lastSuccessfulSyncAt),
        next_eligible_sync_at: toIsoString(nextEligibleSyncAt),
        reason: "Ultimo run riuscito avvenuto meno di 48 ore fa.",
      },
    });

    return {
      jobName: JOB_NAME,
      runStatus: "skipped_interval",
      skippedDueToInterval: true,
      lastSuccessfulSyncAt: toIsoString(lastSuccessfulSyncAt),
      nextEligibleSyncAt: toIsoString(nextEligibleSyncAt),
      sourceUrl: IL_CASO_CRISI_IMPRESA_URL,
      fetchedCount: 0,
      pendingCount: 0,
      insertedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      logs: [],
    };
  }

  const runStartedAt = new Date().toISOString();
  const runId = await createBackgroundSyncRun({
    status: "running",
    startedAt: runStartedAt,
    metadata: {
      source_url: IL_CASO_CRISI_IMPRESA_URL,
      last_successful_sync_at: toIsoString(lastSuccessfulSyncAt),
    },
  });

  try {
    const previewHtml = await fetchHtml(IL_CASO_CRISI_IMPRESA_URL);
    const previews = extractDecisionPreviews(previewHtml);
    const existingKeys = await listExistingDecisionKeys();
    const logs: SyncLogItem[] = [];

    const pending = previews.filter((preview) => {
      if (
        existingKeys.seenSourceIds.has(preview.sourceId) ||
        existingKeys.seenUrls.has(preview.url) ||
        existingKeys.seenTitles.has(preview.title.toLowerCase())
      ) {
        logs.push({
          sourceId: preview.sourceId,
          title: preview.title,
          url: preview.url,
          status: "skipped",
          reason: "Pronuncia gia presente in knowledge_base.",
        });
        return false;
      }

      return true;
    });

    let insertedCount = 0;

    for (const preview of pending) {
      try {
        const decision = await fetchDecision(preview);
        const formattedMarkdown = await rewriteDecisionAsMarkdown(decision);
        await insertDecisionInKnowledgeBase({ decision, formattedMarkdown });

        logs.push({
          sourceId: preview.sourceId,
          title: preview.title,
          url: preview.url,
          status: "inserted",
        });
        insertedCount += 1;
      } catch (error) {
        logs.push({
          sourceId: preview.sourceId,
          title: preview.title,
          url: preview.url,
          status: "failed",
          reason:
            error instanceof Error
              ? error.message
              : "Errore sconosciuto durante la sincronizzazione.",
        });
      }

      await sleep(250);
    }

    const skippedCount = logs.filter((log) => log.status === "skipped").length;
    const failedCount = logs.filter((log) => log.status === "failed").length;
    const finishedAt = new Date().toISOString();

    await updateBackgroundSyncRun({
      runId,
      status: "success",
      finishedAt,
      insertedCount,
      skippedCount,
      failedCount,
      metadata: {
        source_url: IL_CASO_CRISI_IMPRESA_URL,
        fetched_count: previews.length,
        pending_count: pending.length,
        last_successful_sync_at: finishedAt,
      },
    });

    return {
      jobName: JOB_NAME,
      runStatus: "success",
      skippedDueToInterval: false,
      lastSuccessfulSyncAt: finishedAt,
      nextEligibleSyncAt: toIsoString(
        new Date(new Date(finishedAt).getTime() + MIN_SYNC_INTERVAL_MS)
      ),
      sourceUrl: IL_CASO_CRISI_IMPRESA_URL,
      fetchedCount: previews.length,
      pendingCount: pending.length,
      insertedCount,
      skippedCount,
      failedCount,
      logs,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Errore fatale durante la sincronizzazione giurisprudenziale.";

    await updateBackgroundSyncRun({
      runId,
      status: "failed",
      finishedAt: new Date().toISOString(),
      metadata: {
        source_url: IL_CASO_CRISI_IMPRESA_URL,
        error: errorMessage,
      },
    });

    throw error;
  }
}
