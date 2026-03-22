import { isCurrentUserAdmin } from "@/lib/admin";
import { notFound } from "next/navigation";
import SovraindebitamentoKBUploadForm from "@/components/admin/SovraindebitamentoKBUploadForm";

export default async function KbSovraindebitamentoPage() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
          Knowledge Base
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          KB Sovraindebitamento
        </h1>
        <p className="mt-2 max-w-2xl text-base text-slate-600">
          Carica giurisprudenza (ilcaso.it, Cassazione, Tribunali), normativa CCII e dottrina
          specifiche per le procedure minori. I contenuti vengono embeddati in una knowledge
          base separata e usati esclusivamente per le pratiche di sovraindebitamento.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/40 px-5 py-4 text-sm text-amber-900">
        <p className="font-semibold mb-1">Istruzioni per il caricamento</p>
        <ul className="list-disc pl-5 space-y-1 text-amber-800">
          <li>Usa il separatore <code className="bg-amber-100 px-1 rounded">---</code> per dividere documenti distinti in un unico file.</li>
          <li>Ogni sezione deve iniziare con un titolo Markdown (<code className="bg-amber-100 px-1 rounded"># Titolo</code>) per una corretta indicizzazione.</li>
          <li>Seleziona la <strong>Procedura specifica</strong> quando il contenuto riguarda un istituto preciso (Piano Consumatore, Concordato Minore, ecc.).</li>
          <li>Indica sempre la <strong>Fonte</strong> per tracciabilita delle fonti nella generazione degli atti.</li>
          <li>Il formulario AI-ready si trova in <code className="bg-amber-100 px-1 rounded">Formulario/FORMULARIO_SOVRAINDEBITAMENTO_AI_READY.md</code> — caricalo come categoria <em>Template</em>.</li>
        </ul>
      </div>

      <SovraindebitamentoKBUploadForm />
    </div>
  );
}
