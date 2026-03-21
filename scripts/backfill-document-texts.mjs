import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { PDFParse } from "pdf-parse";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    process.env[line.slice(0, idx)] = line.slice(idx + 1);
  }
}

function normalizeExtractedText(text) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractText(bytes) {
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return normalizeExtractedText(result.text ?? "");
  } finally {
    await parser.destroy();
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

const { data: documents, error } = await supabase
  .from("documents")
  .select("id, file_path")
  .is("extracted_text", null)
  .not("file_path", "is", null);

if (error) {
  throw new Error(`Lettura documenti fallita: ${error.message}`);
}

for (const document of documents ?? []) {
  const { data, error: downloadError } = await supabase.storage
    .from("practice_documents")
    .download(document.file_path);

  if (downloadError) {
    console.error(
      `[skip] ${document.id} download fallito: ${downloadError.message}`
    );
    continue;
  }

  const extractedText = await extractText(new Uint8Array(await data.arrayBuffer()));
  const { error: updateError } = await supabase
    .from("documents")
    .update({ extracted_text: extractedText || null })
    .eq("id", document.id);

  if (updateError) {
    console.error(
      `[skip] ${document.id} update fallito: ${updateError.message}`
    );
    continue;
  }

  console.log(
    `[ok] ${document.id} testo estratto (${extractedText.length} caratteri)`
  );
}
