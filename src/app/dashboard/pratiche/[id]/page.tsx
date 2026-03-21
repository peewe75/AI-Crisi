import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, Download, Eye, FileSearch, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMissingPracticeCategories,
  getPracticeForCurrentUser,
} from "@/lib/practices";

const INLINE_ACTION_LINK_CLASS =
  "inline-flex h-7 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-slate-200 bg-background px-2.5 text-[0.8rem] font-medium text-slate-700 transition-all hover:bg-muted hover:text-foreground";

function getDocumentPreview(text: string | null) {
  if (!text) {
    return null;
  }

  return text.replace(/\s+/g, " ").trim().slice(0, 260);
}

function hasMoreDocumentText(text: string | null) {
  if (!text) {
    return false;
  }

  return text.replace(/\s+/g, " ").trim().length > 260;
}

export default async function PracticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, getToken } = await auth();

  if (!userId) {
    notFound();
  }

  const { id } = await params;
  const token = await getToken({ template: "supabase" });
  const practice = await getPracticeForCurrentUser({
    practiceId: id,
    clerkToken: token,
  });

  if (!practice || !practice.client) {
    notFound();
  }

  const missingCategories = getMissingPracticeCategories(practice.documents);
  const activeActs = practice.generatedActs.filter(
    (act) => act.status === "active"
  );
  const archivedActs = practice.generatedActs.filter(
    (act) => act.status === "archived"
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-sm md:p-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm font-medium text-slate-500 transition-colors hover:text-emerald-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna alle pratiche
        </Link>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
              Fascicolo cliente
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {practice.client.company_name}
            </h1>
            <p className="mt-2 max-w-2xl text-base text-slate-600">
              {practice.type} · stato {practice.status.toLowerCase()}.
              Questa pagina raccoglie copertura documentale e accesso diretto
              all&apos;Officina Atti.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={`/dashboard/pratiche/${practice.id}/officina`}>
              <Button className="w-full bg-emerald-700 text-white hover:bg-emerald-600">
                <Sparkles className="mr-2 h-4 w-4" />
                Apri Officina Atti
              </Button>
            </Link>
            <Link href="/dashboard/pratiche/nuova">
              <Button variant="outline" className="w-full border-slate-200">
                Carica altri documenti
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-xl text-slate-950">
              Documenti nel fascicolo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {practice.documents.length > 0 ? (
              practice.documents.map((document) => (
                <div
                  key={document.id}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {document.category}
                    </p>
                    <p className="text-sm text-slate-500">
                      {document.file_path?.split("/").pop() ?? "File senza nome"}
                    </p>
                    {getDocumentPreview(document.extracted_text) ? (
                      <div className="mt-3 max-w-2xl rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                        <p className="font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Preview testo estratto
                        </p>
                        <p className="mt-1">
                          {getDocumentPreview(document.extracted_text)}
                          {hasMoreDocumentText(document.extracted_text) ? "..." : ""}
                        </p>
                        {hasMoreDocumentText(document.extracted_text) ? (
                          <details className="mt-3">
                            <summary className="cursor-pointer font-medium text-emerald-700 transition-colors hover:text-emerald-800">
                              Mostra tutto
                            </summary>
                            <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
                              <p className="whitespace-pre-wrap break-words">
                                {document.extracted_text}
                              </p>
                            </div>
                          </details>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        document.extracted_text
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {document.extracted_text
                        ? "Testo disponibile"
                        : "Testo da estrarre"}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/api/documents/${document.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className={INLINE_ACTION_LINK_CLASS}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Apri file
                      </Link>
                      <Link
                        href={`/api/documents/${document.id}?disposition=attachment`}
                        className={INLINE_ACTION_LINK_CLASS}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Scarica
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                Nessun documento ancora associato a questa pratica.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-xl text-slate-950">
                Archivio atti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Atti attivi</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">
                    {activeActs.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Archiviati</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">
                    {archivedActs.length}
                  </p>
                </div>
              </div>

              {activeActs.length > 0 ? (
                <div className="space-y-3">
                  {activeActs.slice(0, 3).map((act) => (
                    <div
                      key={act.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <p className="font-medium text-slate-900">{act.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Versione {act.version} · salvato il{" "}
                        {new Intl.DateTimeFormat("it-IT", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(act.created_at))}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  Nessun atto ancora salvato nel fascicolo.
                </div>
              )}

              <Link href={`/dashboard/pratiche/${practice.id}/officina`}>
                <Button variant="outline" className="w-full border-slate-200">
                  <Archive className="mr-2 h-4 w-4" />
                  Gestisci versioni e archivio
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-xl text-slate-950">
                Prontezza RAG
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Documenti caricati</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {practice.documents.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Cassetti mancanti</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {missingCategories.length}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {missingCategories.length > 0
                    ? missingCategories.join(", ")
                    : "Copertura completa dei 7 cassetti."}
                </p>
              </div>

              <Link href={`/dashboard/pratiche/${practice.id}/officina`}>
                <Button className="w-full bg-slate-950 text-white hover:bg-slate-800">
                  <FileSearch className="mr-2 h-4 w-4" />
                  Genera atto con AI
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

