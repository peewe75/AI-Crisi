import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Funzionalità incluse nel piano */
const includedFeatures = [
  "Ingestione e analisi documentale AI",
  "Generazione atti e pareri strategici",
  "Database giurisprudenziale RAG",
  "Aggiornamenti automatici sentenze",
  "Supporto email prioritario",
  "Archiviazione illimitata documenti",
];

/**
 * Pricing Section — Piano di abbonamento unico.
 */
export function PricingSection() {
  return (
    <section id="prezzi" className="bg-slate-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-900">
            Prezzi Trasparenti
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Un piano semplice, senza sorprese
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Accedi a tutti i moduli con un unico abbonamento. Inizia gratis
            e decidi se fa per te.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="mx-auto mt-16 max-w-lg">
          <Card className="relative overflow-hidden border-2 border-blue-900/20 bg-white shadow-xl shadow-blue-900/5">
            {/* Popular badge */}
            <div className="absolute right-4 top-4">
              <span className="inline-flex items-center rounded-full bg-blue-900 px-3 py-1 text-xs font-semibold text-white">
                Più popolare
              </span>
            </div>

            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-900">
                Piano Pro
              </CardTitle>
              <CardDescription className="text-slate-600">
                Per professionisti e studi legali
              </CardDescription>
              <div className="mt-6">
                <span className="text-5xl font-extrabold tracking-tight text-slate-900">
                  30€
                </span>
                <span className="text-lg font-medium text-slate-500">/mese</span>
              </div>
              <p className="mt-2 text-sm font-medium text-blue-700">
                14 giorni di prova gratuita inclusi
              </p>
            </CardHeader>

            <CardContent>
              {/* Feature list */}
              <ul className="space-y-4">
                {includedFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <svg
                      className="mt-0.5 h-5 w-5 shrink-0 text-blue-900"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                      />
                    </svg>
                    <span className="text-sm text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href="/sign-up" className="mt-8 block">
                <Button className="h-12 w-full rounded-full bg-blue-900 text-base font-semibold text-white shadow-lg shadow-blue-900/25 transition-all hover:bg-blue-800 hover:shadow-xl">
                  Inizia la prova gratuita
                </Button>
              </Link>

              <p className="mt-4 text-center text-xs text-slate-500">
                Nessuna carta di credito richiesta · Cancella in qualsiasi momento
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
