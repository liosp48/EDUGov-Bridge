"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BrainCircuit,
  ClipboardList,
  Filter,
  Landmark,
  Loader2,
  MapPin,
  Megaphone,
  Send,
  Sparkles,
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
  CATEGORIE_COLORS,
  CATEGORIE_LABELS,
  ROLE_LABELS,
  type CategorieSignalement,
  type Consultation,
  type Signalement,
  type SyntheseIA,
} from "@/types/database";
import { REGIONS as REGIONS_LIST } from "@/lib/geographie";
import { formatDateFr } from "@/lib/utils";
import {
  chargerSession,
  effacerSession,
  type SessionUtilisateur,
} from "@/lib/auth";
import { deconnexion as deconnexionServeur } from "@/app/auth/actions";
import { Building2, LogOut, ShieldCheck } from "lucide-react";

type Onglet = "strategie" | "brief" | "consultations";

const INDICE_RISQUE_SEUILS = { moyen: 55, eleve: 70 } as const;

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

  // Filtres géographiques
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [commune, setCommune] = useState("");

  // Ministre Brief IA
  const [synthese, setSynthese] = useState<SyntheseIA | null>(null);
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

  // ── Filtrage géographique ─────────────────────────────────────
  const filtres = useMemo(() => {
    return (signalements ?? []).filter(
      (s) =>
        (!region || s.region === region) &&
        (!province || s.province === province) &&
        (!commune || s.commune === commune)
    );
  }, [signalements, region, province, commune]);

  // ── KPIs calculés ─────────────────────────────────────────────
  const kpis = useMemo(() => {
    const n = filtres.length;
    const decrochages = filtres.filter((s) => s.categorie === "decrochage");
    const gravMoy =
      decrochages.length > 0
        ? decrochages.reduce((acc, s) => acc + s.gravite, 0) / decrochages.length
        : 0;
    const indiceRisque = Math.round(gravMoy * 20); // gravité moyenne /5 → indice /100
    return { n, decrochages: decrochages.length, indiceRisque };
  }, [filtres]);

  // ── Agrégations graphiques ────────────────────────────────────
  const parCategorie = useMemo(() => {
    const map = new Map<CategorieSignalement, number>();
    for (const s of filtres) map.set(s.categorie, (map.get(s.categorie) ?? 0) + 1);
    return (Object.keys(CATEGORIE_LABELS) as CategorieSignalement[])
      .map((c) => ({ nom: CATEGORIE_LABELS[c], key: c, valeur: map.get(c) ?? 0 }))
      .filter((d) => d.valeur > 0);
  }, [filtres]);

  const parRegion = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of region ? filtres : (signalements ?? []))
      map.set(s.region, (map.get(s.region) ?? 0) + 1);
    return [...map.entries()].map(([nom, valeur]) => ({ nom, valeur })).sort((a, b) => b.valeur - a.valeur);
  }, [filtres, signalements, region]);

  // Carte thermique simplifiée (grille régions × intensité de signalements)
  const heatmap = useMemo(() => {
    const base = region ? filtres : (signalements ?? []);
    return REGIONS_LIST.map((r) => {
      const items = base.filter((s) => s.region === r);
      const total = items.length;
      const gravMax = items.reduce((m, s) => Math.max(m, s.gravite), 0);
      const intensite = total === 0 ? 0 : Math.min(5, Math.round(gravMax * 0.5 + total * 0.25));
      return { region: r, total, gravMax, intensite };
    });
  }, [filtres, signalements, region]);

  const intensiteCouleur = (i: number) =>
    i === 0
      ? "bg-slate-100 text-slate-400"
      : i <= 2
        ? "bg-faso-green/15 text-faso-green"
        : i <= 3
          ? "bg-amber-100 text-amber-700"
          : "bg-faso-red/15 text-faso-red";

  // ── Synthèse IA ───────────────────────────────────────────────
  const lancerSynthese = async () => {
    setIaEnCours(true);
    setIaErreur(null);
    setSynthese(null);
    try {
      const res = await fetch("/api/synthese-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signalements: filtres,
          cible: { region: region || undefined, province: province || undefined, commune: commune || undefined },
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      setSynthese((await res.json()) as SyntheseIA);
    } catch {
      setIaErreur("Impossible de générer la synthèse. Vérifiez l'API IA puis réessayez.");
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
        Chargement du tableau de bord stratégique…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
            <Landmark className="text-institution" size={28} /> Tableau de Bord Stratégique
          </h1>
          <p className="mt-1 text-slate-600">
            Ministère de l'Éducation × Transition Digitale ·{" "}
            {isSupabaseConfigured ? "Données Supabase en direct" : "Mode démo (données réalistes)"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge>{filtres.length} signalements dans le périmètre</Badge>
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
            { key: "brief", label: "Ministre Brief — Synthèse IA" },
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
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard label="Signalements collectés" value={kpis.n} hint={region ? `Périmètre : ${commune || province || region}` : "National"} accent="blue" />
            <KpiCard
              label="Indice de Risque de Décrochage"
              value={kpis.indiceRisque}
              hint={
                kpis.decrochages === 0
                  ? "Aucun signal décrochage sur le périmètre"
                  : `Sur ${kpis.decrochages} signalements de décrochage · ${
                      kpis.indiceRisque >= INDICE_RISQUE_SEUILS.eleve
                        ? "risque élevé"
                        : kpis.indiceRisque >= INDICE_RISQUE_SEUILS.moyen
                          ? "risque moyen"
                          : "risque maîtrisé"
                    }`
              }
              accent={kpis.indiceRisque >= INDICE_RISQUE_SEUILS.eleve ? "red" : kpis.indiceRisque >= INDICE_RISQUE_SEUILS.moyen ? "green" : "blue"}
            />
            <KpiCard
              label="Innovations terrain"
              value={filtres.filter((s) => s.proposition_innovation).length}
              hint="Propositions formulées par les acteurs, prêtes pour l'audit"
              accent="green"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Répartition par catégorie */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition des besoins par catégorie</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {parCategorie.length === 0 ? (
                  <p className="pt-16 text-center text-sm text-slate-500">Aucune donnée sur ce périmètre.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={parCategorie}
                        dataKey="valeur"
                        nameKey="nom"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {parCategorie.map((d) => (
                          <Cell key={d.key} fill={CATEGORIE_COLORS[d.key]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} signalement(s)`, ""]} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Signalements par région */}
            <Card>
              <CardHeader>
                <CardTitle>Signalements par région</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={parRegion} layout="vertical" margin={{ left: 40, right: 16 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis type="number" allowDecimals={false} fontSize={12} />
                    <YAxis type="category" dataKey="nom" width={120} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="valeur" name="Signalements" fill="#0F4C81" radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Carte thermique simplifiée */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin size={18} className="text-institution" /> Carte thermique simplifiée
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {heatmap.map((h) => (
                  <button
                    key={h.region}
                    onClick={() => {
                      setRegion(h.region);
                      setProvince("");
                      setCommune("");
                    }}
                    className={`rounded-lg border border-slate-200 px-3 py-3 text-left transition hover:ring-2 hover:ring-institution/40 ${intensiteCouleur(h.intensite)} ${
                      region === h.region ? "ring-2 ring-institution" : ""
                    }`}
                  >
                    <p className="text-sm font-semibold">{h.region}</p>
                    <p className="text-xs opacity-80">
                      {h.total} signal. · gravité max {h.gravMax}/5
                    </p>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Cliquer sur une région filtre tout le dashboard. Version cartographique interactive
                (React-Leaflet, contours des provinces du Burkina) : étape suivante du sprint.
              </p>
            </CardContent>
          </Card>

          {/* Derniers signalements bruts */}
          <Card>
            <CardHeader>
              <CardTitle>Signalements récents du périmètre</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100">
              {filtres.slice(0, 6).map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      <span
                        className="mr-2 inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: CATEGORIE_COLORS[s.categorie] }}
                      />
                      {s.etablissement} — {s.commune} ({s.region})
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {ROLE_LABELS[s.role_emetteur]} · {formatDateFr(s.created_at)} ·{" "}
                      gravité {s.gravite}/5
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{s.description}</p>
                  </div>
                </div>
              ))}
              {filtres.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-500">
                  Aucun signalement sur ce périmètre.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════ MINISTRE BRIEF — SYNTHÈSE IA ══════════ */}
      {onglet === "brief" && (
        <div className="mt-6 space-y-6">
          <Card className="border-2 border-institution/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BrainCircuit className="text-institution" size={24} /> Ministre Brief — Synthèse IA
                en 1 clic
              </CardTitle>
              <p className="text-sm text-slate-600">
                {filtres.length} signalements du périmètre
                {region ? ` (${commune || province || region})` : " (national)"} seront analysés par
                GPT-4o-mini / Claude 3.5 Haiku : urgences, triangulation des acteurs, top innovations.
              </p>
            </CardHeader>
            <CardContent>
              <Button size="lg" onClick={() => void lancerSynthese()} disabled={iaEnCours || filtres.length === 0}>
                {iaEnCours ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                {iaEnCours
                  ? "Analyse NLP en cours — lecture du corpus terrain…"
                  : filtres.length === 0
                    ? "Aucun signalement à analyser sur ce périmètre"
                    : "✦ Générer le Brief Stratégique"}
              </Button>
              {iaErreur && (
                <p className="mt-4 rounded-lg border border-faso-red/30 bg-faso-red/10 px-4 py-3 text-sm text-faso-red">
                  {iaErreur}
                </p>
              )}
            </CardContent>
          </Card>

          {synthese && (
            <div className="space-y-4">
              <Badge className={synthese.fondement_ia ? "bg-faso-green/10 text-faso-green" : "bg-amber-100 text-amber-700"}>
                {synthese.fondement_ia ? "Généré par IA sur le corpus filtré" : "Synthèse locale (clé IA non configurée) — démo fiable"}
              </Badge>

              <Card>
                <CardHeader>
                  <CardTitle>a · Résumé exécutif — les urgences du terrain</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {synthese.resume_executif}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>b · Triangulation des données terrain</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {synthese.triangulation}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>c · Top 3 des solutions inédites proposées par le terrain</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {synthese.top_innovations.map((inn, i) => (
                      <li key={i} className="flex gap-3 text-sm text-slate-700">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-institution text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{inn}</span>
                      </li>
                    ))}
                    {synthese.top_innovations.length === 0 && (
                      <p className="text-sm text-slate-500">Aucune proposition innovation dans le corpus filtré.</p>
                    )}
                  </ol>
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
                    placeholder="Ex : Plan Cantines URGENT — Dori"
                    value={titreConsult}
                    onChange={(e) => setTitreConsult(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="question">Question aux acteurs</Label>
                  <Textarea
                    id="question"
                    rows={4}
                    placeholder="Ex : Comment votre établissement pourrait-il contribuer à sécuriser un repas chaud par jour pour 50 élèves supplémentaires ?"
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
                <Button type="submit" disabled={consultEnvoi || titreConsult.trim().length < 5 || questionConsult.trim().length < 20}>
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
              <Badge className="bg-faso-green/10 text-faso-green">{c.region_cible ? `Ciblée · ${c.region_cible}` : "Nationale"}</Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-500">Clôturée</Badge>
            )}
            <span className="text-xs text-slate-400">{formatDateFr(c.date_publication)}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-800">{c.titre}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{c.question}</p>
        </li>
      ))}
      {items.length === 0 && <li className="py-6 text-center text-sm text-slate-500">Aucune consultation enregistrée.</li>}
    </ul>
  );
}
