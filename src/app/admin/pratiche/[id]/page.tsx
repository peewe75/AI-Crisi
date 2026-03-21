import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Archive, Download, Eye, FileStack, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminPracticeDetail, requireAdminAccess } from "@/lib/admin";

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

export default async function AdminPracticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminAccess();
  const { id } = await params;
  const practice = await getAdminPracticeDetail(id);

  if (!practice || !practice.client) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-sm md:p-8">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm font-medium text-slate-500 transition-colors hover:text-emerald-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna al CRM globale
        </Link>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
              Pratica in sola lettura
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {practice.client.company_name}
            </h2>
            <p className="mt-2 max-w-3xl text-base text-slate-600">
              {practice.type} · stato {practice.status.toLowerCase()} · utente Clerk {practice.client.user_id}.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={`/dashboard/pratiche/${practice.id}`}>
              <Button variant="outline" className="w-full border-slate-200">
                Apri vista utente
              </Button>
            </Link>
            <Link href={`/dashboard/pratiche/${practice.id}/officina`}>
              <Button className="w-full bg-emerald-700 text-white hover:bg-emerald-600">
                <Sparkles className="mr-2 h-4 w-4" />
                Officina utente
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
              <FileStack className="h-5 w-5 text-emerald-700" />
              Cassetti documentali
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
                    <p className="font-medium text-slate-900">{document.category}</p>
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
                    <Badge variant={document.extracted_text ? "secondary" : "outline"}>
                      {document.extracted_text ? "Testo disponibile" : "Testo assente"}
                    </Badge>
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
                Nessun documento associato a questa pratica.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-xl text-slate-950">Anagrafica cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Partita IVA</p>
                <p className="mt-2 font-medium text-slate-900">
                  {practice.client.vat_number ?? "Non disponibile"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Indirizzo</p>
                <p className="mt-2 font-medium text-slate-900">
                  {practice.client.address ?? "Non disponibile"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Atti generati</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {practice.generatedActs.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
                <Archive className="h-5 w-5 text-emerald-700" />
                Ultime versioni atti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {practice.generatedActs.length > 0 ? (
                practice.generatedActs.slice(0, 6).map((act) => (
                  <div
                    key={act.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <p className="font-medium text-slate-900">{act.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <Badge variant={act.status === "archived" ? "outline" : "secondary"}>
                        {act.status === "archived" ? "Archiviato" : "Attivo"}
                      </Badge>
                      <span>v{act.version}</span>
                      <span>
                        {new Intl.DateTimeFormat("it-IT", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(act.created_at))}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  Nessun atto ancora salvato per questa pratica.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

