import PracticeWizard from "@/components/dashboard/PracticeWizard";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NuovaPraticaPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header with back button */}
      <div>
        <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-900 transition-colors mb-4">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Torna alle Pratiche
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Nuova Pratica CCII</h1>
        <p className="text-base text-slate-600 mt-1 max-w-3xl">
          Utilizza il Wizard per classificare l'azienda e inserire i documenti essenziali per l'analisi AI.
          L'auto-calcolo diagnostico traccerà lo stato d'avanzamento.
        </p>
      </div>
      
      {/* The Interactive Logic Client Component */}
      <PracticeWizard />
    </div>
  );
}
