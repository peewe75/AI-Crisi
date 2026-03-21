import Link from "next/link";
import { Eye, FolderKanban, ShieldCheck } from "lucide-react";
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
import { listAdminPractices, requireAdminAccess } from "@/lib/admin";
import { PRACTICE_DOCUMENT_CATEGORIES } from "@/lib/practices";

function buildAdminPageHref(params: {
  q: string;
  category: string;
  text: string;
  sort: string;
  pageSize: number;
  page: number;
}) {
  const searchParams = new URLSearchParams();

  if (params.q) {
    searchParams.set("q", params.q);
  }

  if (params.category) {
    searchParams.set("category", params.category);
  }

  if (params.text && params.text !== "all") {
    searchParams.set("text", params.text);
  }

  if (params.sort && params.sort !== "created_at_desc") {
    searchParams.set("sort", params.sort);
  }

  if (params.pageSize !== 25) {
    searchParams.set("perPage", String(params.pageSize));
  }

  if (params.page > 1) {
    searchParams.set("page", String(params.page));
  }

  const query = searchParams.toString();
  return query ? `/admin?${query}` : "/admin";
}

function getVisiblePageNumbers(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages]);

  for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }

  return [...pages].sort((left, right) => left - right);
}

function getSortLabel(sort: string) {
  switch (sort) {
    case "created_at_asc":
      return "Data: piu vecchie";
    case "company_name_asc":
      return "Azienda: A-Z";
    case "company_name_desc":
      return "Azienda: Z-A";
    case "status_asc":
      return "Stato: A-Z";
    case "status_desc":
      return "Stato: Z-A";
    case "created_at_desc":
    default:
      return "Data: piu recenti";
  }
}

function getExtractedTextLabel(extractedText: string) {
  switch (extractedText) {
    case "with_extracted_text":
      return "Con testo estratto";
    case "without_extracted_text":
      return "Con documenti senza testo";
    default:
      return "Tutti";
  }
}

function getStatusVariant(status: string) {
  if (status.toLowerCase() === "attiva") {
    return "secondary" as const;
  }

  if (status.toLowerCase() === "bozza") {
    return "outline" as const;
  }

  return "outline" as const;
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    text?: string;
    sort?: string;
    page?: string;
    perPage?: string;
  }>;
}) {
  await requireAdminAccess();

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const category = typeof params.category === "string" ? params.category : "";
  const extractedText =
    params.text === "with_extracted_text" ||
    params.text === "without_extracted_text"
      ? params.text
      : "all";
  const sort =
    params.sort === "created_at_asc" ||
    params.sort === "company_name_asc" ||
    params.sort === "company_name_desc" ||
    params.sort === "status_asc" ||
    params.sort === "status_desc" ||
    params.sort === "created_at_desc"
      ? params.sort
      : "created_at_desc";
  const requestedPageSize = Number(params.perPage ?? "25");
  const pageSize =
    requestedPageSize === 25 ||
    requestedPageSize === 50 ||
    requestedPageSize === 100
      ? requestedPageSize
      : 25;
  const requestedPage = Number(params.page ?? "1");
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const practicePage = await listAdminPractices({
    page,
    pageSize,
    search,
    documentCategory: category,
    extractedText,
    sort,
  });
  const practices = practicePage.items;
  const rangeStart =
    practicePage.total === 0 ? 0 : (practicePage.page - 1) * practicePage.pageSize + 1;
  const rangeEnd =
    practicePage.total === 0
      ? 0
      : Math.min(practicePage.page * practicePage.pageSize, practicePage.total);
  const visiblePages = getVisiblePageNumbers(
    practicePage.page,
    practicePage.totalPages
  );
  const activeBadges = [
    search ? `Ricerca: ${search}` : null,
    category ? `Categoria: ${category}` : null,
    extractedText !== "all" ? `Testo: ${getExtractedTextLabel(extractedText)}` : null,
    sort !== "created_at_desc" ? `Ordine: ${getSortLabel(sort)}` : null,
    pageSize !== 25 ? `Per pagina: ${pageSize}` : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
            CRM globale
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Tutte le pratiche dei professionisti
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Vista centralizzata delle pratiche presenti nel sistema. I dati sono
            letti via service role, filtrabili per contenuto e navigabili con
            paginazione reale.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:w-auto">
          <Card className="border-slate-200 shadow-none">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Totale viste
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {practicePage.total}
              </p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-none">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Aziende uniche
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {
                  new Set(
                    practicePage.items.map((practice) => practice.client?.id ?? practice.id)
                  ).size
                }
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70">
          <CardTitle className="text-xl text-slate-950">Filtri CRM</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[1.15fr_0.8fr_0.8fr_0.8fr_0.6fr_auto]">
            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">
                Cerca pratica o azienda
              </span>
              <input
                type="search"
                name="q"
                defaultValue={search}
                placeholder="Azienda, P.IVA, tipo pratica, stato"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">
                Categoria documento
              </span>
              <select
                name="category"
                defaultValue={category}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
              >
                <option value="">Tutte le categorie</option>
                {PRACTICE_DOCUMENT_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">
                Testo estratto
              </span>
              <select
                name="text"
                defaultValue={extractedText}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
              >
                <option value="all">Tutti</option>
                <option value="with_extracted_text">Con testo estratto</option>
                <option value="without_extracted_text">Con documenti senza testo</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Ordina per</span>
              <select
                name="sort"
                defaultValue={sort}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
              >
                <option value="created_at_desc">Data: piu recenti</option>
                <option value="created_at_asc">Data: piu vecchie</option>
                <option value="company_name_asc">Azienda: A-Z</option>
                <option value="company_name_desc">Azienda: Z-A</option>
                <option value="status_asc">Stato: A-Z</option>
                <option value="status_desc">Stato: Z-A</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Per pagina</span>
              <select
                name="perPage"
                defaultValue={String(pageSize)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </label>
            <div className="flex items-end gap-3">
              <Button className="h-11 bg-emerald-700 text-white hover:bg-emerald-600">
                Applica
              </Button>
              <Link href="/admin">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-slate-200"
                >
                  Reset
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
              <FolderKanban className="h-5 w-5 text-emerald-700" />
              Elenco pratiche
            </CardTitle>
            <p className="text-sm text-slate-500">
              {rangeStart}-{rangeEnd} di {practicePage.total} risultati · Pagina{" "}
              {practicePage.page} / {practicePage.totalPages}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activeBadges.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-b border-slate-100 px-6 py-4">
              {activeBadges.map((badge) => (
                <Badge key={badge} variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                  {badge}
                </Badge>
              ))}
              <Link href="/admin">
                <Badge variant="outline" className="border-slate-200 text-slate-600">
                  Reset filtri
                </Badge>
              </Link>
            </div>
          ) : null}
          {practices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Nome Azienda</TableHead>
                  <TableHead>Tipo Pratica</TableHead>
                  <TableHead>Copertura doc</TableHead>
                  <TableHead>Data Creazione</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="pr-6 text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {practices.map((practice) => (
                  <TableRow key={practice.id}>
                    <TableCell className="pl-6 align-top whitespace-normal">
                      <div>
                        <p className="font-medium text-slate-900">
                          {practice.client?.company_name ?? "Azienda sconosciuta"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {practice.client?.vat_number ?? "P.IVA non disponibile"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{practice.type}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900">
                          {practice.documents.length} documenti
                        </p>
                        <p className="text-xs text-slate-500">
                          {practice.documents.length > 0
                            ? [...new Set(practice.documents.map((document) => document.category))]
                                .slice(0, 3)
                                .join(", ")
                            : "Nessun cassetto popolato"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {
                            practice.documents.filter(
                              (document) =>
                                typeof document.extracted_text === "string" &&
                                document.extracted_text.trim().length > 0
                            ).length
                          }{" "}
                          con testo estratto
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Intl.DateTimeFormat("it-IT", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(practice.created_at))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(practice.status)}>
                        {practice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Link href={`/admin/pratiche/${practice.id}`}>
                        <Button variant="outline" className="border-slate-200">
                          <Eye className="mr-2 h-4 w-4" />
                          Vedi Cassetti
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-950">
                Nessuna pratica corrisponde ai filtri
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Modifica ricerca o categoria documentale per ampliare il risultato.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {practicePage.totalPages > 1 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Navigazione risultati admin
          </p>
          <div className="flex items-center gap-3">
            {practicePage.page > 1 ? (
              <Link
                href={buildAdminPageHref({
                  q: search,
                  category,
                  text: extractedText,
                  sort,
                  pageSize,
                  page: practicePage.page - 1,
                })}
              >
                <Button variant="outline" className="border-slate-200">
                  Precedente
                </Button>
              </Link>
            ) : (
              <Button variant="outline" className="border-slate-200" disabled>
                Precedente
              </Button>
            )}
            <div className="flex items-center gap-2">
              {visiblePages.map((pageNumber, index) => {
                const previous = visiblePages[index - 1];
                const showGap =
                  typeof previous === "number" && pageNumber - previous > 1;

                return (
                  <div key={pageNumber} className="flex items-center gap-2">
                    {showGap ? (
                      <span className="text-sm text-slate-400">...</span>
                    ) : null}
                    {pageNumber === practicePage.page ? (
                      <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800">
                        {pageNumber}
                      </span>
                    ) : (
                      <Link
                        href={buildAdminPageHref({
                          q: search,
                          category,
                          text: extractedText,
                          sort,
                          pageSize,
                          page: pageNumber,
                        })}
                      >
                        <Button variant="outline" className="min-w-9 border-slate-200">
                          {pageNumber}
                        </Button>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
            <span className="text-sm font-medium text-slate-700">
              Pagina {practicePage.page} di {practicePage.totalPages}
            </span>
            {practicePage.page < practicePage.totalPages ? (
              <Link
                href={buildAdminPageHref({
                  q: search,
                  category,
                  text: extractedText,
                  sort,
                  pageSize,
                  page: practicePage.page + 1,
                })}
              >
                <Button variant="outline" className="border-slate-200">
                  Successiva
                </Button>
              </Link>
            ) : (
              <Button variant="outline" className="border-slate-200" disabled>
                Successiva
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
