import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listLatestKnowledgeBaseEntries } from "@/lib/admin";

export default async function KnowledgeBaseCategoryOverview({
  search = "",
}: {
  search?: string;
}) {
  const archive = await listLatestKnowledgeBaseEntries({ limit: 12, search });
  const items = archive.items;
  const activeBadges = search ? [`Ricerca: ${search}`] : [];

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="space-y-4 border-b border-slate-100 bg-slate-50/70">
        <CardTitle className="text-xl text-slate-950">
          Archivio Attuale
        </CardTitle>
        <form className="flex flex-col gap-3">
          <label className="space-y-2 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Ricerca record KB</span>
            <input
              type="search"
              name="kbSearch"
              defaultValue={search}
              placeholder="Titolo o contenuto"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
            />
          </label>
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              className="h-10 bg-emerald-700 text-white hover:bg-emerald-600"
            >
              Cerca
            </Button>
            <Link href="/admin/knowledge-base">
              <Button type="button" variant="outline" className="h-10 border-slate-200">
                Reset
              </Button>
            </Link>
          </div>
        </form>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(archive.countsByCategory).map(([category, count]) => (
            <div
              key={category}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {category}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{count}</p>
            </div>
          ))}
        </div>

        {activeBadges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeBadges.map((badge) => (
              <Badge
                key={badge}
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-emerald-800"
              >
                {badge}
              </Badge>
            ))}
            <Link href="/admin/knowledge-base">
              <Badge variant="outline" className="border-slate-200 text-slate-600">
                Reset filtri
              </Badge>
            </Link>
          </div>
        ) : null}

        <p className="text-sm text-slate-500">{archive.total} record trovati</p>

        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.metadata?.source_file
                      ? `File: ${item.metadata.source_file}`
                      : "Inserimento manuale"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    {item.category}
                  </span>
                  <p className="mt-2 text-xs text-slate-400">
                    {new Intl.DateTimeFormat("it-IT", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(item.created_at))}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            Nessun record presente in knowledge_base per i filtri selezionati.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
