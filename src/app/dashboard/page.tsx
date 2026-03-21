import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClerkSupabaseClient } from "@/lib/supabase/client";
import { isCurrentUserAdmin } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Folder } from "lucide-react";

export default async function DashboardPage() {
  // Con la nuova API server component Clerk in Next.js App Router (v7)
  const { getToken, userId } = await auth();
  
  if (!userId) {
    return <div className="p-4">Credenziali non valide.</div>;
  }

  if (await isCurrentUserAdmin()) {
    redirect("/admin");
  }

  // Creazione Client Supabase SSR
  const token = await getToken({ template: "supabase" });
  const supabase = createClerkSupabaseClient(token);

  // Fetch delle tabelle practices (vincolato dalle RLS in lettura al sub di Clerk)
  const { data: practices, error } = await supabase
    .from("practices")
    .select(`
      id,
      type,
      status,
      created_at,
      clients ( company_name )
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Le mie Pratiche</h1>
          <p className="text-sm text-slate-500">Gestisci i fascicoli e le procedure di Crisi d'Impresa.</p>
        </div>
        <Link href="/dashboard/pratiche/nuova">
          <Button className="bg-blue-900 hover:bg-blue-800 text-white w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuova Pratica
          </Button>
        </Link>
      </div>

      {!practices || practices.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
            <Folder className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nessuna pratica trovata</h3>
            <p className="text-sm max-w-sm mb-6">
              Non hai ancora avviato nessun iter per i tuoi clienti. Crea la tua prima pratica per l'archiviazione assistita dall'AI.
            </p>
            <Link href="/dashboard/pratiche/nuova">
               <Button variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100">
                 Crea la tua prima Pratica
               </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {practices.map((practice: any) => (
            <Card key={practice.id} className="border-slate-200 transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-slate-800 line-clamp-1">
                  {practice.clients?.company_name || 'Azienda Sconosciuta'}
                </CardTitle>
                <CardDescription className="text-sm">
                  {practice.type}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-slate-500">Stato attuale</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    practice.status === 'Attiva' ? 'bg-green-100 text-green-700' :
                    practice.status === 'Bozza' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {practice.status}
                  </span>
                </div>
                <div className="mt-5 flex gap-2">
                  <Link href={`/dashboard/pratiche/${practice.id}`} className="flex-1">
                    <Button variant="outline" className="w-full border-slate-200">
                      Apri pratica
                    </Button>
                  </Link>
                  <Link href={`/dashboard/pratiche/${practice.id}/officina`} className="flex-1">
                    <Button className="w-full bg-emerald-700 text-white hover:bg-emerald-600">
                      Officina Atti
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
