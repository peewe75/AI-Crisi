import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listLatestKnowledgeBaseEntries } from "@/lib/admin";

export default async function KnowledgeBaseCategoryOverview() {
  const items = await listLatestKnowledgeBaseEntries({ limit: 10 });

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/70">
        <CardTitle className="text-xl text-slate-950">
          Archivio Attuale
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-6">
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
            Nessun record presente in knowledge_base.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
