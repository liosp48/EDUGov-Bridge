"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  ClipboardList,
  Filter,
  Landmark,
  Loader2,
  MapPin,
  Megaphone,
  Send,
  ShieldAlert,
  Users,
} from "lucide-react";
import KpiCard from "@/components/kpi-card";
import GeoSelector from "@/components/geo-selector";
import RapportIA from "@/components/rapport-ia";
import InteractiveMap from "@/components/dashboard/InteractiveMap";
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
  type Consultation,
  type Signalement,
} from "@/types/database";
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

const GraphCauses = dynamic(() => import("@/components/graph-causes"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-slate-400">
      Chargement du graphique…
    </div>
  ),
});

export default function MinisterePage() {
  const router = useRouter();
  const [onglet, setOnglet] = useState<Onglet>("strategie");
  const [session, setSession] = useState<SessionUtilisateur | null>(null);

  // ── Garde strict : réservé aux décideurs authentifiés via email officiel ──
  useEffect(() => {
    const s = chargerSession();
    if (!s) {
      router.replace("/");
      return;
    }
    if (s.type_compte !== "gouvernement") {
      router.replace("/terrain");
      return;
    }
    setSession(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Verrouillage de l'historique : empêche le retour arrière vers l'accueil ──
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const bloquerRetour = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", bloquerRetour);
    return () => {
      window.removeEventListener("popstate", bloquerRetour);
    };
  }, []);

  const deconnexion = () => {
    void (async () => {
      await deconnexionServeur();
      effacerSession();
      router.replace("/");
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

  // Ministre Brief IA (Défi 1) → délégué au module RapportIA (components/rapport-ia.tsx)

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

  // ── Causes principales (indicateurs) — graphique ──────────────
  const parCause = useMemo(() => {
    return causesPrincipales(filtres)
      .slice(0, 7)
      .map((c) => ({ nom: c.label, alertes: c.n }));
  }, [filtres]);

  // ── Zones les plus touchées (liste prioritée) ─────────────────
  const topZones = useMemo(() => zonesTouchees(filtres, "commune").slice(0, 6), [filtres]);

  // ── Ministre Brief IA ─────────────────────────────────────────
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
        Vérification de l'habilitation ministérielle en cours…
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
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
            <Landmark className="text-institution shrink-0" size={24} /> <span>Tableau de Bord Anti-Décrochage</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Défi 1 — Anticipation & riposte ·{" "}
            {isSupabaseConfigured ? "Données Supabase en direct" : "Mode démo (données réalistes)"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Badge className="bg-faso-red/10 text-faso-red text-[11px] sm:text-xs">
            {kpis.total} alerte(s)
          </Badge>
          <Card className="flex items-center gap-2 sm:gap-3 px-3 py-1.5 sm:px-4 sm:py-2">
            <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-faso-green/10 text-faso-green">
              <Building2 size={16} />
            </span>
            <div className="text-left min-w-0">
              <p className="text-xs sm:text-sm font-semibold leading-tight text-slate-800 truncate">{session.nom}</p>
              <p className="flex items-center gap-1 text-[10px] sm:text-xs text-faso-green truncate">
                <ShieldCheck size={11} className="shrink-0" /> <span className="truncate">{session.email}</span>
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={deconnexion} aria-label="Se déconnecter" className="h-8 px-2 text-xs">
              <LogOut size={13} /> <span className="hidden xs:inline">Quitter</span>
            </Button>
          </Card>
        </div>
      </div>

      {/* Filtres géographiques */}
      <Card className="mt-4 sm:mt-6">
        <CardContent className="p-3 sm:p-4 pt-3 sm:pt-4">
          <p className="mb-2.5 sm:mb-3 flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-700">
            <Filter size={14} /> Filtre Région / Province / Commune
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
      <div className="mt-4 sm:mt-6 flex flex-wrap sm:inline-flex w-full sm:w-auto gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-card">
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
            className={`flex-1 sm:flex-initial text-center rounded-md px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition ${
              onglet === t.key ? "bg-institution text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.key === "brief" ? (
              <>
                <span className="sm:hidden">Brief IA</span>
                <span className="hidden sm:inline">Ministre Brief IA — Décrochage</span>
              </>
            ) : (
              t.label
            )}
          </button>
        ))}
      </div>

      {/* ══════════ VUE STRATÉGIQUE ══════════ */}
      {onglet === "strategie" && (
        <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
          {/* KPIs clés du Défi 1 */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
            <KpiCard
              label="Indicateur Global (IRD)"
              value={`${kpis.ird}/100`}
              hint={
                kpis.total === 0
                  ? "Aucune alerte"
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
                  ? kpis.ecolesCritiques.slice(0, 2).join(", ") +
                    (kpis.ecolesCritiques.length > 2 ? "…" : "")
                  : "Aucune école critique"
              }
              accent={kpis.ecolesCritiques.length > 0 ? "red" : "green"}
            />
            <KpiCard
              label="Élèves en danger"
              value={kpis.eleves}
              hint="En danger de déscolarisation"
              accent={kpis.eleves > 0 ? "red" : "green"}
            />
            <KpiCard
              label="Alertes de la semaine"
              value={kpis.alertesSemaine}
              hint="Remontées terrain des 7 derniers jours"
              accent="blue"
            />
          </div>

          {/* Carte interactive de vigilance éducative — géométrie régionale,
              coloration IRD et navigation Région → Province → Commune.
              La sélection pilote les filtres géographiques du tableau de bord. */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin size={18} className="text-institution" /> Carte de
                vigilance éducative
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
              <InteractiveMap
                signalements={signalements ?? []}
                region={region}
                province={province}
                commune={commune}
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
                  <GraphCauses data={parCause} />
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
                <div key={s.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-slate-800">
                      <span
                        className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                          s.gravite >= 4 ? "bg-faso-red" : "bg-amber-400"
                        }`}
                      />
                      <span className="font-semibold">{s.etablissement}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">{s.commune} ({s.region})</span>
                      {s.nb_eleves_risque > 0 && (
                        <Badge className="bg-faso-red/10 text-faso-red text-[10px] sm:text-xs">
                          <Users size={11} /> {s.nb_eleves_risque} élève(s)
                        </Badge>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500">
                      {formatDateFr(s.created_at)} · gravité {s.gravite}/5 · signaux :{" "}
                      {s.indicateurs.length > 0 ? s.indicateurs.length : 0} indicateur(s)
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs sm:text-sm text-slate-600 leading-relaxed">{s.description}</p>
                  </div>
                </div>
              ))}
              {filtres.length === 0 && (
                <p className="py-6 text-center text-xs sm:text-sm text-slate-500">
                  Aucune alerte sur ce périmètre.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════ MINISTRE BRIEF IA — DÉCROCHAGE ══════════ */}
      {onglet === "brief" && (
        <RapportIA
          signalements={filtres}
          cible={{
            region: region || undefined,
            province: province || undefined,
            commune: commune || undefined,
          }}
        />
      )}

      {/* ══════════ CONSULTATIONS ══════════ */}
      {onglet === "consultations" && (
        <div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Lancer une consultation ciblée */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Megaphone size={18} className="text-institution shrink-0" /> <span>Lancer une consultation ciblée</span>
              </CardTitle>
              <p className="text-xs sm:text-sm text-slate-600">
                Le questionnaire sera visible instantanément par les acteurs de la zone ciblée.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={publierConsultation} className="space-y-3.5 sm:space-y-4">
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
                  <p className="rounded-lg border border-faso-green/30 bg-faso-green/10 px-3.5 py-2.5 text-xs sm:text-sm text-faso-green">
                    {consultSucces}
                  </p>
                )}
                <Button
                  type="submit"
                  size="md"
                  disabled={consultEnvoi || titreConsult.trim().length < 5 || questionConsult.trim().length < 20}
                  className="w-full sm:w-auto"
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
