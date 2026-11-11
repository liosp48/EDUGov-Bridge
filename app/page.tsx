import {
  ArrowRight,
  CheckCircle2,
  Radar,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { INDICATEURS_DECROCHAGE } from "@/types/database";

// ─────────────────────────────────────────────────────────────────
// Page d'accueil officielle — PLATEFORME NATIONALE FASO ÉDU-DATA
// Portail d'État épuré, sobre et noble. Couleurs pures républicaines.
// Rendu statique instantané (0 latence).
// ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* ── 1. BANDEAU OFFICIEL D'ÉTAT ───────────────────────────── */}
      <div className="border-b border-slate-200 bg-slate-50 py-2 text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-faso-green" />
            <span className="font-bold tracking-wider text-slate-800 uppercase text-[10px] sm:text-[11px] truncate">
              RÉPUBLIQUE DU BURKINA FASO · Unité — Progrès — Justice
            </span>
          </div>
          <span className="hidden text-slate-500 sm:inline text-[11px] font-medium">
            Plateforme interministérielle MENAPLN × MTDPCE
          </span>
        </div>
      </div>

      {/* ── 2. HERO SECTION RÉGALIENNE EN COULEUR PURE (BLEU D'ÉTAT) ─ */}
      <section className="relative bg-[#0B2545] text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge officiel net */}
            <div className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 sm:px-4 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-white shadow-sm max-w-full">
              <span className="flex h-2 w-2 rounded-full bg-faso-green shrink-0" />
              <span>Système National de Vigilance Éducative & Alerte Précoce</span>
              <span className="hidden sm:inline text-white/40">·</span>
              <span className="hidden sm:inline text-slate-200">Défi n°1 Anti-Décrochage</span>
            </div>

            {/* Grand titre régalien en blanc pur */}
            <h1 className="mt-6 sm:mt-7 text-2xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight sm:leading-tight">
              Anticiper le décrochage scolaire, <br className="hidden sm:inline" />
              protéger le parcours de chaque élève.
            </h1>

            {/* Sous-titre institutionnel clair */}
            <p className="mx-auto mt-4 sm:mt-6 max-w-3xl text-xs sm:text-base lg:text-lg text-slate-200 leading-relaxed font-normal">
              Le dispositif d'État reliant directement le <strong>corps éducatif de terrain</strong> (enseignants, directeurs, inspecteurs, APE/COGES) au{" "}
              <strong>Ministère de l'Éducation Nationale</strong> pour identifier les signaux faibles, déclencher la riposte
              et maintenir les enfants dans les registres scolaires.
            </p>

            {/* Actions institutionnelles d'information et de consultation */}
            <div className="mt-8 sm:mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
              <a
                href="#dispositif"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-lg bg-white px-5 sm:px-6 py-2.5 sm:py-3.5 text-xs sm:text-sm font-bold text-[#0B2545] shadow-md transition hover:bg-slate-100"
              >
                <Radar size={17} />
                <span>Consulter le dispositif d'État</span>
                <ArrowRight size={15} />
              </a>
              <a
                href="#indicateurs"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/5 px-5 sm:px-6 py-2.5 sm:py-3.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <span>Référentiel des 7 indicateurs</span>
              </a>
            </div>

            {/* Chiffres clés en blanc pur */}
            <div className="mt-10 sm:mt-14 grid grid-cols-3 gap-4 sm:gap-6 border-t border-white/15 pt-6 sm:pt-8">
              <div className="text-center sm:text-left">
                <p className="text-2xl sm:text-3xl font-extrabold text-white">17</p>
                <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-slate-300 font-medium">Régions administratives</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-2xl sm:text-3xl font-extrabold text-white">351</p>
                <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-slate-300 font-medium">Communes du Burkina Faso</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-2xl sm:text-3xl font-extrabold text-white">Temps réel</p>
                <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-slate-300 font-medium">Remontée immédiate</p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── 3. LA DOCTRINE RÉPUBLICAINE DU DÉFI 1 ─────────────────── */}
      <section id="dispositif" className="mx-auto max-w-7xl px-4 py-12 sm:py-16 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="bg-institution/10 text-institution font-bold text-[11px] sm:text-xs uppercase tracking-wider">
            Doctrine Nationale · Défi 1
          </Badge>
          <h2 className="mt-2.5 sm:mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Un élève ne disparaît jamais du jour au lendemain
          </h2>
          <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
            Le décrochage scolaire est toujours précédé de signaux précurseurs : absences répétées, difficultés économiques,
            chocs climatiques ou sécuritaires locaux. Le protocole Faso Édu-Data permet d'intercepter ces alertes avant la déscolarisation définitive.
          </p>
        </div>

        {/* 3 piliers en couleurs pures sobres */}
        <div className="mt-8 sm:mt-12 grid gap-4 sm:gap-6 sm:grid-cols-3">
          <Card className="border-slate-200 shadow-sm transition hover:border-institution">
            <CardHeader className="pb-2 sm:pb-3">
              <span className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg bg-institution/10 text-institution mb-2">
                <Radar size={20} className="sm:size-[22px]" />
              </span>
              <CardTitle className="text-sm sm:text-base text-slate-900">1. Détection sur le Terrain</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-600 leading-relaxed">
                Les enseignants, directeurs d'école et comités APE/COGES qualifient directement les signaux faibles
                constatés en classe ou au sein des familles, via leur matricule DRH officiel.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm transition hover:border-institution">
            <CardHeader className="pb-2 sm:pb-3">
              <span className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-800 mb-2">
                <Scale size={20} className="sm:size-[22px]" />
              </span>
              <CardTitle className="text-sm sm:text-base text-slate-900">2. Analyse de Risque IRD</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-600 leading-relaxed">
                Le système calcule l'Indicateur de Risque de Décrochage (IRD) à l'échelle de chaque commune et
                province, cartographiant les foyers de vulnérabilité sans délai.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm transition hover:border-institution">
            <CardHeader className="pb-2 sm:pb-3">
              <span className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg bg-faso-green/15 text-faso-green mb-2">
                <Sparkles size={20} className="sm:size-[22px]" />
              </span>
              <CardTitle className="text-sm sm:text-base text-slate-900">3. Riposte & Ordres de Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-600 leading-relaxed">
                Le Cabinet Ministériel émet des ordres de mission ciblés, mobilise les comités de soutien et déploie les aides
                d'urgence appuyées par des synthèses stratégiques générées par IA.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── 4. CATALOGUE DES 7 SIGNAUX FAIBLES À SURVEILLER ────────── */}
      <section id="indicateurs" className="bg-slate-50 border-y border-slate-200 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8 sm:mb-10">
            <div className="max-w-2xl">
              <Badge className="bg-faso-red/10 text-faso-red font-bold text-[11px] uppercase tracking-wider">
                Référentiel Officiel
              </Badge>
              <h2 className="mt-2 text-xl sm:text-2xl font-bold text-slate-900">
                Les 7 indicateurs de vulnérabilité sous surveillance
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Chaque signalement transmis par un acteur éducatif est catégorisé selon son niveau de criticité régalien.
              </p>
            </div>
            <a
              href="#dispositif"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-institution hover:underline"
            >
              Comprendre l'analyse IRD <ArrowRight size={13} />
            </a>
          </div>

          <div className="grid gap-3 sm:gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.entries(INDICATEURS_DECROCHAGE) as [string, { label: string; poids: number }][]).map(
              ([cle, { label, poids }]) => {
                const estUrgenceVitale = poids >= 4;
                return (
                  <Card
                    key={cle}
                    className={estUrgenceVitale ? "border-l-4 border-l-faso-red bg-white" : "border-slate-200 bg-white"}
                  >
                    <CardContent className="p-3.5 sm:p-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-700">
                          <Radar size={15} className={estUrgenceVitale ? "text-faso-red" : "text-institution"} />
                        </span>
                        <Badge
                          className={
                            poids === 5
                              ? "bg-faso-red/15 text-faso-red font-bold text-[10px]"
                              : poids >= 4
                                ? "bg-slate-200 text-slate-800 text-[10px] font-semibold"
                                : "bg-slate-100 text-slate-600 text-[10px]"
                          }
                        >
                          Niveau {poids}/5
                        </Badge>
                      </div>
                      <h3 className="mt-2 text-xs sm:text-sm font-semibold text-slate-900">{label}</h3>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        {poids === 5
                          ? "Priorité nationale absolue · Intervention requise sans délai."
                          : poids >= 4
                            ? "Signal critique · Enquête et médiation scolaire prioritaires."
                            : "Signal modéré · Suivi régulier des registres de présence."}
                      </p>
                    </CardContent>
                  </Card>
                );
              }
            )}
          </div>
        </div>
      </section>

      {/* ── 5. SÉCURITÉ, DÉONTOLOGIE & PROTECTION DES DONNÉES ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8 lg:p-10 shadow-sm">
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded bg-institution/10 px-2.5 py-1 text-xs font-bold text-institution">
                <ShieldCheck size={14} /> Sécurité Républicaine & Confidentialité
              </div>
              <h2 className="mt-3 text-xl sm:text-2xl font-bold text-slate-900">
                Un cadre strict préservant l'anonymat des mineurs
              </h2>
              <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                La plateforme applique les principes de protection des données d'État. Aucun nom complet d'élève mineur
                n'est diffusé publiquement. Seules les données agrégées et les descriptions contextuelles remontent aux
                autorités de tutelle pour orienter les politiques de réintégration.
              </p>

              <div className="mt-4 sm:mt-5 space-y-2 sm:space-y-2.5">
                {[
                  "Authentification par matricule MENAPLN officiel vérifié auprès de la base DRH.",
                  "Verrouillage anti-doublon individuel par ordre de mission émis.",
                  "Conservation et archivage immuable des signalements transmis par le terrain.",
                  "Protection cryptographique des accès et isolation des espaces stratégiques.",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-normal">
                    <CheckCircle2 size={15} className="text-faso-green shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                Qui peut émettre un signalement ?
              </h3>
              <div className="space-y-2 sm:space-y-2.5">
                {[
                  {
                    role: "Enseignants",
                    desc: "Constat direct de l'absentéisme et de la baisse de scolarisation en classe.",
                  },
                  {
                    role: "Directeurs d'école",
                    desc: "Vérification des registres officiels, constats d'abandons silencieux.",
                  },
                  {
                    role: "Inspecteurs / Encadreurs",
                    desc: "Coordination pédagogique au niveau des circonscriptions et communes.",
                  },
                  {
                    role: "Représentants APE / COGES",
                    desc: "Lien de terrain avec les familles, orpaillage, transhumance, difficultés ménagères.",
                  },
                ].map((act, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 rounded bg-white p-2.5 border border-slate-200">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-institution text-white text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <strong className="text-xs font-semibold text-slate-900 block">{act.role}</strong>
                      <span className="text-[11px] text-slate-500 leading-snug">{act.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. ENGAGEMENT RÉPUBLICAIN & MOBILISATION NATIONALE ───────── */}
      <section className="bg-[#0B2545] text-white py-12 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Badge className="bg-white/10 text-white border border-white/20 text-[11px]">
            Engagement Républicain · Burkina Faso
          </Badge>
          <h2 className="mt-3 text-xl font-bold sm:text-3xl text-white">
            Une veille collective pour préserver le droit à l'éducation
          </h2>
          <p className="mx-auto mt-2.5 max-w-2xl text-xs sm:text-sm text-slate-200 leading-relaxed">
            Face au défi du décrochage scolaire, l'anticipation et la réactivité de l'ensemble de la communauté
            éducative constituent le premier rempart républicain pour garantir la continuité des parcours scolaires.
          </p>
          <div className="mt-6 sm:mt-7 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
            <a
              href="#dispositif"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-[#0B2545] shadow-md transition hover:bg-slate-100"
            >
              <Radar size={15} />
              <span>Revoir les 3 piliers du protocole</span>
            </a>
            <a
              href="#indicateurs"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/5 px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <span>Consulter les 7 indicateurs</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
