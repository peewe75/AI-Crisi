import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Database, FolderKanban, RefreshCw, Shield } from "lucide-react";
import { requireAdminAccess } from "@/lib/admin";

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "Tutte le Pratiche",
    icon: FolderKanban,
    color: undefined,
  },
  {
    href: "/admin/knowledge-base",
    label: "KB Crisi Aziendale",
    icon: Database,
    color: undefined,
  },
  {
    href: "/admin/kb-sovraindebitamento",
    label: "KB Sovraindebitamento",
    icon: Database,
    color: "amber" as const,
  },
  {
    href: "/admin/sync-runs",
    label: "Sync Giurisprudenza",
    icon: RefreshCw,
    color: undefined,
  },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminAccess();

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-slate-200 px-6 py-5">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-950 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                Admin Area
              </p>
              <p className="text-xl font-semibold tracking-tight text-slate-950">
                AI Crisi Control
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isAmber = item.color === "amber";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-medium transition ${
                  isAmber
                    ? "text-amber-700 hover:border-amber-100 hover:bg-amber-50 hover:text-amber-900"
                    : "text-slate-700 hover:border-emerald-100 hover:bg-emerald-50 hover:text-emerald-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Supervisione globale
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                CRM, AI e Knowledge Base
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-slate-500 transition hover:text-emerald-800"
              >
                Torna alla dashboard
              </Link>
              <UserButton />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 md:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

