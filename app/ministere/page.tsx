"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BrainCircuit,
  ClipboardList,
  Filter,
  Landmark,
  Loader2,
  MapPin,
  Megaphone,
  Send,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import KpiCard from "@/components/kpi-card";
import GeoSelector from "@/components/geo-selector";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@/components/ui";
import {
  fetchConsultations,
  fetchSignalements,
  insertConsultation,
  isSupabaseConfigured,
} from "@/lib/supabase";
import {
  type BriefDecrochage,
  type Consultation,
  type Signalement,
} from "@/types/database";
import {
  GEO_BURKINA,
  provincesOf,
  communesOf,
} from "@/lib/geographie";
import {
  IRD_SEUILS,
  calculerIRD,
  causesPrincipales,
  ecolesEnAlerteCritique,
  elevesEnDanger,
  niveauDeRisque,
  zonesTouchees,
} from "@/lib/decrochage";
import { formatDateFr } from "@/lib/utils";
import {
  chargerSession,
  effacerSession,
  type SessionUtilisateur,
} from "@/lib/auth";
import { deconnexion as deconnexionServeur } from "@/app/auth/actions";
import { Building2, LogOut, ShieldCheck } from "lucide-react";

type Onglet = "strategie" | "brief" | "consultations";

/** Couleur d'une cellule de la carte thermique selon l'IRD (/100) */
function couleurIRD(ird: number): string {
  if (ird === 0) return "bg-slate-100 text-slate-400";
  if (ird >= IRD_SEUILS.eleve + 20) return "bg-faso-red/20 text-faso-red";
  if (ird >= IRD_SEUILS.eleve) return "bg-faso-red/10 text-faso-red";
  if (ird >= IRD_SEUILS.moyen) return "bg-amber-100 text-amber-700";
  return "bg-faso-green/15 text-faso-green";
}

export default function MinisterePage() {
  const router = useRouter();
  const [onglet, setOnglet] = useState<Onglet>("strategie");
  const [session, setSession] = useState<SessionUtilisateur | null>(null);

  // ── Garde strict : réservé aux décideurs authentifiés via email officiel ──
  useEffect(() => {
    const s = chargerSession();
    if (!s || s.type_compte !== "gouvernement") {
      router.replace("/auth");
      return;
    }
    setSession(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deconnexion = () => {
    void (async () => {
      await deconnexionServeur();
      effacerSession();
      router.push("/auth");
      router.refresh();
    })();
  };

  // Données
  const [signalements, setSignalements] = useState<Signalement[] | null>(null);
  const [chargement, setChargement] = useState(true);

  // Filtres géographiques (Région → Province → Commune)
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [commune, setCommune] = useState("");

  // Ministre Brief IA (Défi 1)
  const [brief, setBrief] = useState<BriefDecrochage | null>(null);
  const [iaEnCours, setIaEnCours] = useState(false);
  const [iaErreur, setIaErreur] = useState<string | null>(null);

  // Lancement de consultation
  const [titreConsult, setTitreConsult] = useState("");
  const [questionConsult, setQuestionConsult] = useState("");
  const [consultRegion, setConsultRegion] = useState("");
  const [consultProvince, setConsultProvince] = useState("");
  const [consultCommune, setConsultCommune] = useState("");
  const [consultEnvoi, setConsultEnvoi] = useState(false);
  const [consultSucces, setConsultSucces] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const data = await fetchSignalements();
      setSignalements(data);
      setChargement(false);
    })();
  }, []);

  // ── Filtrage géographique : uniquement les alertes de décrochage ──
  const filtres = useMemo(() => {
    return (signalements ?? []).filter(
      (s) =>
        (!region || s.region === region) &&
        (!province || s.province === province) &&
        (!commune || s.commune === commune)
    );
  }, [signalements, region, province, commune]);

  // ── KPIs du Défi 1 ────────────────────────────────────────────
  const kpis = useMemo(() => {
    const ird = calculerIRD(filtres);
    const ecr = ecolesEnAlerteCritique(filtres);
    const semaine = filtres.filter(
      (s) => +new Date(s.created_at) >= Date.now() - 7 * 24 * 60 * 60 * 1000
    );
    return {
      ird,
      niveau: niveauDeRisque(ird),
      ecolesCritiques: ecr,
      eleves: elevesEnDanger(filtres),
      alertesSemaine: semaine.length,
      total: filtres.length,
    };
  }, [filtres]);

  // ── Carte thermique à granularité progressive ─────────────────
  const heatmap = useMemo(() => {
    const base = filtres;
    if (commune) {
      return [
        {
          nom: `${commune} (${province}, ${region})`,
          alertes: base.length,
          eleves: kpis.eleves,
          ird: kpis.ird,
        },
      ];
    }
    if (province) return zonesTouchees(base, "commune");
    if (region) return zonesTouchees(base, "province");
    return zonesTouchees(base, "region");
  }, [filtres, region, province, commune, kpis]);

  // ── Causes principales (indicateurs) — graphique ──────────────
  const parCause = useMemo(() => {
    return causesPrincipales(filtres)
      .slice(0, 7)
      .map((c) => ({ nom: c.label, alertes: c.n }));
  }, [filtres]);

  // ── Zones les plus touchées (liste prioritée) ─────────────────
  const topZones = useMemo(() => zonesTouchees(filtres, "commune").slice(0, 6), [filtres]);

  // ── Ministre Brief IA ─────────────────────────────────────────
  const lancerBrief = async () => {
    setIaEnCours(true);
    setIaErreur(null);
    setBrief(null);
    try {
      const res = await fetch("/api/synthese-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signalements: filtres,
          cible: {
            region: region || undefined,
            province: province || undefined,
            commune: commune || undefined,
          },
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      setBrief((await res.json()) as BriefDecrochage);
    } catch {
      setIaErreur("Impossible de générer le brief. Vérifiez l'API IA puis réessayez.");
    } finally {
      setIaEnCours(false);
    }
  };

  // ── Lancer une consultation ciblée ────────────────────────────
  const publierConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (titreConsult.trim().length < 5 || questionConsult.trim().length < 20) return;
    setConsultEnvoi(true);
    const result = await insertConsultation({
      titre: titreConsult.trim(),
      question: questionConsult.trim(),
      region_cible: consultRegion || null,
      province_cible: consultProvince || null,
      commune_cible: consultCommune || null,
      date_cloture: null,
    });
    setConsultEnvoi(false);
    if (result.ok) {
      setConsultSucces(
        result.mode === "supabase"
          ? "✅ Consultation publiée dans la base nationale."
          : "✅ Consultation enregistrée en mode démo (les acteurs de la zone la verraient immédiatement)."
      );
      setTitreConsult("");
      setQuestionConsult("");
      setConsultRegion("");
      setConsultProvince("");
      setConsultCommune("");
    }
  };

  // ── Gardes-fous d'affichage (APRÈS tous les hooks — règle React) ──
  if (!session) {
    return (
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-24 text-slate-600">
        <Loader2 className="animate-spin text-institution" size={24} />
        Vérification de votre accès gouvernemental… redirection vers la connexion sécurisée.
      </div>
    );
  }

  if (chargement) {
    return (
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-24 text-slate-600">
        <Loader2 className="animate-spin text-institution" size={24} />
        Chargement du Tableau de Bord Anti-Décrochage…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
            <Landmark className="text-institution" size={28} /> Tableau de Bord Anti-Décrochage
          </h1>
          <p className="mt-1 text-slate-600">
            Défi 1 — Anticipation & riposte ·{" "}
            {isSupabaseConfigured ? "Données Supabase en direct" : "Mode démo (données réalistes)"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-faso-red/10 text-faso-red">
            {kpis.total} alertes dans le périmètre
          </Badge>
          <Card className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-faso-green/10 text-faso-green">
              <Building2 size={18} />
            </span>
            <div className="text-left">
              <p className="text-sm font-semibold leading-tight text-slate-800">{session.nom}</p>
              <p className="flex items-center gap-1 text-xs text-faso-green">
                <ShieldCheck size={12} /> {session.email}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={deconnexion} aria-label="Se déconnecter">
              <LogOut size={15} /> Quitter
            </Button>
          </Card>
        </div>
      </div>

      {/* Filtres géographiques */}
      <Card className="mt-6">
        <CardContent className="p-4 pt-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
            <Filter size={15} /> Filtre Région / Province / Commune
          </p>
          <GeoSelector
            region={region}
            province={province}
            commune={commune}
            withEtablissement={false}
            onChange={(patch) => {
              if (patch.region !== undefined) {
                setRegion(patch.region);
                setProvince("");
                setCommune("");
              }
              if (patch.province !== undefined) {
                setProvince(patch.province);
                setCommune("");
              }
              if (patch.commune !== undefined) setCommune(patch.commune);
            }}
          />
        </CardContent>
      </Card>

      {/* Onglets */}
      <div className="mt-6 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-card">
        {(
          [
            { key: "strategie", label: "Vue stratégique" },
            { key: "brief", label: "Ministre Brief IA — Décrochage" },
            { key: "consultations", label: "Consultations" },
          ] as { key: Onglet; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setOnglet(t.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              onglet === t.key ? "bg-institution text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ VUE STRATÉGIQUE ══════════ */}
      {onglet === "strategie" && (
        <div className="mt-6 space-y-6">
          {/* KPIs clés du Défi 1 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Indicateur Global de Risque (IRD)"
              value={`${kpis.ird}/100`}
              hint={
                kpis.total === 0
                  ? "Aucune alerte sur le périmètre"
                  : `Risque ${kpis.niveau} · ${kpis.alertesSemaine} alerte(s) cette semaine`
              }
              accent={
                kpis.ird >= IRD_SEUILS.eleve
                  ? "red"
                  : kpis.ird >= IRD_SEUILS.moyen
                    ? "blue"
                    : "green"
              }
            />
            <KpiCard
              label="Écoles en Alerte Critique"
              value={kpis.ecolesCritiques.length}
              hint={
                kpis.ecolesCritiques.length > 0
                  ? kpis.ecolesCritiques.slice(0, 3).join(", ") +
                    (kpis.ecolesCritiques.length > 3 ? "…" : "")
                  : "Aucune école en criticité ≥ 4/5"
              }
              accent={kpis.ecolesCritiques.length > 0 ? "red" : "green"}
            />
            <KpiCard
              label="Élèves signalés en danger"
              value={kpis.eleves}
              hint="En danger de déscolarisation sur le périmètre"
              accent={kpis.eleves > 0 ? "red" : "green"}
            />
            <KpiCard
              label="Alertes de la semaine"
              value={kpis.alertesSemaine}
              hint="Remontées terrain des 7 derniers jours"
              accent="blue"
            />
          </div>

          {/* Carte thermique — liste filtrée des zones les plus touchées */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin size={18} className="text-institution" /> Carte thermique — zones les plus
                touchées
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {region
                    ? province
                      ? `granularité : communes de ${province}`
                      : `granularité : provinces de ${region}`
                    : "granularité : régions"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {heatmap.map((h) => (
                  <button
                    key={h.nom}
                    onClick={() => {
                      // Drill-down : région → province → commune
                      if (!region) {
                        const trouve = GEO_BURKINA.find(
                          (r) => h.nom.startsWith(r.nom) || h.nom === r.nom
                        );
                        setRegion(trouve?.nom ?? h.nom);
                      } else if (!province) {
                        const candidat = provincesOf(region).find((p) => h.nom.startsWith(p));
                        if (candidat) setProvince(candidat);
                      } else if (!commune) {
                        const candidat = communesOf(region, province).find((c) =>
                          h.nom.startsWith(c)
                        );
                        if (candidat) setCommune(candidat);
                      }
                    }}
                    className={`rounded-lg border border-slate-200 px-3 py-3 text-left transition hover:ring-2 hover:ring-institution/40 ${couleurIRD(h.ird)} ${
                      (commune && h.nom.startsWith(commune)) ||
                      (!commune && province && h.nom.startsWith(province)) ||
                      (!commune && !province && region && h.nom.startsWith(region))
                        ? "ring-2 ring-institution"
                        : ""
                    }`}
                  >
                    <p className="text-sm font-semibold">{h.nom}</p>
                    <p className="text-xs opacity-80">
                      IRD {h.ird}/100 · {h.alertes} alerte(s) · {h.eleves} élève(s)
                    </p>
                  </button>
                ))}
                {heatmap.length === 0 && (
                  <p className="py-6 text-sm text-slate-500">
                    Aucune alerte sur ce périmètre.
                  </p>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Cliquer sur une zone descend d'un niveau (région → province → commune). L'intensité
                de couleur reflète l'IRD local.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Causes profondes identifiées par le terrain */}
            <Card>
              <CardHeader>
                <CardTitle>Causes profondes identifiées par le terrain</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {parCause.length === 0 ? (
                  <p className="pt-16 text-center text-sm text-slate-500">
                    Aucune donnée sur ce périmètre.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={parCause} layout="vertical" margin={{ left: 60, right: 16 }}>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis type="number" allowDecimals={false} fontSize={12} />
                      <YAxis
                        type="category"
                        dataKey="nom"
                        width={180}
                        fontSize={11}
                        tickFormatter={(v: string) =>
                          v.length > 34 ? `${v.slice(0, 33)}…` : v
                        }
                      />
                      <Tooltip />
                      <Bar
                        dataKey="alertes"
                        name="Alertes"
                        fill="#EF2B2D"
                        radius={[0, 4, 4, 0]}
                        barSize={14}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top zones prioritaires */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert size={18} className="text-faso-red" /> Zones prioritaires (communes)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="divide-y divide-slate-100">
                  {topZones.map((z, i) => (
                    <li key={z.nom} className="flex items-center gap-3 py-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          i === 0 ? "bg-faso-red text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{z.nom}</p>
                        <p className="text-xs text-slate-500">
                          {z.alertes} alerte(s) · {z.eleves} élève(s) en danger
                        </p>
                      </div>
                      <Badge
                        className={
                          z.ird >= IRD_SEUILS.eleve
                            ? "bg-faso-red/10 text-faso-red"
                            : "bg-amber-100 text-amber-700"
                        }
                      >
                        IRD {z.ird}
                      </Badge>
                    </li>
                  ))}
                  {topZones.length === 0 && (
                    <li className="py-6 text-center text-sm text-slate-500">
                      Aucune alerte sur ce périmètre.
                    </li>
                  )}
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* Dernières alertes brutes */}
          <Card>
            <CardHeader>
              <CardTitle>Dernières alertes du périmètre</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100">
              {filtres.slice(0, 8).map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-800">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          s.gravite >= 4 ? "bg-faso-red" : "bg-amber-400"
                        }`}
                      />
                      {s.etablissement} — {s.commune} ({s.region})
                      {s.nb_eleves_risque > 0 && (
                        <Badge className="bg-faso-red/10 text-faso-red">
                          <Users size={12} /> {s.nb_eleves_risque} élève(s)
                        </Badge>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDateFr(s.created_at)} · gravité {s.gravite}/5 · signaux :{" "}
                      {s.indicateurs.length > 0 ? s.indicateurs.length : 0} indicateur(s)
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{s.description}</p>
                  </div>
                </div>
              ))}
              {filtres.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-500">
                  Aucune alerte sur ce périmètre.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════ MINISTRE BRIEF IA — DÉCROCHAGE ══════════ */}
      {onglet === "brief" && (
        <div className="mt-6 space-y-6">
          <Card className="border-2 border-institution/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BrainCircuit className="text-institution" size={24} /> Ministre Brief IA —
                Décrochage en 1 clic
              </CardTitle>
              <p className="text-sm text-slate-600">
                {filtres.length} alertes du périmètre
                {region ? ` (${commune || province || region})` : " (national)"} seront analysées
                pour produire : les zones les plus menacées, les causes principales identifiées par
                le terrain, et un plan d'action d'urgence.
              </p>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                onClick={() => void lancerBrief()}
                disabled={iaEnCours || filtres.length === 0}
              >
                {iaEnCours ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                {iaEnCours
                  ? "Analyse IA en cours — lecture des alertes de la semaine…"
                  : filtres.length === 0
                    ? "Aucune alerte à analyser sur ce périmètre"
                    : "✦ Générer le Brief Stratégique Décrochage"}
              </Button>
              {iaErreur && (
                <p className="mt-4 rounded-lg border border-faso-red/30 bg-faso-red/10 px-4 py-3 text-sm text-faso-red">
                  {iaErreur}
                </p>
              )}
            </CardContent>
          </Card>

          {brief && (
            <div className="space-y-4">
              <Badge
                className={
                  brief.fondement_ia
                    ? "bg-faso-green/10 text-faso-green"
                    : "bg-amber-100 text-amber-700"
                }
              >
                {brief.fondement_ia
                  ? "Généré par IA sur les alertes de la semaine"
                  : "Analyse locale déterministe (clé IA non configurée) — démo fiable"}
              </Badge>

              {/* a) Zones les plus menacées */}
              <Card className="border-l-4 border-l-faso-red">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin size={18} className="text-faso-red" /> a · Zones géographiques les plus
                    menacées en ce moment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {brief.zones_menacees.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune zone ressortie du corpus.</p>
                  ) : (
                    <ol className="space-y-3">
                      {brief.zones_menacees.map((z, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-700">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-faso-red text-xs font-bold text-white">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{z}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>

              {/* b) Causes principales */}
              <Card className="border-l-4 border-l-amber-400">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500" /> b · Causes principales
                    identifiées par le terrain
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {brief.causes_principales.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune cause ressortie du corpus.</p>
                  ) : (
                    <ul className="space-y-2">
                      {brief.causes_principales.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"
                        >
                          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
                          <span className="leading-relaxed">{c}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* c) Plan d'action d'urgence */}
              <Card className="border-l-4 border-l-institution">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send size={18} className="text-institution" /> c · Plan d'action d'urgence
                    recommandé
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {brief.plan_action}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ══════════ CONSULTATIONS ══════════ */}
      {onglet === "consultations" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Lancer une consultation ciblée */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone size={18} className="text-institution" /> Lancer une consultation ciblée
              </CardTitle>
              <p className="text-sm text-slate-600">
                Le questionnaire sera visible instantanément par les acteurs de la zone ciblée.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={publierConsultation} className="space-y-4">
                <div>
                  <Label htmlFor="titre">Titre</Label>
                  <Input
                    id="titre"
                    placeholder="Ex : Riposte décrochage URGENT — Dori"
                    value={titreConsult}
                    onChange={(e) => setTitreConsult(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="question">Question aux acteurs</Label>
                  <Textarea
                    id="question"
                    rows={4}
                    placeholder="Ex : Quelles mesures locales permettent de retrouver la trace des élèves disparus des registres en moins de 7 jours ?"
                    value={questionConsult}
                    onChange={(e) => setQuestionConsult(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Ciblage géographique (laisser vide = national)</Label>
                  <GeoSelector
                    region={consultRegion}
                    province={consultProvince}
                    commune={consultCommune}
                    withEtablissement={false}
                    onChange={(patch) => {
                      if (patch.region !== undefined) {
                        setConsultRegion(patch.region);
                        setConsultProvince("");
                        setConsultCommune("");
                      }
                      if (patch.province !== undefined) {
                        setConsultProvince(patch.province);
                        setConsultCommune("");
                      }
                      if (patch.commune !== undefined) setConsultCommune(patch.commune);
                    }}
                  />
                </div>
                {consultSucces && (
                  <p className="rounded-lg border border-faso-green/30 bg-faso-green/10 px-4 py-3 text-sm text-faso-green">
                    {consultSucces}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={consultEnvoi || titreConsult.trim().length < 5 || questionConsult.trim().length < 20}
                >
                  {consultEnvoi ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  Publier la consultation
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Liste dynamique des consultations actives */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList size={18} className="text-institution" /> Consultations récentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ListeConsultations recharger={consultSucces} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ListeConsultations({ recharger }: { recharger: string | null }) {
  const [items, setItems] = useState<Consultation[] | null>(null);

  useEffect(() => {
    void (async () => setItems(await fetchConsultations()))();
  }, [recharger]);

  if (!items) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="animate-spin" size={16} /> Chargement…
      </div>
    );
  }
  return (
    <ul className="divide-y divide-slate-100">
      {items.slice(0, 6).map((c) => (
        <li key={c.id} className="py-3">
          <div className="flex flex-wrap items-center gap-2">
            {c.statut === "ouverte" ? (
              <Badge className="bg-faso-green/10 text-faso-green">
                {c.region_cible ? `Ciblée · ${c.region_cible}` : "Nationale"}
              </Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-500">Clôturée</Badge>
            )}
            <span className="text-xs text-slate-400">{formatDateFr(c.date_publication)}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-800">{c.titre}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{c.question}</p>
        </li>
      ))}
      {items.length === 0 && (
        <li className="py-6 text-center text-sm text-slate-500">Aucune consultation enregistrée.</li>
      )}
    </ul>
  );
}
