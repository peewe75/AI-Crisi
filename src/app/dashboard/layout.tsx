import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Briefcase, CreditCard, Home, Settings } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-slate-50">
      {/* Sidebar Laterale (solo Desktop) */}
      <aside className="w-64 border-r border-slate-200 bg-white hidden flex-col md:flex">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-900 to-blue-700">
              <span className="text-sm font-bold text-white">AI</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">AI Crisi</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-900 transition-colors">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <Link href="/dashboard" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-900 transition-colors bg-blue-50 text-blue-900">
            <Briefcase className="h-4 w-4" />
            Le mie Pratiche
          </Link>
          <Link href="/dashboard" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-900 transition-colors">
            <Settings className="h-4 w-4" />
            Impostazioni
          </Link>
          <Link href="/dashboard/billing" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-900 transition-colors">
            <CreditCard className="h-4 w-4" />
            Billing
          </Link>
        </nav>
      </aside>

      {/* Area Contenuto Principale */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 shrink-0 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2 md:hidden">
             <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-blue-900 to-blue-700">
              <span className="text-xs font-bold text-white">AI</span>
            </div>
            <span className="text-lg font-bold text-slate-900">AI Crisi</span>
          </div>
          <div className="flex-1" /> {/* Spacer */}
          <div className="flex items-center gap-4">
            <UserButton />
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
