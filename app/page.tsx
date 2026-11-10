import Link from "next/link";
import { ArrowRight, LogIn, Radar } from "lucide-react";
import { Badge, Card, CardHeader, CardTitle } from "@/components/ui";
import { INDICATEURS_DECROCHAGE } from "@/types/database";

// ─────────────────────────────────────────────────────────────────
// Page d'accueil publique — MOT D'ORDRE DE LA MISSION (Défi 1)
// Vitrine institutionnelle ultra-rapide (rendu statique instantané)
// destinée au corps éducatif et au grand public.
// ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      {/* ── MOT D'ORDRE ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-institution text-white">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-faso-red/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:py-28">
          <Badge className="bg-white/10 text-faso-gold">
            Data Challenge Burkina 2026 · Défi n°1
          </Badge>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Un enfant qui décroche s'est d'abord annoncé. Savoir voir, agir à temps.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-100/90">
            Mission de tout le corps éducatif du Burkina : repérer les signaux faibles du
            décrochage scolaire et les remonter, pour qu'aucun enfant ne disparaisse de l'école
            en silence.
          </p>

        </div>
      </section>

      {/* ── LES SIGNAUX À SURVEILLER (consigne de mission) ──────── */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            Les signaux qu'il faut savoir voir
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-slate-600">
            Le mot d'ordre de la mission : dès que l'un de ces signes apparaît auprès d'un élève
            ou d'une famille, il doit remonter. Connectez-vous pour accéder à la mission et
            transmettre vos observations.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {Object.values(INDICATEURS_DECROCHAGE).map((ind) => (
            <Card key={ind.label} className="border-l-4 border-l-faso-red">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Radar size={19} className="shrink-0 text-faso-red" /> {ind.label}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-slate-50 px-6 py-8 text-center sm:px-12">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Corps éducatif — enseignants, directeurs, inspecteurs, APE/COGES
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-slate-700">
            Vous êtes les yeux de la nation. Connectez-vous avec vos identifiants pour consulter
            le détail de la mission et remonter vos alertes.
          </p>

        </div>
      </section>
    </>
  );
}
