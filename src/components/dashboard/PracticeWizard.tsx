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
import { Loader2, UploadCloud, CheckCircle2, AlertCircle, Eye, Download } from "lucide-react";
import { PRACTICE_DOCUMENT_CATEGORIES } from "@/lib/practices";

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
    console.log("Categorie mancanti:", mancanti);
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

function DropzoneArea({ category, uploading, onDrop }: { category: string, uploading: boolean, onDrop: (f: File[])=>void }) {
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
             Trascina il documento per la sezione "{category}"
           </p>
           <p className="text-sm text-slate-500 text-center max-w-xs">
             Supporta PDF e file di testo `.txt` o `.md`
           </p>
         </>
      )}
    </div>
  );
}

export default function PracticeWizard() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  
  const [practiceId, setPracticeId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [companyName, setCompanyName] = useState("");
  
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  // Creazione della pratica e del cliente
  const handleCreatePractice = async () => {
    if (!companyName.trim()) return alert("Per favore, inserisci un nome azienda.");
    
    setLoading(true);
    try {
      const token = await getToken({ template: 'supabase' });
      const supabase = createClerkSupabaseClient(token);
      
      // 1. Crea il Cliente
      const { data: client, error: clientErr } = await supabase
        .from('clients')
        .insert([{ company_name: companyName, user_id: user?.id }])
        .select()
        .single();
        
      if (clientErr) throw new Error("Creazione Cliente fallita: " + clientErr.message);
      setClientId(client.id);

      // 2. Crea la Pratica Associata 
      const { data: practice, error: practiceErr } = await supabase
        .from('practices')
        .insert([{ client_id: client.id, type: 'Composizione Negoziata', status: 'In Lavorazione' }])
        .select()
        .single();
        
      if (practiceErr) throw new Error("Creazione Pratica fallita: " + practiceErr.message);
      setPracticeId(practice.id);
      
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Upload dei documenti su Storage e poi Metadata a DB
  const onDrop = async (acceptedFiles: File[], category: string) => {
    if (!practiceId) return;
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(category);
    try {
      const token = await getToken({ template: 'supabase' });
      const supabase = createClerkSupabaseClient(token);
      
      // Sanitizzazione nome file e id univoco
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${user?.id}/${practiceId}/${category}/${Date.now()}_${safeName}`;
      
      // 1. Upload Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('practice_documents')
        .upload(filePath, file, { cacheControl: "3600", upsert: false });
        
      if (uploadError) throw new Error("Upload fallito: " + uploadError.message);

      // 2. Inserimento record DB in table "documents"
      const { data: docRecord, error: dbError } = await supabase
        .from('documents')
        .insert([{
          practice_id: practiceId,
          category: category,
          file_path: filePath
        }])
        .select()
        .single();

      if (dbError) throw new Error("Registrazione DB fallita: " + dbError.message);

      let enrichedRecord = docRecord;
      const extractionResponse = await fetch("/api/documents/extract-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: docRecord.id,
        }),
      });

      if (extractionResponse.ok) {
        const extractionPayload = await extractionResponse.json();
        enrichedRecord = {
          ...docRecord,
          extracted_text: extractionPayload.extractedText ?? null,
        };
      } else {
        console.warn("Estrazione testo documento non riuscita per", docRecord.id);
      }

      // Aggiungi al display
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
      
        {!practiceId ? (
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
              <CardTitle className="text-xl text-slate-800">Crea il Fascicolo Aziendale</CardTitle>
              <CardDescription>Inserisci i dati fondamentali della società in Crisi.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-3">
                <Label htmlFor="companyName" className="font-semibold text-slate-700">Denominazione / Ragione Sociale</Label>
                <Input 
                  id="companyName"
                  placeholder="Es. Industria Manifatturiera S.r.l." 
                  value={companyName} 
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="max-w-md h-11"
                />
              </div>
              <Button 
                onClick={handleCreatePractice} 
                disabled={loading || !companyName.trim()} 
                className="bg-blue-900 hover:bg-blue-800 text-white h-11 px-6 shadow"
              >
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Crea Fascicolo & Vai al Wizard
              </Button>
            </CardContent>
          </Card>
        ) : (
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
                {/* Scroll Area o layout flex wrap per tab list responsiva */}
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
                      
                      {/* Mostra la lista dei file già caricati per questa categoria */}
                      {documents.filter(d => d.category === category).length > 0 && (
                        <div className="mt-8 w-full max-w-lg space-y-3">
                          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">File Trasmessi</h4>
                          {documents.filter(d => d.category === category).map((doc, idx) => (
                            <div key={doc.id ?? idx} className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                              <div className="min-w-0">
                                <span className="text-sm font-medium text-slate-800 break-all truncate mr-4 block">
                                  {doc.file_path.split('/').pop()}
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
        <DiagnosticCard documents={documents} practiceId={practiceId} />
      </div>
    </div>
  );
}
