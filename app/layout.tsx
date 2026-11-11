import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, ShieldCheck } from "lucide-react";
import NavSession from "@/components/nav-session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Faso Édu-Data — Plateforme Nationale de Vigilance Éducative & Anti-Décrochage",
  description:
    "Système officiel de détection précoce du décrochage scolaire, supervision ministérielle (IRD) et ordres de mission républicains · Burkina Faso.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="scroll-smooth">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased">
        {/* Bandeau tricolore officiel du Burkina Faso */}
        <div className="band-ruban" />

        {/* Header institutionnel sobre et élégant */}
        <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-50">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-3 group">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-institution text-white shadow-sm transition group-hover:bg-institution-dark">
                <GraduationCap size={22} />
              </span>
              <div>
                <span className="flex items-center gap-1.5">
                  <span className="block text-base font-extrabold leading-tight text-slate-900 tracking-tight">
                    Faso Édu-Data
                  </span>
                  <span className="inline-block rounded bg-institution/10 px-1.5 py-0.2 text-[10px] font-bold text-institution uppercase">
                    Officiel
                  </span>
                </span>
                <span className="block text-[11px] text-slate-500 font-medium">
                  République du Burkina Faso · MENAPLN
                </span>
              </div>
            </Link>

            {/* Navigation droite */}
            <div className="flex items-center gap-3">
              <NavSession />
            </div>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="flex-1">{children}</main>

        {/* Footer républicain soigné */}
        <footer className="border-t border-slate-200 bg-white text-xs text-slate-500">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 pb-8 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-900 text-sm mb-2">Faso Édu-Data</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Dispositif républicain de veille éducative et de riposte précoce contre la déscolarisation.
                  Développé dans le cadre du <strong>Data Challenge Burkina 2026</strong>.
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-800 mb-2 uppercase text-[11px] tracking-wider">
                  Tutelles d'État
                </p>
                <ul className="space-y-1.5 text-xs text-slate-500">
                  <li>• Ministère de l'Éducation Nationale (MENAPLN)</li>
                  <li>• Ministère de la Transition Digitale (MTDPCE)</li>
                  <li>• Commission Nationale de Déontologie</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-slate-800 mb-2 uppercase text-[11px] tracking-wider">
                  Accès Réservés
                </p>
                <ul className="space-y-1.5 text-xs">
                  <li>
                    <Link href="/auth" className="text-institution hover:underline">
                      Portail des Acteurs de Terrain
                    </Link>
                  </li>
                  <li className="text-slate-400">
                    Espace Ministériel (URL privée sous protocole régalien)
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-slate-800 mb-2 uppercase text-[11px] tracking-wider">
                  Cadre Légal & Éthique
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Conforme à la réglementation relative à la protection des données à caractère personnel des mineurs.
                  Anonymat strict et traçabilité par matricule.
                </p>
              </div>
            </div>

            <div className="pt-6 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-400">
              <p>
                © 2026 Burkina Faso · Plateforme Nationale Faso Édu-Data (EDUGov-Bridge) · Tous droits réservés.
              </p>
              <div className="flex items-center gap-1.5 text-slate-500">
                <ShieldCheck size={14} className="text-faso-green" />
                <span>Plateforme d'État Certifiée</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
