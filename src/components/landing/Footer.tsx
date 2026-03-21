import Link from "next/link";

/**
 * Footer — Link standard (Privacy, Terms, Contatti) e copyright.
 */
export function Footer() {
  return (
    <footer id="contatti" className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
          {/* Logo & description */}
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-900 to-blue-700">
                <span className="text-xs font-bold text-white">AI</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                AI Crisi
              </span>
            </Link>
            <p className="text-sm text-slate-500">
              Assistente AI per le procedure CCII
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              Termini di Servizio
            </Link>
            <a
              href="mailto:info@aicrisi.it"
              className="text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              Contatti
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-8 border-t border-slate-100 pt-8">
          <p className="text-center text-xs text-slate-400">
            © {new Date().getFullYear()} AI Crisi. Tutti i diritti riservati.
          </p>
        </div>
      </div>
    </footer>
  );
}
