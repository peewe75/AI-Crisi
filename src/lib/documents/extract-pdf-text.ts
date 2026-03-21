import "server-only";

import { PDFParse } from "pdf-parse";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const STORAGE_BUCKET = "practice_documents";

function normalizeExtractedText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractPdfTextFromBytes(bytes: Uint8Array) {
  const parser = new PDFParse({ data: bytes });

  try {
    const result = await parser.getText();
    return normalizeExtractedText(result.text ?? "");
  } finally {
    await parser.destroy();
  }
}

function normalizeTextFileContent(bytes: Uint8Array) {
  try {
    return normalizeExtractedText(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    );
  } catch {
    return normalizeExtractedText(new TextDecoder("windows-1252").decode(bytes));
  }
}

export async function extractDocumentTextFromStoragePath(filePath: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(filePath);

  if (error) {
    throw new Error(`Download PDF fallito: ${error.message}`);
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  const lowerPath = filePath.toLowerCase();

  if (lowerPath.endsWith(".txt") || lowerPath.endsWith(".md")) {
    return normalizeTextFileContent(bytes);
  }

  return extractPdfTextFromBytes(bytes);
}
