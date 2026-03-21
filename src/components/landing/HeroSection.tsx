import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Hero Section — Sezione principale con titolo, sottotitolo e CTA.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
      {/* Background decorativo */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-indigo-100/30 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-900">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
            </span>
            Piattaforma AI per Professionisti Legali
          </div>

          {/* Titolo */}
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Gestisci le Pratiche CCII con la potenza dell&apos;
            <span className="bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent">
              Intelligenza Artificiale
            </span>
          </h1>

          {/* Sottotitolo */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Automatizza l&apos;analisi documentale, genera atti e pareri strategici
            e resta aggiornato sulla giurisprudenza. Il tuo assistente AI per le
            procedure di composizione della crisi d&apos;impresa.
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="h-12 rounded-full bg-blue-900 px-8 text-base font-semibold text-white shadow-lg shadow-blue-900/25 transition-all hover:bg-blue-800 hover:shadow-xl hover:shadow-blue-900/30"
              >
                Inizia la prova gratuita di 14 giorni
              </Button>
            </Link>
            <a href="#funzionalita">
              <Button
                variant="outline"
                size="lg"
                className="h-12 rounded-full border-slate-300 px-8 text-base font-semibold text-slate-700 transition-all hover:border-blue-300 hover:bg-blue-50"
              >
                Scopri di più
              </Button>
            </a>
          </div>

          {/* Trust badge */}
          <p className="mt-8 text-sm text-slate-500">
            ✓ Nessuna carta di credito richiesta &nbsp;·&nbsp; ✓ Setup in 2 minuti &nbsp;·&nbsp; ✓ Cancella quando vuoi
          </p>
        </div>
      </div>
    </section>
  );
}
