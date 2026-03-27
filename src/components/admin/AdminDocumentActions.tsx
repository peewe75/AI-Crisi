"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminDocumentActionsProps {
  documentId: string;
}

export function AdminDocumentActions({ documentId }: AdminDocumentActionsProps) {
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtract = async () => {
    setIsExtracting(true);
    try {
      const res = await fetch("/api/documents/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Estrazione fallita");
      }

      alert("Testo estratto con successo");
      // Ricarichiamo la pagina per mostrare i risultati aggiornati
      window.location.reload();
    } catch (error: any) {
      alert(error.message || "Errore durante l'estrazione");
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 px-2.5 text-[0.8rem] border-amber-200 bg-amber-50/30 text-amber-700 hover:bg-amber-50 hover:text-amber-800 transition-colors"
      onClick={handleExtract}
      disabled={isExtracting}
    >
      <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isExtracting ? "animate-spin" : ""}`} />
      {isExtracting ? "Estrazione in corso..." : "Forza OCR / Estrazione"}
    </Button>
  );
}
