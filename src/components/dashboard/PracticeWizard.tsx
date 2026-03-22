"use client";

import { useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { createClerkSupabaseClient } from "@/lib/supabase/client";
import { useDropzone } from "react-dropzone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UploadCloud, CheckCircle2, AlertCircle, Eye, Download, Building2, User } from "lucide-react";
import {
  PRACTICE_DOCUMENT_CATEGORIES,
  PRACTICE_AREAS,
  CRISI_AZIENDALE_PROCEDURE_TYPES,
  SOVRAINDEBITAMENTO_PROCEDURE_TYPES,
  type PracticeArea,
} from "@/lib/practices";

function DiagnosticCard({ documents, practiceId }: { documents: any[], practiceId: string }) {
  const counts = PRACTICE_DOCUMENT_CATEGORIES.map(cat => ({
    name: cat,
    present: documents.some(d => d.category === cat)
  }));
  const presentCount = counts.filter(x => x.present).length;

  const handleRequestMissing = () => {
    const mancanti = counts.filter(c => !c.present).map(c => c.name);
    if (mancanti.length === 0) {
      alert("Tutti i documenti essenziali sono presenti!");
      return;
    }
    alert("Richiesta documenti mancanti inviata (simulation) per:\n- " + mancanti.join("\n- "));
  };

  return (
    <Card className="bg-slate-50 border-blue-100 shadow-sm sticky top-6">
      <CardHeader>
        <CardTitle className="text-lg text-blue-900">Cruscotto Diagnostico</CardTitle>
        <CardDescription>Stato di completezza della pratica</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Completati</span>
          <span className="text-sm font-bold text-blue-600">{presentCount} / 7</span>
        </div>
        <div className="space-y-2.5">
          {counts.map(c => (
            <div key={c.name} className="flex items-center justify-between text-sm p-1.5 rounded-md hover:bg-slate-100 transition-colors">
              <span className="text-slate-600 font-medium">{c.name}</span>
              {c.present ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          className="w-full mt-4 border-blue-200 text-blue-700 hover:bg-blue-50"
          onClick={handleRequestMissing}
          disabled={!practiceId}
        >
          Richiedi doc mancanti
        </Button>
      </CardContent>
    </Card>
  );
}

function DropzoneArea({ category, uploading, onDrop }: { category: string, uploading: boolean, onDrop: (f: File[]) => void }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    multiple: false
  });

  return (
    <div
      {...getRootProps()}
      className={`w-full max-w-lg flex flex-col items-center justify-center p-8 cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 ease-in-out
        ${isDragActive ? 'bg-blue-50 border-blue-400 scale-[1.02]' : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-600">Caricamento sicuro su Supabase in corso...</p>
        </div>
      ) : (
        <>
          <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragActive ? 'bg-blue-200' : 'bg-blue-100'}`}>
            <UploadCloud className={`h-7 w-7 ${isDragActive ? 'text-blue-800' : 'text-blue-600'}`} />
          </div>
          <p className="text-base font-semibold text-slate-800 mb-1 text-center">
            Trascina il documento per la sezione &quot;{category}&quot;
          </p>
          <p className="text-sm text-slate-500 text-center max-w-xs">
            Supporta PDF e file di testo `.txt` o `.md`
          </p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 0 — Selezione area
// ---------------------------------------------------------------------------
function AreaSelection({ onSelect }: { onSelect: (area: PracticeArea) => void }) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
        <CardTitle className="text-xl text-slate-800">Seleziona l&apos;Area di Intervento</CardTitle>
        <CardDescription>Scegli la tipologia di procedura per configurare correttamente il fascicolo.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onSelect("Crisi Aziendale")}
            className="group flex flex-col items-start gap-3 rounded-xl border-2 border-slate-200 bg-white p-6 text-left transition hover:border-blue-400 hover:bg-blue-50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 group-hover:bg-blue-200 transition">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Crisi Aziendale</p>
              <p className="mt-1 text-sm text-slate-500">
                Procedure maggiori CCII per imprese commerciali: Composizione Negoziata, Concordato Preventivo, Accordi di Ristrutturazione, Liquidazione Giudiziale.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelect("Sovraindebitamento")}
            className="group flex flex-col items-start gap-3 rounded-xl border-2 border-slate-200 bg-white p-6 text-left transition hover:border-amber-400 hover:bg-amber-50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 group-hover:bg-amber-200 transition">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Sovraindebitamento</p>
              <p className="mt-1 text-sm text-slate-500">
                Procedure minori CCII per soggetti non fallibili: consumatori, professionisti, piccoli imprenditori, imprenditori agricoli.
              </p>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Selezione procedura + nome debitore
// ---------------------------------------------------------------------------
function PracticeSetup({
  area,
  onBack,
  onCreated,
}: {
  area: PracticeArea;
  onBack: () => void;
  onCreated: (practiceId: string, companyName: string, procedureType: string) => void;
}) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [procedureType, setProcedureType] = useState("");

  const procedureOptions =
    area === "Sovraindebitamento"
      ? SOVRAINDEBITAMENTO_PROCEDURE_TYPES
      : CRISI_AZIENDALE_PROCEDURE_TYPES;

  const labelName =
    area === "Sovraindebitamento"
      ? "Nome e Cognome del Debitore"
      : "Denominazione / Ragione Sociale";
  const placeholderName =
    area === "Sovraindebitamento"
      ? "Es. Mario Rossi"
      : "Es. Industria Manifatturiera S.r.l.";

  const handleCreate = async () => {
    if (!companyName.trim() || !procedureType) return;
    setLoading(true);
    try {
      const token = await getToken({ template: "supabase" });
      const supabase = createClerkSupabaseClient(token);

      const { data: client, error: clientErr } = await supabase
        .from("clients")
        .insert([{ company_name: companyName, user_id: user?.id }])
        .select()
        .single();
      if (clientErr) throw new Error("Creazione Cliente fallita: " + clientErr.message);

      const { data: practice, error: practiceErr } = await supabase
        .from("practices")
        .insert([{ client_id: client.id, type: procedureType, status: "In Lavorazione" }])
        .select()
        .single();
      if (practiceErr) throw new Error("Creazione Pratica fallita: " + practiceErr.message);

      onCreated(practice.id, companyName, procedureType);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const areaColor = area === "Sovraindebitamento" ? "amber" : "blue";
  const btnClass =
    area === "Sovraindebitamento"
      ? "bg-amber-700 hover:bg-amber-600 text-white"
      : "bg-blue-900 hover:bg-blue-800 text-white";

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            ← Cambia area
          </button>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${areaColor === "amber" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
            {area}
          </span>
        </div>
        <CardTitle className="text-xl text-slate-800">Crea il Fascicolo</CardTitle>
        <CardDescription>Inserisci i dati fondamentali della pratica.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-3">
          <Label htmlFor="procedureType" className="font-semibold text-slate-700">
            Tipologia di Procedura
          </Label>
          <select
            id="procedureType"
            value={procedureType}
            onChange={(e) => setProcedureType(e.target.value)}
            className="h-11 w-full max-w-md rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-300"
          >
            <option value="">Seleziona procedura...</option>
            {procedureOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <Label htmlFor="companyName" className="font-semibold text-slate-700">
            {labelName}
          </Label>
          <Input
            id="companyName"
            placeholder={placeholderName}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="max-w-md h-11"
          />
        </div>

        <Button
          onClick={handleCreate}
          disabled={loading || !companyName.trim() || !procedureType}
          className={`h-11 px-6 shadow ${btnClass}`}
        >
          {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Crea Fascicolo & Vai al Wizard
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function PracticeWizard() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [step, setStep] = useState<"area" | "setup" | "documents">("area");
  const [selectedArea, setSelectedArea] = useState<PracticeArea>("Crisi Aziendale");
  const [practiceId, setPracticeId] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const onDrop = async (acceptedFiles: File[], category: string) => {
    if (!practiceId) return;
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(category);
    try {
      const token = await getToken({ template: "supabase" });
      const supabase = createClerkSupabaseClient(token);

      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${user?.id}/${practiceId}/${category}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("practice_documents")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw new Error("Upload fallito: " + uploadError.message);

      const { data: docRecord, error: dbError } = await supabase
        .from("documents")
        .insert([{ practice_id: practiceId, category: category, file_path: filePath }])
        .select()
        .single();
      if (dbError) throw new Error("Registrazione DB fallita: " + dbError.message);

      let enrichedRecord = docRecord;
      const extractionResponse = await fetch("/api/documents/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docRecord.id }),
      });

      if (extractionResponse.ok) {
        const extractionPayload = await extractionResponse.json();
        enrichedRecord = { ...docRecord, extracted_text: extractionPayload.extractedText ?? null };
      } else {
        console.warn("Estrazione testo documento non riuscita per", docRecord.id);
      }

      setDocuments(prev => [...prev, enrichedRecord]);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-3 space-y-6">
        {step === "area" && (
          <AreaSelection
            onSelect={(area) => {
              setSelectedArea(area);
              setStep("setup");
            }}
          />
        )}

        {step === "setup" && (
          <PracticeSetup
            area={selectedArea}
            onBack={() => setStep("area")}
            onCreated={(id, name) => {
              setPracticeId(id);
              setCompanyName(name);
              setStep("documents");
            }}
          />
        )}

        {step === "documents" && (
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-xl text-slate-800">Classificazione e Upload Documenti</CardTitle>
              <CardDescription className="text-slate-600">
                Cliente: <strong className="text-slate-900">{companyName}</strong>.
                Puoi compilare liberamente le sezioni nei &quot;7 Cassetti&quot;. Non esiste un ordine obbligatorio.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs defaultValue="Societaria" className="w-full">
                <TabsList className="flex flex-wrap h-auto mb-8 bg-slate-100 p-1 justify-start rounded-xl">
                  {PRACTICE_DOCUMENT_CATEGORIES.map(c => (
                    <TabsTrigger
                      key={c}
                      value={c}
                      className="flex-1 min-w-[120px] rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:shadow-sm"
                    >
                      {c}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {PRACTICE_DOCUMENT_CATEGORIES.map(category => (
                  <TabsContent key={category} value={category} className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center min-h-[350px]">
                      <DropzoneArea
                        category={category}
                        uploading={uploading === category}
                        onDrop={(files) => onDrop(files, category)}
                      />

                      {documents.filter(d => d.category === category).length > 0 && (
                        <div className="mt-8 w-full max-w-lg space-y-3">
                          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">File Trasmessi</h4>
                          {documents.filter(d => d.category === category).map((doc, idx) => (
                            <div key={doc.id ?? idx} className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                              <div className="min-w-0">
                                <span className="text-sm font-medium text-slate-800 break-all truncate mr-4 block">
                                  {doc.file_path.split("/").pop()}
                                </span>
                                {doc.id ? (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <a
                                      href={`/api/documents/${doc.id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                                    >
                                      <Eye className="mr-1 h-3.5 w-3.5" />
                                      Apri
                                    </a>
                                    <a
                                      href={`/api/documents/${doc.id}?disposition=attachment`}
                                      className="inline-flex items-center rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                                    >
                                      <Download className="mr-1 h-3.5 w-3.5" />
                                      Scarica
                                    </a>
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex bg-green-50 px-2 py-1 rounded text-green-700 items-center justify-center text-xs font-bold gap-1 shrink-0 self-start">
                                <CheckCircle2 className="h-4 w-4" />
                                Caricato
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="lg:col-span-1">
        {step === "documents" && (
          <DiagnosticCard documents={documents} practiceId={practiceId} />
        )}
      </div>
    </div>
  );
}
