"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, Show } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-900 to-blue-700">
            <span className="text-sm font-bold text-white">AI</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">AI Crisi</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#funzionalita" className="text-sm font-medium text-slate-600 transition-colors hover:text-blue-900">
            Funzionalita
          </a>
          <a href="#prezzi" className="text-sm font-medium text-slate-600 transition-colors hover:text-blue-900">
            Prezzi
          </a>
          <a href="#contatti" className="text-sm font-medium text-slate-600 transition-colors hover:text-blue-900">
            Contatti
          </a>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Show when="signed-out">
            <SignInButton fallbackRedirectUrl="/dashboard" forceRedirectUrl="/dashboard">
              <Button variant="ghost" size="sm" className="text-slate-700">
                Accedi
              </Button>
            </SignInButton>
            <SignUpButton fallbackRedirectUrl="/dashboard" forceRedirectUrl="/dashboard">
              <Button size="sm" className="bg-blue-900 text-white hover:bg-blue-800">
                Registrati
              </Button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-slate-700">
                Dashboard
              </Button>
            </Link>
            <UserButton />
          </Show>
        </div>

        <button
          className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Apri menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-3">
            <a href="#funzionalita" className="text-sm font-medium text-slate-600" onClick={() => setMobileOpen(false)}>
              Funzionalita
            </a>
            <a href="#prezzi" className="text-sm font-medium text-slate-600" onClick={() => setMobileOpen(false)}>
              Prezzi
            </a>
            <a href="#contatti" className="text-sm font-medium text-slate-600" onClick={() => setMobileOpen(false)}>
              Contatti
            </a>
            <div className="flex gap-2 pt-2">
              <Show when="signed-out">
                <SignInButton fallbackRedirectUrl="/dashboard" forceRedirectUrl="/dashboard">
                  <Button variant="ghost" size="sm" className="w-full text-slate-700">
                    Accedi
                  </Button>
                </SignInButton>
                <SignUpButton fallbackRedirectUrl="/dashboard" forceRedirectUrl="/dashboard">
                  <Button size="sm" className="w-full bg-blue-900 text-white hover:bg-blue-800">
                    Registrati
                  </Button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
