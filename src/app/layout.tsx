import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

/**
 * Font principale — Inter: tipografo moderno e leggibile,
 * ideale per interfacce professionali.
 */
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

/**
 * SEO — Metadata globali dell'applicazione.
 */
export const metadata: Metadata = {
  title: "AI Crisi — Gestione Pratiche CCII con Intelligenza Artificiale",
  description:
    "Piattaforma SaaS per professionisti legali: analisi documentale AI, generazione atti e pareri strategici, database giurisprudenziale RAG per le procedure CCII.",
  keywords: [
    "CCII",
    "crisi d'impresa",
    "intelligenza artificiale",
    "legale",
    "SaaS",
    "atti giudiziari",
    "RAG",
  ],
};

/**
 * RootLayout — Layout radice dell'applicazione.
 * Avvolge tutto con ClerkProvider per l'autenticazione.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
