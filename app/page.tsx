import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  BrainCircuit,
  CalendarClock,
  LogIn,
  MapPinned,
  Radar,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { fetchSignalements } from "@/lib/supabase";
import { REGIONS } from "@/lib/geographie";
import {
  IRD_SEUILS,
  calculerIRD,
  elevesEnDanger,
  ecolesEnAlerteCritique,
  niveauDeRisque,
  zonesTouchees,
} from "@/lib/decrochage";
import { formatDateFr } from "@/lib/utils";

// Missions dynamiques : la consultation de la base doit refléter l'instant (t)
export const dynamic = "force-dynamic";

// ── Les 3 rouages du dispositif anti-décrochage (Défi 1) ──
const ROUAGES = [
  {
    n: 1,
    titre: "Alerte Précoce du Terrain",
    desc: "Enseignants et directeurs signalent en 2 minutes les signaux faibles : absentéisme répété, difficultés financières, chocs sécuritaires ou climatiques, mariages précoces, abandon silencieux.",
    icon: Radar,
  },
  {
    n: 2,
    titre: "Tableau de Bord Ministériel",
    desc: "L'Indicateur Global de Risque (IRD /100), les écoles en alerte critique et les élèves en danger sont calculés en continu, filtrables par Région → Province → Commune.",
    icon: ShieldAlert,
  },
  {
    n: 3,
    titre: "Ministre Brief IA",
    desc: "Un clic : l'IA analyse les remontées de la semaine et produit les zones les plus menacées, les causes principales chiffrées et un plan d'action d'urgence ciblé.",
    icon: BrainCircuit,
  },
];

export default async function LandingPage() {
  const signalements = await fetchSignalements();

  // ── Chiffres publics du dispositif ──
  const ird = calculerIRD(signalements);
  const niveau = niveauDeRisque(ird);
  const ecoles = ecolesEnAlerteCritique(signalements);
  const eleves = elevesEnDanger(signalements);
  const alertesSemaine = signalements.filter(
    (s) => +new Date(s.created_at) >= Date.now() - 7 * 24 * 60 * 60 * 1000
  ).length;
  const regionsTouchees = new Set(signalements.map((s) => s.region)).size;

  const topZones = zonesTouchees(signalements, "region").slice(0, 5);
  const dernieres = [...signalements]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 3);

  return (
    <>
      {/* ── HERO PUBLIC — MISSION UNIQUE : DÉCROCHAGE ────────────── */}
      <section className="relative overflow-hidden bg-institution text-white">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-faso-red/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <Badge className="bg-white/10 text-faso-gold">
            Data Challenge Burkina 2026 · Défi n°1 — Anticipation du décrochage scolaire
          </Badge>
          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Chaque enfant déscolarisé a d'abord été un signal ignoré.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-100/90">
            EDUGov-Bridge transforme l'observation des enseignants en riposte nationale : les
            signaux faibles du décrochage remontés du terrain burkinabè deviennent des alertes
            chiffrées, cartographiées et traduites en plans d'urgence — de Dori à Bobo-Dioulasso.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#dispositif"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 font-semibold text-institution transition hover:bg-slate-100"
            >
              <CalendarClock size={18} /> Découvrir le dispositif
            </Link>
            <Link
              href="/auth"
              className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/30 px-6 font-semibold text-white transition hover:bg-white/10"
            >
              <LogIn size={18} /> Connexion sécurisée
            </Link>
          </div>

          {/* Bandeau chiffres — transparence publique */}
          <dl className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div>
              <dd className="text-3xl font-extrabold text-faso-gold">{eleves}</dd>
              <dt className="mt-1 text-sm text-slate-100/80">Élèves signalés en danger</dt>
            </div>
            <div>
              <dd className="text-3xl font-extrabold text-faso-gold">{ecoles.length}</dd>
              <dt className="mt-1 text-sm text-slate-100/80">Écoles en alerte critique</dt>
            </div>
            <div>
              <dd className="text-3xl font-extrabold text-faso-gold">
                {ird}/100
              </dd>
              <dt className="mt-1 text-sm text-slate-100/80">IRD national · risque {niveau}</dt>
            </div>
            <div>
              <dd className="text-3xl font-extrabold text-faso-gold">{alertesSemaine}</dd>
              <dt className="mt-1 text-sm text-slate-100/80">Alertes cette semaine</dt>
            </div>
          </dl>
        </div>
      </section>

      {/* ── LES 3 ROUAGES DU DISPOSITIF ──────────────────────────── */}
      <section id="dispositif" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Trois rouages, une seule mission : intercepter le décrochage avant qu'il ne survienne
            </h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              Du banc de l'école au cabinet du ministre, le signal parcourt trois étapes en moins
              d'une semaine — sans paperasse, sans perte d'information.
            </p>
          </div>
          <MapPinned className="hidden shrink-0 text-institution sm:block" size={36} />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {ROUAGES.map((m) => (
            <Card key={m.n} className="border-l-4 border-l-faso-red">
              <CardHeader>
                <Badge className="bg-faso-red/10 text-faso-red">Rouage {m.n}</Badge>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <m.icon size={22} className="text-faso-red" /> {m.titre}
                </CardTitle>
                <p className="text-sm text-slate-600">{m.desc}</p>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Zones les plus touchées — information publique agrégée */}
        {topZones.length > 0 && (
          <div className="mt-12">
            <h3 className="text-lg font-bold text-slate-900">
              Régions les plus touchées, en ce moment
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Agrégation publique des alertes décrochage — jamais de données nominatives.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {topZones.map((z) => (
                <div key={z.nom} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                  <p className="text-sm font-semibold text-slate-800">{z.nom}</p>
                  <p className="mt-1 text-2xl font-bold text-faso-red">{z.ird}</p>
                  <p className="text-xs text-slate-500">
                    IRD {z.ird >= IRD_SEUILS.eleve ? "élevé" : z.ird >= IRD_SEUILS.moyen ? "moyen" : "maîtrisé"} ·{" "}
                    {z.eleves} élève(s)
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── DERNIÈRES ALERTES DU TERRAIN (anonymes) ─────────────── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900">Ce que le terrain signale, en ce moment</h2>
          <p className="mt-2 text-slate-600">
            Extraits publics et géolocalisés des alertes précoces remontées par les enseignants,
            directeurs et parents — la description protège l'identité des élèves.
          </p>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {dernieres.map((s) => (
              <Card key={s.id}>
                <CardHeader>
                  <p className="text-xs text-slate-500">
                    {formatDateFr(s.created_at)} · {s.etablissement}, {s.commune} ({s.region})
                  </p>
                  <CardTitle className="line-clamp-2">{s.description.slice(0, 110)}…</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className="bg-faso-red/10 text-faso-red">
                    <BellRing size={13} /> Alerte décrochage
                  </Badge>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Users size={13} /> {s.nb_eleves_risque} élève(s) en danger · gravité {s.gravite}/5
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── POUR QUI ? ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-slate-900">Deux espaces, une même bataille</h2>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Radar className="text-institution" size={26} />
              <CardTitle className="mt-2">Espace Terrain — Enseignants & Directeurs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Vous voyez l'élève qui s'absente, la famille qui se serre la ceinture, la fille qui
                disparaît des registres. Déclarez en 2 minutes : votre alerte rejoint
                instantanément le radar national, protégée et anonymisée.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <BrainCircuit className="text-faso-green" size={26} />
              <CardTitle className="mt-2">Espace Ministère — Décideurs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                IRD par territoire, écoles en alerte critique, élèves en danger : le tableau de bord
                dédié au décrochage, complété par un brief IA qui transforme les alertes de la
                semaine en plan d'urgence ciblé.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── CTA FINAL (accès authentifié uniquement) ────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <div className="rounded-2xl bg-institution px-6 py-12 text-center text-white sm:px-12">
          <h2 className="text-2xl font-bold sm:text-3xl">
            {REGIONS.length} régions couvertes · un seul objectif : zéro enfant perdu
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-100/85">
            L'accès aux espaces de travail est protégé : le terrain rejoint l'Alerte Précoce, les
            décideurs gouvernementaux le Tableau de Bord Anti-Décrochage — après une connexion
            vérifiée.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/auth"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 font-semibold text-institution transition hover:bg-slate-100"
            >
              Connexion sécurisée <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
