import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import NavSession from "@/components/nav-session";
import "./globals.css";

export const metadata: Metadata = {
  title: "EDUGov-Bridge — Faso Édu-Data · Défi 1 : Anti-Décrochage",
  description:
    "Défi n°1 du Data Challenge Burkina 2026 : anticiper et combattre le décrochage scolaire — alerte précoce du terrain, tableau de bord ministériel (IRD) et Brief IA d'urgence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col">
        <div className="band-ruban" />
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-50">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-institution text-white">
                <GraduationCap size={22} />
              </span>
              <span>
                <span className="block text-base font-bold leading-tight text-institution">
                  EDUGov-Bridge
                </span>
                <span className="block text-xs text-slate-500">Faso Édu-Data · SN 2026</span>
              </span>
            </Link>
            <nav className="flex items-center gap-2 sm:gap-4">
              {/* Espace public : seule l'option d'authentification est exposée.
                  Les espaces internes (/terrain, /ministere) ne sont jamais
                  listés ici et restent contrôlés par le middleware serveur. */}
              <NavSession />
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-12 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6 text-xs text-slate-500 sm:px-6">
            <p className="font-medium text-slate-700">
              EDUGov-Bridge (Faso Édu-Data) — Data Challenge Burkina 2026, 21ᵉ édition de la
              Semaine du Numérique · Volet Éducation
            </p>
            <p className="mt-1">
              Ministère de la Transition Digitale × Ministère de l'Éducation Nationale · Prototype
              MVP — données de démonstration réalistes.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
