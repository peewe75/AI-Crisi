import KnowledgeBaseUploadForm from "@/components/admin/KnowledgeBaseUploadForm";
import KnowledgeBaseCategoryOverview from "@/components/admin/KnowledgeBaseCategoryOverview";
import { requireAdminAccess } from "@/lib/admin";

export default async function AdminKnowledgeBasePage({
  searchParams,
}: {
  searchParams: Promise<{
    kbSearch?: string;
    kbOrigin?: string;
  }>;
}) {
  await requireAdminAccess();

  const params = await searchParams;
  const kbSearch = typeof params.kbSearch === "string" ? params.kbSearch : "";
  const kbOrigin =
    params.kbOrigin === "manual" || params.kbOrigin === "cron-sync"
      ? params.kbOrigin
      : "all";

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
          Controllo RAG
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
          Gestione Knowledge Base
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Carica normativa, giurisprudenza, template e skill nel Vector DB.
          L&apos;ingestione avviene lato server con chiave service role e genera gli
          embedding compatibili con la pipeline RAG gia attiva.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <KnowledgeBaseUploadForm />
        <KnowledgeBaseCategoryOverview search={kbSearch} origin={kbOrigin} />
      </div>
    </div>
  );
}
