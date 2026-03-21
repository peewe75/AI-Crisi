"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Square, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CATEGORY_OPTIONS = [
  "Giurisprudenza",
  "Normativa",
  "Template",
  "Skill",
] as const;
const IMPORT_MODE_OPTIONS = [
  { value: "paste", label: "Incolla Markdown" },
  { value: "files", label: "Import file .md/.txt" },
] as const;
const ALLOWED_FILE_EXTENSIONS = [".md", ".markdown", ".txt"];

type IngestResponse = {
  totalChunks: number;
  processedCount: number;
  failedCount: number;
  insertedTitles: string[];
  errors: Array<{ index: number; sourceFile: string | null; message: string }>;
};
type UploadDocument = {
  filename: string;
  content: string;
  size: number;
};

async function readFileWithEncodingFallback(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export default function KnowledgeBaseUploadForm() {
  const router = useRouter();
  const [markdownText, setMarkdownText] = useState("");
  const [category, setCategory] =
    useState<(typeof CATEGORY_OPTIONS)[number]>("Giurisprudenza");
  const [importMode, setImportMode] =
    useState<(typeof IMPORT_MODE_OPTIONS)[number]["value"]>("paste");
  const [documents, setDocuments] = useState<UploadDocument[]>([]);
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  async function loadFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }

    const loaded = await Promise.all(
      files.map(async (file) => ({
        filename: file.name,
        content: await readFileWithEncodingFallback(file),
        size: file.size,
      }))
    );

    setDocuments((currentDocuments) => {
      const nextDocuments = [...currentDocuments];

      for (const entry of loaded) {
        if (!entry.content.trim().length) {
          continue;
        }

        const alreadyPresent = nextDocuments.some(
          (document) =>
            document.filename === entry.filename && document.size === entry.size
        );

        if (!alreadyPresent) {
          nextDocuments.push(entry);
        }
      }

      return nextDocuments;
    });
  }

  function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    void handleIncomingFiles(files);
    event.target.value = "";
  }

  function validateFile(file: File) {
    const lowercaseName = file.name.toLowerCase();
    const isAllowed = ALLOWED_FILE_EXTENSIONS.some((extension) =>
      lowercaseName.endsWith(extension)
    );

    if (!isAllowed) {
      return `Formato non supportato per ${file.name}. Usa file .md, .markdown o .txt.`;
    }

    return null;
  }

  async function handleIncomingFiles(files: File[]) {
    if (isSubmitting) {
      return;
    }

    const allowedFiles: File[] = [];
    let firstError: string | null = null;

    for (const file of files) {
      const validationError = validateFile(file);

      if (validationError) {
        firstError ??= validationError;
        continue;
      }

      allowedFiles.push(file);
    }

    if (firstError) {
      setError(firstError);
    } else {
      setError(null);
    }

    await loadFiles(allowedFiles);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (!isSubmitting) {
      setIsDragActive(true);
    }
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);

    void handleIncomingFiles(Array.from(event.dataTransfer.files ?? []));
  }

  function removeDocument(filename: string, size: number) {
    setDocuments((currentDocuments) =>
      currentDocuments.filter(
        (document) =>
          !(document.filename === filename && document.size === size)
      )
    );
  }

  function mergeIngestResponses(
    accumulator: IngestResponse,
    next: IngestResponse
  ): IngestResponse {
    return {
      totalChunks: accumulator.totalChunks + next.totalChunks,
      processedCount: accumulator.processedCount + next.processedCount,
      failedCount: accumulator.failedCount + next.failedCount,
      insertedTitles: [...accumulator.insertedTitles, ...next.insertedTitles],
      errors: [...accumulator.errors, ...next.errors],
    };
  }

  async function sendIngestRequest(payload: {
    markdownText: string;
    documents: UploadDocument[];
    category: (typeof CATEGORY_OPTIONS)[number];
  }) {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const response = await fetch("/api/admin/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const resultPayload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        typeof resultPayload?.error === "string"
          ? resultPayload.error
          : "Errore durante l'elaborazione della knowledge base."
      );
    }

    return resultPayload as IngestResponse;
  }

  async function handleSubmit() {
    setError(null);
    setResult(null);
    setIsSubmitting(true);

    const emptyResult: IngestResponse = {
      totalChunks: 0,
      processedCount: 0,
      failedCount: 0,
      insertedTitles: [],
      errors: [],
    };
    let aggregateResult = emptyResult;

    try {
      if (importMode === "paste") {
        aggregateResult = await sendIngestRequest({
          markdownText,
          documents: [],
          category,
        });
      } else {
        for (const document of documents) {
          const response = await sendIngestRequest({
            markdownText: "",
            documents: [document],
            category,
          });

          aggregateResult = mergeIngestResponses(aggregateResult, response);
        }
      }

      setResult(aggregateResult);
      router.refresh();

      if (importMode === "paste") {
        setMarkdownText("");
      } else {
        setDocuments([]);
      }
    } catch (requestError) {
      if (
        requestError instanceof DOMException &&
        requestError.name === "AbortError"
      ) {
        setError(
          "Caricamento interrotto dall'utente. I file gia completati restano importati."
        );
        if (aggregateResult.totalChunks > 0) {
          setResult(aggregateResult);
        }
        router.refresh();
      } else {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Errore inatteso durante l'ingestione della knowledge base."
        );
      }
    } finally {
      abortControllerRef.current = null;
      setIsSubmitting(false);
    }
  }

  function handleStopUpload() {
    abortControllerRef.current?.abort();
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/70">
        <CardTitle className="text-xl text-slate-950">Nuovo Inserimento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.45fr]">
          <div className="space-y-5">
            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Modalita di import
              </span>
              <div className="grid gap-3">
                {IMPORT_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setImportMode(option.value)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      importMode === option.value
                        ? "border-emerald-400 bg-emerald-50 text-emerald-950"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"
                    }`}
                  >
                    <p className="font-medium">{option.label}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {option.value === "paste"
                        ? "Ideale per sentenze o template gia formattati in Markdown."
                        : "Carica uno o piu file testuali e chunkali automaticamente."}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="kb-category"
                className="text-sm font-medium text-slate-700"
              >
                Categoria
              </label>
              <select
                id="kb-category"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as (typeof CATEGORY_OPTIONS)[number])
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  (importMode === "paste"
                    ? !markdownText.trim()
                    : documents.length === 0)
                }
                className="w-full bg-emerald-700 text-white hover:bg-emerald-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Elaborazione in corso
                  </>
                ) : (
                  "Elabora e Salva nel Vector DB"
                )}
              </Button>

              {isSubmitting ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleStopUpload}
                  className="w-full border-rose-200 text-rose-700 hover:bg-rose-50"
                >
                  <Square className="mr-2 h-4 w-4 fill-current" />
                  Stop
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            {importMode === "paste" ? (
              <div className="space-y-2">
                <label
                  htmlFor="kb-markdown"
                  className="text-sm font-medium text-slate-700"
                >
                  Testo Markdown
                </label>
                <textarea
                  id="kb-markdown"
                  value={markdownText}
                  onChange={(event) => setMarkdownText(event.target.value)}
                  placeholder="# Titolo documento\nTesto...\n---\n# Titolo documento successivo\nTesto..."
                  className="min-h-[420px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-sm font-medium text-slate-700">
                  File Markdown o testo
                </span>
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
                  <input
                    id="kb-file-input"
                    type="file"
                    multiple
                    className="hidden"
                    accept={ALLOWED_FILE_EXTENSIONS.join(",")}
                    onChange={handleFileSelection}
                  />
                  <div
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center gap-3 rounded-2xl border px-6 py-12 text-center transition ${
                      isDragActive
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40"
                    } ${isSubmitting ? "cursor-not-allowed opacity-70" : ""}`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {isDragActive
                          ? "Rilascia qui i file per importarli"
                          : "Trascina qui i file oppure usa il selettore"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Ogni file puo contenere uno o piu documenti separati da `---`.
                      </p>
                    </div>
                    <label
                      htmlFor="kb-file-input"
                      className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Sfoglia file
                    </label>
                  </div>
                </div>

                {documents.length > 0 ? (
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-medium text-slate-700">
                      File pronti all'import
                    </p>
                    <div className="space-y-2">
                      {documents.map((document) => (
                        <div
                          key={`${document.filename}-${document.size}`}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2 text-slate-700">
                            <FileText className="h-4 w-4 text-emerald-700" />
                            <span className="break-all">{document.filename}</span>
                          </div>
                          <div className="ml-3 flex items-center gap-2">
                            <span className="text-xs text-slate-500">
                              {(document.size / 1024).toFixed(1)} KB
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                removeDocument(document.filename, document.size)
                              }
                              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                              aria-label={`Rimuovi ${document.filename}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
            <p className="font-semibold">
              Elaborati {result.processedCount} documenti su {result.totalChunks}.
            </p>
            <p>Chunk falliti: {result.failedCount}</p>

            {result.insertedTitles.length > 0 ? (
              <div>
                <p className="font-medium">Titoli inseriti:</p>
                <ul className="mt-2 list-disc pl-5">
                  {result.insertedTitles.map((title, index) => (
                    <li key={`${index}-${title}`}>{title}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {result.errors.length > 0 ? (
              <div>
                <p className="font-medium">Errori chunk:</p>
                <ul className="mt-2 list-disc pl-5">
                  {result.errors.map((item) => (
                    <li key={`${item.index}-${item.sourceFile}-${item.message}`}>
                      Blocco {item.index + 1}
                      {item.sourceFile ? ` (${item.sourceFile})` : ""}: {item.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
