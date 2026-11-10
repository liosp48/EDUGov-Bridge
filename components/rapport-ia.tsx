"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  FileText,
  History,
  Loader2,
  MapPin,
  Printer,
  RefreshCw,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import {
  IRD_SEUILS,
  calculerIRD,
  elevesEnDanger,
} from "@/lib/decrochage";
import { formatDateFr } from "@/lib/utils";
import {
  type HistoriqueRapport,
  type RapportDecrochage,
  type Signalement,
} from "@/types/database";

const CLE_HISTORIQUE = "edugov_rapports_decrochage";

/** Fenêtre d'analyse : les 7 derniers jours (sinon l'intégralité du corpus) */
function fenetreSeptJours(signalements: Signalement[]): Signalement[] {
  const limite = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recents = signalements.filter((s) => +new Date(s.created_at) >= limite);
  return recents.length > 0 ? recents : signalements;
}

function lireHistorique(): HistoriqueRapport[] {
  if (typeof window === "undefined") return [];
  try {
    const brut = window.localStorage.getItem(CLE_HISTORIQUE);
    if (!brut) return [];
    const liste = JSON.parse(brut) as HistoriqueRapport[];
    return Array.isArray(liste) ? liste : [];
  } catch {
    return [];
  }
}

function enregistrerHistorique(liste: HistoriqueRapport[]) {
  try {
    window.localStorage.setItem(CLE_HISTORIQUE, JSON.stringify(liste.slice(0, 20)));
  } catch {
    /* quota dépassé : historique non persistant */
  }
}

/** Rendu d'un bloc de texte en paragraphes (séparés par lignes vides) */
function Paragraphes({ texte }: { texte: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-700">
      {texte
        .split(/\n{2,}|\r\n\r\n/)
        .map((p, i) => p.trim() && <p key={i} className="whitespace-pre-line">{p}</p>)}
    </div>
  );
}

function SectionListe({ titre, icone, items }: { titre: string; icone: React.ReactNode; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
        {icone} {titre}
      </h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-institution/10 text-[10px] font-bold text-institution">
              {i + 1}
            </span>
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionTexte({ titre, icone, texte }: { titre: string; icone: React.ReactNode; texte: string }) {
  if (!texte) return null;
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
        {icone} {titre}
      </h4>
      <Paragraphes texte={texte} />
    </div>
  );
}

/**
 * Module « Ministre Brief IA — Décrochage » : véritable rapport d'étude
 * (9 sections, plusieurs pages), généré côté serveur par IA sur les
 * DESCRIPTIONS LIBRES du terrain, avec historique des analyses.
 */
export default function RapportIA({
  signalements,
  cible,
}: {
  signalements: Signalement[];
  cible?: { region?: string; province?: string; commune?: string };
}) {
  const [rapport, setRapport] = useState<RapportDecrochage | null>(null);
  const [meta, setMeta] = useState<{
    genere_le: string;
    fenetre_jours: number;
    nb_signalements: number;
    eleves: number;
    perimetre: string;
  } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [historique, setHistorique] = useState<HistoriqueRapport[]>([]);
  const [montreHistorique, setMontreHistorique] = useState(false);

  useEffect(() => {
    setHistorique(lireHistorique());
  }, []);

  const perimetre = useMemo(
    () =>
      cible?.commune
        ? `${cible.commune} (${cible.province}, ${cible.region})`
        : cible?.province
          ? `${cible.province} → ${cible.region}`
          : cible?.region
            ? cible.region
            : "National (17 régions)",
    [cible?.region, cible?.province, cible?.commune]
  );

  const generer = useCallback(async () => {
    if (signalements.length === 0) return;
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch("/api/rapport-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signalements: fenetreSeptJours(signalements),
          cible: {
            region: cible?.region || undefined,
            province: cible?.province || undefined,
            commune: cible?.commune || undefined,
          },
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = (await res.json()) as RapportDecrochage;
      setRapport(data);

      const fenetre = fenetreSeptJours(signalements);
      const getInfo = {
        genere_le: new Date().toISOString(),
        fenetre_jours: fenetre.length < signalements.length ? 7 : 0,
        nb_signalements: fenetre.length,
        eleves: elevesEnDanger(fenetre),
        perimetre,
      };
      setMeta(getInfo);

      const entree: HistoriqueRapport = {
        id: `rapport-${Date.now()}`,
        genere_le: getInfo.genere_le,
        cible: { region: cible?.region ?? "", province: cible?.province ?? "", commune: cible?.commune ?? "" },
        nb_signalements: getInfo.nb_signalements,
        eleves_concernes: getInfo.eleves,
        fenetre_jours: getInfo.fenetre_jours,
        rapport: data,
      };
      const liste = [entree, ...historique];
      setHistorique(liste);
      enregistrerHistorique(liste);
      setMontreHistorique(false);
    } catch {
      setErreur("Impossible de générer le rapport. Vérifiez la connexion à l'API IA puis réessayez.");
    } finally {
      setEnCours(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalements, cible?.region, cible?.province, cible?.commune, perimetre]);

  // Décision d'alerte : des alertes plus récentes que le dernier rapport ?
  const alerteNouvellesAlertes = useMemo(() => {
    if (!meta) return 0;
    const genereLe = +new Date(meta.genere_le);
    // Le périmètre actuel peut différer (filtres) : on ne compare que si fenêtre identique
    return signalements.filter((s) => +new Date(s.created_at) > genereLe).length;
  }, [signalements, meta]);

  const ird = useMemo(() => calculerIRD(fenetreSeptJours(signalements)), [signalements]);
  const nbFenetre = useMemo(() => fenetreSeptJours(signalements).length, [signalements]);

  return (
    <div className="mt-6 space-y-4">
      {/* ── Barre de génération ─────────────────────────────────── */}
      <Card className="border-2 border-institution/20 no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BrainCircuit className="text-institution" size={24} /> Rapport d&apos;étude IA —
            Ministère Brief Décrochage
          </CardTitle>
          <p className="text-sm text-slate-600">
            Analyse approfondie des <strong>descriptions libres</strong> du terrain :{" "}
            {nbFenetre} alerte(s) du périmètre ({perimetre}) · {ird}/100 IRD ·{" "}
            {elevesEnDanger(fenetreSeptJours(signalements))} élèves en danger. Le rapport
            est produit côté serveur (clé OpenAI jamais exposée au navigateur).
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onClick={() => void generer()}
            disabled={enCours || signalements.length === 0}
          >
            {enCours ? (
              <Loader2 className="animate-spin" size={18} />
            ) : rapport ? (
              <RefreshCw size={18} />
            ) : (
              <Sparkles size={18} />
            )}
            {enCours
              ? "Analyse IA en cours — exploitation des témoignages du terrain…"
              : rapport
                ? "Régénérer le rapport (nouvelles données)"
                : "Générer le rapport d'étude complet"}
          </Button>
          {rapport && (
            <Button size="lg" variant="outline" onClick={() => window.print()}>
              <Printer size={18} /> Imprimer / Exporter en PDF
            </Button>
          )}
          {historique.length > 0 && (
            <Button size="lg" variant="ghost" onClick={() => setMontreHistorique((v) => !v)}>
              <History size={18} /> Historique ({historique.length})
            </Button>
          )}
        </CardContent>
      </Card>

      {erreur && (
        <p className="flex items-center gap-2 rounded-lg border border-faso-red/30 bg-faso-red/10 px-4 py-3 text-sm text-faso-red no-print">
          <AlertTriangle size={18} /> {erreur}
        </p>
      )}

      {/* ── Historique ──────────────────────────────────────────── */}
      {montreHistorique && (
        <Card className="no-print">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-base">
                <History size={17} /> Analyses précédentes
              </span>
              <button
                onClick={() => setMontreHistorique(false)}
                aria-label="Fermer"
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100">
            {historique.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {formatDateFr(h.genere_le)} · {h.cible.commune || h.cible.province || h.cible.region || "National"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {h.nb_signalements} alerte(s) analysée(s) · {h.eleves_concernes} élèves ·{" "}
                    {h.rapport.fondement_ia ? "IA" : "calcul local"} · fenêtre{" "}
                    {h.fenetre_jours ? "7 jours" : "toutes"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRapport(h.rapport);
                    setMeta({
                      genere_le: h.genere_le,
                      fenetre_jours: h.fenetre_jours,
                      nb_signalements: h.nb_signalements,
                      eleves: h.eleves_concernes,
                      perimetre:
                        h.cible.commune || h.cible.province || h.cible.region || "National",
                    });
                  }}
                >
                  <FileText size={14} /> Ouvrir
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {rapport && meta && alerteNouvellesAlertes > 0 && (
        <p className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 no-print">
          {alerteNouvellesAlertes} nouvelle(s) alerte(s) enregistrée(s) depuis la génération de
          ce rapport.
          <Button size="sm" onClick={() => void generer()} disabled={enCours}>
            Actualiser l&apos;analyse
          </Button>
        </p>
      )}

      {/* ── LE RAPPORT (zone imprimable = PDF) ──────────────────── */}
      {rapport && (
        <Card id="rapport-ia-print" className="shadow-card">
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  « Ministre Brief IA » — Défi 1 · Data Challenge Burkina 2026
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Rapport d&apos;étude IA — Anticipation du décrochage scolaire
                </h2>
              </div>
              <Badge
                className={
                  rapport.fondement_ia
                    ? "bg-faso-green/10 text-faso-green"
                    : "bg-amber-100 text-amber-700"
                }
              >
                {rapport.fondement_ia ? "Généré par IA (GPT)" : "Analyse locale déterministe"}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Périmètre : {meta!.perimetre} · Fenêtre : {meta!.fenetre_jours ? "7 derniers jours" : "toutes périodes"} ·{" "}
              {meta!.nb_signalements} alerte(s) · {meta!.eleves} élève(s) signalé(s) · généré le{" "}
              {formatDateFr(meta!.genere_le)}
              <br />
              <span className="italic">
                Sources : signalements terrain EDUGov-Bridge. Les phrases entre guillemets citent
                les descriptions libres des acteurs du terrain ; les hypothèses d&apos;analyse
                sont signalées comme telles.
              </span>
            </p>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <SectionTexte
              titre="1 · Résumé exécutif"
              icone={<FileText size={15} className="text-institution" />}
              texte={rapport.resume_executif}
            />
            <SectionTexte
              titre="2 · Contexte général"
              icone={<MapPin size={15} className="text-institution" />}
              texte={rapport.contexte_general}
            />
            <SectionTexte
              titre="3 · Analyse des observations de terrain (descriptions libres)"
              icone={<Users size={15} className="text-institution" />}
              texte={rapport.analyse_terrain}
            />
            <SectionListe
              titre="4 · Identification des facteurs de déscolarisation"
              icone={<AlertTriangle size={15} className="text-amber-500" />}
              items={rapport.facteurs_descolarisation}
            />
            <SectionTexte
              titre="5 · Analyse géographique"
              icone={<MapPin size={15} className="text-institution" />}
              texte={rapport.analyse_geographique}
            />
            <SectionTexte
              titre="6 · Analyse des populations vulnérables"
              icone={<Users size={15} className="text-institution" />}
              texte={rapport.populations_vulnerables}
            />
            <SectionListe
              titre="7 · Tendances et signaux d'alerte"
              icone={<AlertTriangle size={15} className="text-faso-red" />}
              items={rapport.tendances_signaux_alerte}
            />
            <SectionListe
              titre="8 · Recommandations stratégiques"
              icone={<Send size={15} className="text-institution" />}
              items={rapport.recommandations_strategiques}
            />
            <SectionTexte
              titre="9 · Conclusion et perspectives"
              icone={<FileText size={15} className="text-institution" />}
              texte={rapport.conclusion_perspectives}
            />

            {ird >= IRD_SEUILS.eleve && (
              <p className="rounded-lg border border-faso-red/30 bg-faso-red/5 p-4 text-sm text-faso-red">
                Risque global élevé (IRD {ird}/100) : une intervention ministérielle rapide est
                requise sur les zones prioritaires identifiées ci-dessus.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
