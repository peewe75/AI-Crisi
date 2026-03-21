"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useCompletion } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import {
  Archive,
  ClipboardList,
  Download,
  FileText,
  Landmark,
  Loader2,
  MessagesSquare,
  RefreshCcw,
  Save,
  Scale,
  ShieldCheck,
  Sparkles,
  StopCircle,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createGeneratedActFilename,
  DOCUMENT_GENERATION_OPTIONS,
  getDocumentGenerationOption,
  isDocumentGenerationType,
  type DocumentGenerationType,
} from "@/lib/ai/officina";
import { cn } from "@/lib/utils";
import type { PracticeGeneratedActRecord } from "@/lib/practices";

type DocumentWorkshopProps = {
  practiceId: string;
  practiceLabel: string;
  companyName: string;
  missingCategories: string[];
  availableDocumentCount: number;
  initialActs: PracticeGeneratedActRecord[];
};

type DraftState = {
  documentType: DocumentGenerationType;
  content: string;
  generatedAt: string;
};

type FeedbackState = {
  kind: "success" | "error";
  text: string;
} | null;

const iconByType: Record<DocumentGenerationType, typeof Sparkles> = {
  Parere_Strategico: Sparkles,
  Parere_Creditori_Erario: Landmark,
  Ricorso_Misure_Protettive: Scale,
  Istanza_Proroga_Misure_Protettive: ShieldCheck,
  Memoria_Integrativa_Tribunale: ClipboardList,
  Piano_Risanamento_Operativo: TrendingUp,
  Lettera_Creditori_Strategici: MessagesSquare,
  Verbale_Avanzamento_Trattative: FileText,
};

const markdownComponents = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="mt-8 border-b border-slate-200 pb-2 text-2xl font-semibold text-slate-950">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="mt-6 text-xl font-semibold text-slate-900">{children}</h3>
  ),
  p: ({ children }: { children?: ReactNode }) => (
    <p className="whitespace-pre-wrap text-slate-700">{children}</p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="list-disc space-y-2 pl-6 text-slate-700">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="list-decimal space-y-2 pl-6 text-slate-700">{children}</ol>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="border-l-4 border-emerald-300 bg-emerald-50/60 px-4 py-2 italic text-slate-700">
      {children}
    </blockquote>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-slate-950">{children}</strong>
  ),
  code: ({ children }: { children?: ReactNode }) => (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm text-slate-900">
      {children}
    </code>
  ),
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getNextVersion(
  acts: PracticeGeneratedActRecord[],
  documentType: DocumentGenerationType
) {
  return (
    acts
      .filter((act) => act.document_type === documentType)
      .reduce((maxVersion, act) => Math.max(maxVersion, act.version), 0) + 1
  );
}

function sortActs(acts: PracticeGeneratedActRecord[]) {
  return [...acts].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "active" ? -1 : 1;
    }

    if (left.created_at !== right.created_at) {
      return (
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime()
      );
    }

    return right.version - left.version;
  });
}

function downloadInlineMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function triggerBrowserDownload(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

async function downloadFromResponse(response: Response) {
  if (!response.ok) {
    let message = "Export non riuscito.";

    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // ignore JSON parse failures on binary/error responses
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const utf8NameMatch = disposition.match(/filename\\*=UTF-8''([^;]+)/i);
  const asciiNameMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
  const filename = utf8NameMatch
    ? decodeURIComponent(utf8NameMatch[1])
    : asciiNameMatch?.[1] ?? "atto";
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function DocumentWorkshop({
  practiceId,
  practiceLabel,
  companyName,
  missingCategories,
  availableDocumentCount,
  initialActs,
}: DocumentWorkshopProps) {
  const [selectedType, setSelectedType] =
    useState<DocumentGenerationType>("Parere_Strategico");
  const [savedActs, setSavedActs] = useState<PracticeGeneratedActRecord[]>(
    sortActs(initialActs)
  );
  const [selectedSavedActId, setSelectedSavedActId] = useState<string | null>(
    initialActs.find((act) => act.status === "active")?.id ??
      initialActs[0]?.id ??
      null
  );
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null);

  const { completion, complete, isLoading, stop, error, setCompletion } =
    useCompletion({
      api: "/api/generate-document",
      experimental_throttle: 50,
      streamProtocol: "text",
      onFinish: (_prompt, finalCompletion) => {
        const content = finalCompletion.trim();

        if (!content) {
          setFeedback({
            kind: "error",
            text: "La generazione si e conclusa senza produrre testo utilizzabile.",
          });
          return;
        }

        setDraft({
          documentType: selectedType,
          content,
          generatedAt: new Date().toISOString(),
        });
        setSelectedSavedActId(null);
        setFeedback({
          kind: "success",
          text: "Bozza generata. Salvala nel fascicolo oppure scaricala in Markdown.",
        });
      },
      onError: (generationError) => {
        setFeedback({ kind: "error", text: generationError.message });
      },
    });

  useEffect(() => {
    if (
      selectedSavedActId &&
      !savedActs.some((act) => act.id === selectedSavedActId)
    ) {
      setSelectedSavedActId(savedActs[0]?.id ?? null);
    }
  }, [savedActs, selectedSavedActId]);

  const selectedOption = useMemo(
    () => getDocumentGenerationOption(selectedType),
    [selectedType]
  );

  const selectedSavedAct = useMemo(
    () => savedActs.find((act) => act.id === selectedSavedActId) ?? null,
    [savedActs, selectedSavedActId]
  );

  const activeActs = useMemo(
    () => savedActs.filter((act) => act.status === "active"),
    [savedActs]
  );
  const archivedActs = useMemo(
    () => savedActs.filter((act) => act.status === "archived"),
    [savedActs]
  );

  const draftType = draft?.documentType ?? selectedType;
  const draftContent = isLoading ? completion : draft?.content ?? "";
  const canSaveDraft = Boolean(
    !isLoading && draft && draft.content.trim().length > 0
  );
  const displayedMode = selectedSavedAct
    ? "saved"
    : draftContent
      ? "draft"
      : "empty";
  const displayedTitle = selectedSavedAct
    ? selectedSavedAct.title
    : draft
      ? `${getDocumentGenerationOption(draftType).title} · bozza non salvata`
      : selectedOption.title;
  const displayedContent = selectedSavedAct?.content_markdown ?? draftContent;
  const nextDraftVersion = getNextVersion(savedActs, draftType);

  async function handleGenerate(documentType: DocumentGenerationType) {
    setFeedback(null);
    setSelectedType(documentType);
    setSelectedSavedActId(null);
    setDraft(null);
    setCompletion("");

    await complete(`Genera ${documentType}`, {
      body: {
        practiceId,
        documentType,
      },
    });
  }

  async function handleSaveDraft() {
    if (!draft || !draft.content.trim()) {
      return;
    }

    try {
      setIsSaving(true);
      setFeedback(null);

      const response = await fetch("/api/generated-acts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          practiceId,
          documentType: draft.documentType,
          contentMarkdown: draft.content,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { act?: PracticeGeneratedActRecord; error?: string }
        | null;

      if (!response.ok || !payload?.act) {
        throw new Error(payload?.error ?? "Salvataggio atto non riuscito.");
      }

      setSavedActs((currentActs) =>
        sortActs([payload.act as PracticeGeneratedActRecord, ...currentActs])
      );
      setSelectedSavedActId(payload.act.id);

      if (isDocumentGenerationType(payload.act.document_type)) {
        setSelectedType(payload.act.document_type);
      }

      setDraft(null);
      setCompletion("");
      setFeedback({
        kind: "success",
        text: `Atto salvato nel fascicolo come versione ${payload.act.version}.`,
      });
    } catch (saveError) {
      setFeedback({
        kind: "error",
        text:
          saveError instanceof Error
            ? saveError.message
            : "Errore inatteso durante il salvataggio dell'atto.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleArchive(
    act: PracticeGeneratedActRecord,
    nextStatus: "active" | "archived"
  ) {
    try {
      setPendingArchiveId(act.id);
      setFeedback(null);

      const response = await fetch(`/api/generated-acts/${act.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { act?: PracticeGeneratedActRecord; error?: string }
        | null;

      if (!response.ok || !payload?.act) {
        throw new Error(payload?.error ?? "Aggiornamento archivio non riuscito.");
      }

      setSavedActs((currentActs) =>
        sortActs(
          currentActs.map((currentAct) =>
            currentAct.id === payload.act?.id
              ? (payload.act as PracticeGeneratedActRecord)
              : currentAct
          )
        )
      );
      setFeedback({
        kind: "success",
        text:
          nextStatus === "archived"
            ? "Atto spostato in archivio."
            : "Atto ripristinato tra gli atti attivi.",
      });
    } catch (archiveError) {
      setFeedback({
        kind: "error",
        text:
          archiveError instanceof Error
            ? archiveError.message
            : "Errore inatteso durante l'aggiornamento dell'archivio.",
      });
    } finally {
      setPendingArchiveId(null);
    }
  }

  function handleDownloadDraft() {
    if (!draft || !draft.content.trim()) {
      return;
    }

    const filename = createGeneratedActFilename({
      companyName,
      documentType: draft.documentType,
      version: nextDraftVersion,
    });

    downloadInlineMarkdown(filename, draft.content);
  }

  function handleDownloadSaved(act: PracticeGeneratedActRecord) {
    triggerBrowserDownload(`/api/generated-acts/${act.id}/download`);
  }

  async function handleDownloadSavedFormat(
    act: PracticeGeneratedActRecord,
    format: "md" | "docx"
  ) {
    setFeedback(null);

    try {
      if (format === "md") {
        handleDownloadSaved(act);
        return;
      }

      const response = await fetch(
        `/api/generated-acts/${act.id}/download?format=${format}`
      );
      await downloadFromResponse(response);
    } catch (downloadError) {
      setFeedback({
        kind: "error",
        text:
          downloadError instanceof Error
            ? downloadError.message
            : "Errore inatteso durante il download dell'atto.",
      });
    }
  }

  async function handleDownloadDraftFormat(format: "md" | "docx") {
    if (!draft || !draft.content.trim()) {
      return;
    }

    setFeedback(null);

    try {
      if (format === "md") {
        handleDownloadDraft();
        return;
      }

      const response = await fetch("/api/generated-acts/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          markdown: draft.content,
          title: `${getDocumentGenerationOption(draft.documentType).title} · ${companyName}`,
          companyName,
          documentType: draft.documentType,
          version: nextDraftVersion,
          format,
        }),
      });

      await downloadFromResponse(response);
    } catch (downloadError) {
      setFeedback({
        kind: "error",
        text:
          downloadError instanceof Error
            ? downloadError.message
            : "Errore inatteso durante l'export della bozza.",
      });
    }
  }

  function handleSelectSavedAct(act: PracticeGeneratedActRecord) {
    setSelectedSavedActId(act.id);

    if (isDocumentGenerationType(act.document_type)) {
      setSelectedType(act.document_type);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card className="overflow-hidden border-emerald-200 bg-gradient-to-b from-emerald-50 to-white shadow-sm">
          <CardHeader className="border-b border-emerald-100 pb-4">
            <CardTitle className="text-lg text-emerald-950">
              Officina Atti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Pratica
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {companyName}
              </p>
              <p className="text-sm text-slate-600">{practiceLabel}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Documenti utili
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {availableDocumentCount}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Atti salvati
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {savedActs.length}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {DOCUMENT_GENERATION_OPTIONS.map((option) => {
                const Icon = iconByType[option.value];
                const isSelected = selectedType === option.value;
                const savedCount = savedActs.filter(
                  (act) =>
                    act.document_type === option.value && act.status === "active"
                ).length;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleGenerate(option.value)}
                    disabled={isLoading}
                    className={cn(
                      "w-full rounded-2xl border p-4 text-left transition",
                      isSelected
                        ? "border-emerald-400 bg-emerald-950 text-white shadow-lg shadow-emerald-950/10"
                        : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/60",
                      isLoading && "cursor-not-allowed opacity-70"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 rounded-xl p-2",
                          isSelected
                            ? "bg-white/10 text-white"
                            : "bg-emerald-100 text-emerald-700"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{option.title}</p>
                          {savedCount > 0 ? (
                            <Badge variant={isSelected ? "secondary" : "outline"}>
                              {savedCount}
                            </Badge>
                          ) : null}
                        </div>
                        <p
                          className={cn(
                            "mt-1 text-sm",
                            isSelected
                              ? "text-emerald-50/90"
                              : "text-slate-600"
                          )}
                        >
                          {option.subtitle}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {isLoading ? (
              <Button
                type="button"
                variant="outline"
                onClick={stop}
                className="w-full border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
              >
                <StopCircle className="mr-2 h-4 w-4" />
                Interrompi streaming
              </Button>
            ) : null}

            {missingCategories.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Copertura istruttoria incompleta</p>
                <p className="mt-1">
                  L&apos;atto verra generato comunque, ma il modello segnalera le
                  cautele necessarie.
                </p>
                <p className="mt-2 text-xs">
                  Mancano: {missingCategories.join(", ")}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="min-h-[640px] border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_38%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <CardTitle className="text-xl text-slate-950">
                  {displayedTitle}
                </CardTitle>
                <p className="mt-1 text-sm text-slate-600">
                  {displayedMode === "saved"
                    ? "Versione salvata nel fascicolo, disponibile per download e archivio."
                    : displayedMode === "draft"
                      ? "Bozza AI corrente non ancora salvata nel fascicolo."
                      : "Seleziona un tipo di atto e avvia la redazione assistita."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                      Streaming in corso
                    </>
                  ) : displayedMode === "saved" ? (
                    <>
                      <FileText className="h-4 w-4 text-emerald-700" />
                      Versione salvata
                    </>
                  ) : displayedMode === "draft" ? (
                    <>
                      <Sparkles className="h-4 w-4 text-emerald-700" />
                      Bozza pronta
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 text-emerald-700" />
                      Pronto alla generazione
                    </>
                  )}
                </div>

                {displayedMode === "draft" ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDownloadDraftFormat("md")}
                      disabled={!canSaveDraft}
                      className="border-slate-200"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      MD
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDownloadDraftFormat("docx")}
                      disabled={!canSaveDraft}
                      className="border-slate-200"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      DOCX
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={!canSaveDraft || isSaving}
                      className="bg-emerald-700 text-white hover:bg-emerald-600"
                    >
                      {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Salva nel fascicolo
                    </Button>
                  </>
                ) : null}

                {displayedMode === "saved" && selectedSavedAct ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        handleDownloadSavedFormat(selectedSavedAct, "md")
                      }
                      className="border-slate-200"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      MD
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        handleDownloadSavedFormat(selectedSavedAct, "docx")
                      }
                      className="border-slate-200"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      DOCX
                    </Button>
                    <Button
                      type="button"
                      variant={
                        selectedSavedAct.status === "archived"
                          ? "outline"
                          : "secondary"
                      }
                      onClick={() =>
                        handleToggleArchive(
                          selectedSavedAct,
                          selectedSavedAct.status === "archived"
                            ? "active"
                            : "archived"
                        )
                      }
                      disabled={pendingArchiveId === selectedSavedAct.id}
                    >
                      {pendingArchiveId === selectedSavedAct.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : selectedSavedAct.status === "archived" ? (
                        <RefreshCcw className="mr-2 h-4 w-4" />
                      ) : (
                        <Archive className="mr-2 h-4 w-4" />
                      )}
                      {selectedSavedAct.status === "archived"
                        ? "Ripristina"
                        : "Archivia"}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {feedback ? (
              <div
                className={cn(
                  "border-b px-6 py-4 text-sm",
                  feedback.kind === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                )}
              >
                {feedback.text}
              </div>
            ) : null}

            {error ? (
              <div className="border-b border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
                {error.message}
              </div>
            ) : null}

            <div className="min-h-[540px] bg-[linear-gradient(180deg,#fffdf7_0%,#ffffff_10%,#ffffff_100%)] px-6 py-8">
              {displayedContent ? (
                <article className="mx-auto max-w-4xl space-y-5 text-[15px] leading-7 text-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {getDocumentGenerationOption(draftType).title}
                    </Badge>
                    {selectedSavedAct ? (
                      <>
                        <Badge
                          variant={
                            selectedSavedAct.status === "archived"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          v{selectedSavedAct.version}
                        </Badge>
                        <Badge
                          variant={
                            selectedSavedAct.status === "archived"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {selectedSavedAct.status === "archived"
                            ? "Archiviato"
                            : "Attivo"}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          Salvato il {formatDateTime(selectedSavedAct.created_at)}
                        </span>
                      </>
                    ) : draft ? (
                      <>
                        <Badge variant="outline">v{nextDraftVersion} prevista</Badge>
                        <span className="text-xs text-slate-500">
                          Generata il {formatDateTime(draft.generatedAt)}
                        </span>
                      </>
                    ) : null}
                  </div>

                  <ReactMarkdown components={markdownComponents}>
                    {displayedContent}
                  </ReactMarkdown>
                </article>
              ) : (
                <div className="flex min-h-[460px] items-center justify-center">
                  <div className="max-w-xl text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700">
                      <Sparkles className="h-8 w-8" />
                    </div>
                    <h2 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">
                      Avvia la redazione assistita
                    </h2>
                    <p className="mt-3 text-base leading-7 text-slate-600">
                      Seleziona l&apos;atto dal pannello laterale. L&apos;Officina
                      unira i dati del fascicolo, i testi estratti dai documenti e
                      la knowledge base vettoriale per produrre una bozza
                      strutturata.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 2xl:grid-cols-2">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg text-slate-950">
                  Atti attivi
                </CardTitle>
                <p className="mt-1 text-sm text-slate-600">
                  Versioni correnti pronte per download e consultazione.
                </p>
              </div>
              <Badge variant="outline">{activeActs.length}</Badge>
            </CardHeader>
            <CardContent>
              {activeActs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titolo</TableHead>
                      <TableHead>Versione</TableHead>
                      <TableHead>Creato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeActs.map((act) => (
                      <TableRow key={act.id}>
                        <TableCell className="whitespace-normal align-top">
                          <button
                            type="button"
                            className="text-left"
                            onClick={() => handleSelectSavedAct(act)}
                          >
                            <p className="font-medium text-slate-900">
                              {act.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {isDocumentGenerationType(act.document_type)
                                ? getDocumentGenerationOption(act.document_type)
                                    .subtitle
                                : act.document_type}
                            </p>
                          </button>
                        </TableCell>
                        <TableCell>v{act.version}</TableCell>
                        <TableCell>{formatDateTime(act.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDownloadSavedFormat(act, "docx")
                              }
                            >
                              <Download className="mr-1 h-4 w-4" />
                              DOCX
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleToggleArchive(act, "archived")
                              }
                              disabled={pendingArchiveId === act.id}
                            >
                              {pendingArchiveId === act.id ? (
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                              ) : (
                                <Archive className="mr-1 h-4 w-4" />
                              )}
                              Archivia
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  Nessun atto attivo ancora salvato nel fascicolo.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg text-slate-950">
                  Archivio atti
                </CardTitle>
                <p className="mt-1 text-sm text-slate-600">
                  Versioni archiviate ma ancora consultabili e scaricabili.
                </p>
              </div>
              <Badge variant="outline">{archivedActs.length}</Badge>
            </CardHeader>
            <CardContent>
              {archivedActs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titolo</TableHead>
                      <TableHead>Versione</TableHead>
                      <TableHead>Archiviato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedActs.map((act) => (
                      <TableRow key={act.id}>
                        <TableCell className="whitespace-normal align-top">
                          <button
                            type="button"
                            className="text-left"
                            onClick={() => handleSelectSavedAct(act)}
                          >
                            <p className="font-medium text-slate-900">
                              {act.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Archiviato il{" "}
                              {formatDateTime(act.archived_at ?? act.updated_at)}
                            </p>
                          </button>
                        </TableCell>
                        <TableCell>v{act.version}</TableCell>
                        <TableCell>
                          {formatDateTime(act.archived_at ?? act.updated_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDownloadSavedFormat(act, "docx")
                              }
                            >
                              <Download className="mr-1 h-4 w-4" />
                              DOCX
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleArchive(act, "active")}
                              disabled={pendingArchiveId === act.id}
                            >
                              {pendingArchiveId === act.id ? (
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCcw className="mr-1 h-4 w-4" />
                              )}
                              Ripristina
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  Nessun atto in archivio. Le versioni archiviate compariranno
                  qui.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


