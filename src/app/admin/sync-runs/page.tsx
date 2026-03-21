import Link from "next/link";
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  Clock3,
  RefreshCw,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import BackgroundSyncRunTrigger from "@/components/admin/BackgroundSyncRunTrigger";
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
  listAdminBackgroundSyncRuns,
  requireAdminAccess,
  type AdminBackgroundSyncStatusFilter,
} from "@/lib/admin";

const JOB_NAME = "sync-giurisprudenza-ilcaso";
const STATUS_OPTIONS: Array<{
  value: AdminBackgroundSyncStatusFilter;
  label: string;
}> = [
  { value: "all", label: "Tutti gli stati" },
  { value: "success", label: "Success" },
  { value: "skipped_interval", label: "Skip 48h" },
  { value: "failed", label: "Failed" },
  { value: "running", label: "Running" },
];

function formatDateTime(value: string | null) {
  if (!value) {
    return "Non disponibile";
  }

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildSyncRunsHref(status: AdminBackgroundSyncStatusFilter) {
  if (status === "all") {
    return "/admin/sync-runs";
  }

  return `/admin/sync-runs?status=${status}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "success":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
          <CheckCircle2 className="h-3 w-3" />
          Success
        </Badge>
      );
    case "skipped_interval":
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          <Clock3 className="h-3 w-3" />
          Skip 48h
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="border-slate-200 text-slate-700">
          <RefreshCw className="h-3 w-3" />
          Running
        </Badge>
      );
  }
}

export default async function AdminSyncRunsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
  }>;
}) {
  await requireAdminAccess();

  const params = await searchParams;
  const status =
    params.status === "success" ||
    params.status === "skipped_interval" ||
    params.status === "failed" ||
    params.status === "running"
      ? params.status
      : "all";

  const runPage = await listAdminBackgroundSyncRuns({
    jobName: JOB_NAME,
    limit: 30,
    status,
  });
  const runs = runPage.items;
  const latestRun = runs[0] ?? null;
  const totalInserted = runs.reduce(
    (sum, run) => sum + Number(run.inserted_count ?? 0),
    0
  );
  const totalFailed = runs.reduce(
    (sum, run) => sum + Number(run.failed_count ?? 0),
    0
  );
  const totalSkipped = runs.filter(
    (run) => run.status === "skipped_interval"
  ).length;
  const activeBadges = status !== "all" ? [`Stato: ${STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status}`] : [];

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
          Automazione RAG
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
          Run sync giurisprudenza
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Monitoraggio dei run del worker automatico che sincronizza la
          giurisprudenza da ilcaso.it. La cadenza effettiva e di 48 ore dal
          precedente run riuscito, anche se il cron Vercel parte ogni giorno.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Ultimo stato
              </p>
              <div className="mt-3">
                {latestRun ? getStatusBadge(latestRun.status) : "Nessun run"}
              </div>
              <p className="mt-3 text-sm text-slate-500">
                {latestRun
                  ? formatDateTime(latestRun.finished_at ?? latestRun.started_at)
                  : "Nessun dato"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Ultimo success
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-950">
                {formatDateTime(runPage.latestSuccessAt)}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Prossima finestra: {formatDateTime(runPage.nextEligibleSyncAt)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Pronunce inserite
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">
                {totalInserted}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Somma dei record aggiunti nei run visibili
              </p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Skip / errori
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">
                {totalSkipped} / {totalFailed}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Skip per intervallo / singoli errori batch
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/70">
            <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
              <RefreshCw className="h-5 w-5 text-emerald-700" />
              Operazioni manuali
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm leading-6 text-slate-600">
              Esegue il worker subito con le stesse regole del cron. Se il
              vincolo di 48 ore e ancora attivo, il run viene registrato come
              <code> skipped_interval</code> senza toccare scraping o Gemini.
            </p>
            <BackgroundSyncRunTrigger />
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
              <Activity className="h-5 w-5 text-emerald-700" />
              Storico run {JOB_NAME}
            </CardTitle>
            <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-medium text-slate-700">Filtro stato</span>
                <select
                  name="status"
                  defaultValue={status}
                  className="h-10 min-w-52 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  className="h-10 bg-emerald-700 text-white hover:bg-emerald-600"
                >
                  Applica
                </Button>
                <Link href="/admin/sync-runs">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 border-slate-200"
                  >
                    Reset
                  </Button>
                </Link>
              </div>
            </form>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activeBadges.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-b border-slate-100 px-6 py-4">
              {activeBadges.map((badge) => (
                <Badge
                  key={badge}
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-800"
                >
                  {badge}
                </Badge>
              ))}
              <Link href="/admin/sync-runs">
                <Badge
                  variant="outline"
                  className="border-slate-200 text-slate-600"
                >
                  Reset filtri
                </Badge>
              </Link>
            </div>
          ) : null}
          {runs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Stato</TableHead>
                  <TableHead>Avvio</TableHead>
                  <TableHead>Fine</TableHead>
                  <TableHead>Contatori</TableHead>
                  <TableHead>Origine</TableHead>
                  <TableHead className="pr-6">Dettagli</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="pl-6 align-top">
                      <div className="space-y-2">
                        {getStatusBadge(run.status)}
                        <p className="text-xs text-slate-500">{run.job_name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {formatDateTime(run.started_at)}
                    </TableCell>
                    <TableCell className="align-top">
                      {formatDateTime(run.finished_at)}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1 text-sm text-slate-700">
                        <p>Inseriti: {run.inserted_count}</p>
                        <p>Gia presenti: {run.skipped_count}</p>
                        <p>Errori batch: {run.failed_count}</p>
                        {typeof run.metadata?.fetched_count === "number" ? (
                          <p className="text-xs text-slate-500">
                            Raccolti: {run.metadata.fetched_count}
                            {typeof run.metadata?.pending_count === "number"
                              ? ` · Pending: ${run.metadata.pending_count}`
                              : ""}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1 text-sm text-slate-700">
                        <p className="line-clamp-2 break-all text-xs text-slate-500">
                          {run.metadata?.source_url ?? "Sorgente non disponibile"}
                        </p>
                        {run.metadata?.next_eligible_sync_at ? (
                          <p className="text-xs text-slate-500">
                            Prossimo slot:{" "}
                            {formatDateTime(run.metadata.next_eligible_sync_at)}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="pr-6 align-top">
                      <div className="space-y-2 text-sm text-slate-700">
                        {run.metadata?.reason ? (
                          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{run.metadata.reason}</span>
                          </div>
                        ) : null}
                        {run.metadata?.error ? (
                          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-900">
                            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{run.metadata.error}</span>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">
                            Nessun errore fatale registrato.
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700">
                <RefreshCw className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-950">
                Nessun run registrato
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Nessun record corrisponde al filtro selezionato.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
