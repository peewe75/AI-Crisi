import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import DocumentWorkshop from "@/components/dashboard/DocumentWorkshop";
import {
  getMissingPracticeCategories,
  getPracticeForCurrentUser,
} from "@/lib/practices";

export default async function PracticeWorkshopPage({
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
  const availableDocumentCount = practice.documents.filter(
    (document) =>
      typeof document.extracted_text === "string" &&
      document.extracted_text.trim().length > 0
  ).length;

  return (
    <div className="mx-auto max-w-[1600px] space-y-8">
      <div>
        <Link
          href={`/dashboard/pratiche/${practice.id}`}
          className="inline-flex items-center text-sm font-medium text-slate-500 transition-colors hover:text-emerald-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna al fascicolo
        </Link>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
            Motore documentale AI
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Officina Atti · {practice.client.company_name}
          </h1>
          <p className="mt-2 max-w-3xl text-base text-slate-600">
            Il motore combina fascicolo cliente e knowledge base vettoriale per
            generare bozze legali complesse in Markdown, con streaming in tempo
            reale.
          </p>
        </div>
      </div>

      <DocumentWorkshop
        practiceId={practice.id}
        practiceLabel={`${practice.type} · ${practice.status}`}
        companyName={practice.client.company_name}
        missingCategories={missingCategories}
        availableDocumentCount={availableDocumentCount}
        initialActs={practice.generatedActs}
      />
    </div>
  );
}

