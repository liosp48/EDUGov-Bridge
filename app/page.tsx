import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Building2,
  CalendarClock,
  LogIn,
  MapPinned,
  Megaphone,
  Radar,
  ScanSearch,
  School,
  Users,
} from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { fetchConsultations, fetchSignalements } from "@/lib/supabase";
import { REGIONS } from "@/lib/geographie";
import { formatDateFr } from "@/lib/utils";
import { CATEGORIE_COLORS, CATEGORIE_LABELS, type CategorieSignalement } from "@/types/database";

// Missions dynamiques : la consultation de la base doit refléter l'instant (t)
export const dynamic = "force-dynamic";

// ── Les 3 axes d'impact opérationnel (défis Data Challenge Burkina 2026) ──
const MISSIONS_IMPACT: {
  n: number;
  defi: string;
  titre: string;
  desc: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    style?: React.CSSProperties;
  }>;
  categories: CategorieSignalement[];
  color: string;
}[] = [
  {
    n: 1,
    defi: "Défi Décrochage Scolaire",
    titre: "Alerte Précoce & Détection des Signaux Faibles",
    desc: "Remontée directe du terrain : chaque signal géolocalisé permet d'intercepter le décrochage avant qu'il ne survienne (absences, transhumance, orpaillage, mariages précoces).",
    icon: Radar,
    categories: ["decrochage", "pedagogie"],
    color: CATEGORIE_COLORS.decrochage,
  },
  {
    n: 2,
    defi: "Défi Inégalités & Équité",
    titre: "Cartographie Terrain des Barrières d'Accès",
    desc: "Mesure micro-locale des difficultés physiques (distance, routes), économiques (frais annexes) et de genre ( sanitaires, bourses, sécurité des filles), école par école.",
    icon: ScanSearch,
    categories: ["genre_rural", "securite"],
    color: CATEGORIE_COLORS.genre_rural,
  },
  {
    n: 3,
    defi: "Défi Infrastructures & Ressources",
    titre: "Inventaire Dynamique Collaboratif",
    desc: "Remontée en temps réel des besoins urgents : tables-bancs, toitures, latrines, salles de classe et matériel — un inventaire collaboratif actualisé en continu.",
    icon: Boxes,
    categories: ["infrastructure"],
    color: CATEGORIE_COLORS.infrastructure,
  },
];

const ACTEURS = [
  {
    icon: Users,
    titre: "Enseignants",
    texte: "Signalement des signaux faibles de décrochage, besoins pédagogiques et propositions d'innovation.",
  },
  {
    icon: School,
    titre: "Directeurs d'école",
    texte: "Inventaire d'urgence des infrastructures : tables-bancs, latrines, toitures, effectifs réels.",
  },
  {
    icon: Building2,
    titre: "Inspecteurs pédagogiques",
    texte: "Diagnostic de la qualité pédagogique et cartographie des besoins de formation.",
  },
  {
    icon: Megaphone,
    titre: "APE / COGES",
    texte: "Retours sur les contraintes socio-économiques, l'accès physique et la sécurité des enfants.",
  },
];

export default async function LandingPage() {
  const [consultations, signalements] = await Promise.all([
    fetchConsultations(),
    fetchSignalements(),
  ]);

  // ── Missions en cours : consultations ouvertes du système ──
  const missions = consultations.filter((c) => c.statut === "ouverte");

  // ── Activités de terrain alimentant ces missions (information publique) ──
  const activites = [...signalements]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 3);
  const compteCategorie = new Map<CategorieSignalement, number>();
  for (const s of signalements) {
    compteCategorie.set(s.categorie, (compteCategorie.get(s.categorie) ?? 0) + 1);
  }
  const parCategorie = (Object.keys(CATEGORIE_LABELS) as CategorieSignalement[])
    .map((c) => ({ categorie: c, n: compteCategorie.get(c) ?? 0 }))
    .filter((d) => d.n > 0)
    .sort((a, b) => b.n - a.n);
  const total = signalements.length;

  return (
    <>
      {/* ── HERO PUBLIC ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-institution text-white">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-faso-green/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <Badge className="bg-white/10 text-faso-gold">
            Data Challenge Burkina 2026 · Semaine du Numérique, Volet Éducation
          </Badge>
          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Les missions opérationnelles de l'éducation, à découvert.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-100/90">
            EDUGov-Bridge relie le terrain burkinabè au cœur de l'administration : chaque signal
            remonté, chaque consultation en cours et chaque innovation citoyenne est documenté ici,
            pour tous. De Ouagadougou à Dori, chaque signal compte.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#missions"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 font-semibold text-institution transition hover:bg-slate-100"
            >
              <CalendarClock size={18} /> Voir les missions en cours
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
            {[
              { label: "Missions en cours", value: missions.length },
              { label: "Régions couvertes", value: REGIONS.length },
              { label: "Signalements actifs", value: total },
              {
                label: "Innovations proposées",
                value: signalements.filter((s) => s.proposition_innovation).length,
              },
            ].map((k) => (
              <div key={k.label}>
                <dd className="text-3xl font-extrabold text-faso-gold">{k.value}</dd>
                <dt className="mt-1 text-sm text-slate-100/80">{k.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── MISSIONS EN COURS (SECTEUR CENTRAL) ──────────────────── */}
      <section id="missions" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Missions en cours</h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              Trois axes d'impact opérationnel couvrent chacun un défi du concours. Chaque
              consultation ouverte et chaque signal de terrain alimente directement l'un de ces
              axes — en toute transparence.
            </p>
          </div>
          <MapPinned className="hidden shrink-0 text-institution sm:block" size={36} />
        </div>

        {/* 3 axes d'impact — défis du Data Challenge Burkina 2026 */}
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {MISSIONS_IMPACT.map((m) => {
            const nbSignals = m.categories.reduce(
              (acc, c) => acc + (compteCategorie.get(c) ?? 0),
              0
            );
            return (
              <Card key={m.n} className="border-l-4" style={{ borderLeftColor: m.color }}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <Badge color={m.color}>Mission {m.n}</Badge>
                    <span className="text-xs text-slate-500">{m.defi}</span>
                  </div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <m.icon size={22} style={{ color: m.color }} /> {m.titre}
                  </CardTitle>
                  <p className="text-sm text-slate-600">{m.desc}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {nbSignals} signalement(s) de terrain alimente(nt) cet axe ·{" "}
                    {m.categories.map((c) => CATEGORIE_LABELS[c].toLowerCase()).join(" + ")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Consultations ouvertes — concrétisations opérationnelles des missions */}
        <h3 className="mt-12 text-lg font-bold text-slate-900">
          Consultations ouvertes attachées aux missions
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Les adresses ciblées sont affichées en toute transparence.
        </p>

        {missions.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="p-6 text-sm text-slate-600">
              Aucune mission active pour le moment. Revenez après le lancement de la prochaine
              consultation nationale.
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8 space-y-4">
            {missions.map((m) => (
              <Card key={m.id} className="border-l-4 border-l-faso-green">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-faso-green/10 text-faso-green">
                      <CalendarClock size={13} /> Ouverte
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-600">
                      {m.region_cible ? `Ciblée · ${m.commune_cible ?? m.province_cible ?? m.region_cible}` : "Ciblée · Tout le territoire"}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      Publiée le {formatDateFr(m.date_publication)}
                      {m.date_cloture ? ` · clôture le ${formatDateFr(m.date_cloture)}` : ""}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{m.titre}</CardTitle>
                  <p className="text-sm text-slate-600">{m.question}</p>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Répartition publique des activités de terrain */}
        {parCategorie.length > 0 && (
          <div className="mt-10">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Activités de terrain en cours — répartition publique
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {parCategorie.map(({ categorie, n }) => (
                <div
                  key={categorie}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-card"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORIE_COLORS[categorie] }}
                  />
                  <p className="mt-2 text-2xl font-bold text-slate-900">{n}</p>
                  <p className="text-xs text-slate-500">{CATEGORIE_LABELS[categorie]}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── CE QUE LE TERRAIN TRAVAILLE EN CE MOMENT ─────────────── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900">Ce que le terrain travaille, en ce moment</h2>
          <p className="mt-2 text-slate-600">
            Extraits publics, géolocalisés et catégorisés, du flux remonté par les acteurs
            opérationnels.
          </p>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {activites.map((s) => (
              <Card key={s.id}>
                <CardHeader>
                  <p className="text-xs text-slate-500">
                    {formatDateFr(s.created_at)} · {s.etablissement}, {s.commune} ({s.region})
                  </p>
                  <CardTitle className="line-clamp-2">{s.description.slice(0, 110)}…</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge color={CATEGORIE_COLORS[s.categorie]}>{CATEGORIE_LABELS[s.categorie]}</Badge>
                  <p className="mt-2 text-xs text-slate-500">
                    Gravité : {s.gravite}/5 · {ROLE_FR(s.role_emetteur)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── LES 4 ACTEURS OPÉRATIONNELS ────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-slate-900">Quatre acteurs, une même voix</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ACTEURS.map((a) => (
            <Card key={a.titre}>
              <CardHeader>
                <a.icon className="text-institution" size={26} />
                <CardTitle className="mt-2">{a.titre}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{a.texte}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL (accès authentifié uniquement) ────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <div className="rounded-2xl bg-institution px-6 py-12 text-center text-white sm:px-12">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Prêt à rejoindre les missions en cours ?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-100/85">
            L'accès aux espaces de travail est protégé : chaque profil est orienté automatiquement
            vers ses responsabilités après une connexion vérifiée.
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

function ROLE_FR(role: string): string {
  const map: Record<string, string> = {
    enseignant: "Enseignant",
    directeur_ecole: "Directeur d'école",
    inspecteur: "Inspecteur",
    representant_parents: "APE/COGES",
  };
  return map[role] ?? role;
}
