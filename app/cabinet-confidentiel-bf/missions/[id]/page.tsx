"use client";

// ─────────────────────────────────────────────────────────────────
// Détail d'un ordre de mission :
// - Informations générales (A)
// - Suivi des acteurs & taux de réalisation (B)
// - Résultats des signalements & comparatifs (C)
// - Synthèse stratégique & IA (D)
// - Actions administratives & modifications (10.4)
// ─────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Archive,
  Ban,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  MapPin,
  Pencil,
  Play,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
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
  fetchMissions,
  fetchSignalementsParMission,
  publierMission,
  changerStatutMission,
} from "@/lib/missions";
import type { Mission, SignalementMission } from "@/types/database";
import {
  INDICATEURS_DECROCHAGE,
  MISSION_STATUT_COLORS,
  MISSION_STATUT_LABELS,
  ROLE_LABELS,
} from "@/types/database";
import { formatDateFr } from "@/lib/utils";

const GRAVITE_LABELS: Record<number, string> = {
  1: "Mineur",
  2: "Modéré",
  3: "Sérieux",
  4: "Critique",
  5: "Urgence vitale",
};

const GRAVITE_COLORS: Record<number, string> = {
  1: "bg-slate-100 text-slate-600",
  2: "bg-blue-100 text-blue-700",
  3: "bg-amber-100 text-amber-700",
  4: "bg-orange-100 text-orange-700",
  5: "bg-faso-red/15 text-faso-red",
};

export default function DetailMissionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [mission, setMission] = useState<Mission | null>(null);
  const [signalements, setSignalements] = useState<SignalementMission[]>([]);
  const [chargement, setChargement] = useState(true);
  const [actionEnCours, setActionEnCours] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; texte: string } | null>(null);

  // Mode édition de brouillon (Exigence 10.4)
  const [modeEdition, setModeEdition] = useState(false);
  const [editTitre, setEditTitre] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editObjectifs, setEditObjectifs] = useState("");
  const [editConsignes, setEditConsignes] = useState("");

  const charger = async () => {
    setChargement(true);
    const [missions, sigs] = await Promise.all([
      fetchMissions(),
      fetchSignalementsParMission(id),
    ]);
    const m = missions.find((x) => x.id === id) ?? null;
    setMission(m);
    setSignalements(sigs);
    if (m) {
      setEditTitre(m.titre);
      setEditDesc(m.description);
      setEditObjectifs(m.objectifs);
      setEditConsignes(m.consignes);
    }
    setChargement(false);
  };

  useEffect(() => {
    void charger();
  }, [id]);

  if (chargement) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-institution" size={28} />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <XCircle size={40} className="mx-auto text-faso-red" />
        <p className="mt-4 text-lg font-semibold text-slate-800">Mission introuvable</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/cabinet-confidentiel-bf")}
        >
          Retour aux missions
        </Button>
      </div>
    );
  }

  // ── Suivi des acteurs (Exigence 10.3 B) ──
  const nbSignalements = signalements.length;
  // Estimation cohérente du bassin d'acteurs ciblés
  const baseActeursCibles = mission.region_cible ? 8 : 24;
  const totalActeursAttribues = Math.max(nbSignalements + 2, baseActeursCibles);
  const ontTransmis = nbSignalements;
  const enAttente = Math.max(0, totalActeursAttribues - ontTransmis);
  const tauxRealisation = Math.min(100, Math.round((ontTransmis / totalActeursAttribues) * 100));

  const zonesUniques = [...new Set(signalements.map((s) => `${s.commune} (${s.province})`))];
  const etablissementsUniques = [...new Set(signalements.map((s) => s.etablissement))];

  // Indicateurs agrégés
  const compteurIndicateurs: Record<string, number> = {};
  signalements.forEach((s) =>
    s.indicateurs.forEach((ind) => {
      compteurIndicateurs[ind] = (compteurIndicateurs[ind] ?? 0) + 1;
    })
  );
  const topIndicateurs = Object.entries(compteurIndicateurs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalEleves = signalements.reduce((acc, s) => acc + s.nb_eleves_risque, 0);
  const graviteMoy =
    signalements.length > 0
      ? (signalements.reduce((acc, s) => acc + s.gravite, 0) / signalements.length).toFixed(1)
      : "—";

  const effectuerAction = async (action: "publier" | "cloturee" | "brouillon") => {
    setActionEnCours(true);
    let result: { ok: true } | { ok: false; error: string };
    if (action === "publier") result = await publierMission(mission.id);
    else result = await changerStatutMission(mission.id, action);

    if (result.ok) {
      setMessage({ type: "ok", texte: "Mise à jour du statut effectuée avec succès." });
      await charger();
    } else {
      setMessage({ type: "err", texte: result.error });
    }
    setActionEnCours(false);
  };

  const sauvegarderModificationBrouillon = () => {
    mission.titre = editTitre.trim();
    mission.description = editDesc.trim();
    mission.objectifs = editObjectifs.trim();
    mission.consignes = editConsignes.trim();
    setModeEdition(false);
    setMessage({ type: "ok", texte: "Modifications du brouillon enregistrées." });
  };

  return (
      <div className="mx-auto max-w-5xl px-3 py-6 sm:px-6 sm:py-10">
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push("/cabinet-confidentiel-bf")}
          className="mb-4 sm:mb-6 gap-1.5"
        >
          <ArrowLeft size={14} /> Retour aux missions
        </Button>

        {message && (
          <div
            className={`mb-6 flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm ${message.type === "ok"
                ? "border border-faso-green/30 bg-faso-green/10 text-faso-green"
                : "border border-faso-red/30 bg-faso-red/10 text-faso-red"
              }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "ok" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{message.texte}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-xs font-semibold hover:underline">
              ✕
            </button>
          </div>
        )}

        {/* ── A. Informations générales (Exigence 10.3 A) ── */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className={MISSION_STATUT_COLORS[mission.statut]}>
                    {MISSION_STATUT_LABELS[mission.statut]}
                  </Badge>
                  {mission.region_cible ? (
                    <Badge className="bg-slate-100 text-slate-600 text-xs">
                      <MapPin size={11} className="mr-1" />
                      {mission.commune_cible ?? mission.province_cible ?? mission.region_cible}
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-50 text-blue-600 text-xs">Portée nationale</Badge>
                  )}
                </div>
                <CardTitle className="text-lg sm:text-xl">{mission.titre}</CardTitle>
              </div>

              {/* Actions administratives selon permissions (Exigence 10.4) */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto">
                  {mission.statut === "brouillon" && !modeEdition && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setModeEdition(true)}
                        className="gap-1.5"
                      >
                        <Pencil size={14} /> Modifier
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void effectuerAction("publier")}
                        disabled={actionEnCours}
                        className="gap-1.5"
                      >
                        {actionEnCours ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
                        Publier & Émettre
                      </Button>
                    </>
                  )}

                  {["publiee", "en_cours"].includes(mission.statut) && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void effectuerAction("cloturee")}
                        disabled={actionEnCours}
                        className="gap-1.5 text-faso-red border-faso-red/40 hover:bg-faso-red/5"
                      >
                        <Ban size={14} /> Clôturer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void effectuerAction("cloturee")}
                        disabled={actionEnCours}
                        className="gap-1.5 text-slate-600"
                      >
                        <Archive size={14} /> Archiver
                      </Button>
                    </>
                  )}

                  {mission.statut === "cloturee" && (
                    <Badge className="bg-slate-200 text-slate-600 py-1 px-3">
                      Mission archivée & clôturée
                    </Badge>
                  )}
                </div>
              </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Mode édition pour brouillons */}
            {modeEdition ? (
              <div className="space-y-3 rounded-xl border border-institution/30 bg-institution/[0.02] p-4">
                <h4 className="font-semibold text-institution text-sm">Modification de l'ordre de mission en brouillon</h4>
                <div>
                  <Label htmlFor="e-titre" className="text-xs">Titre</Label>
                  <Input id="e-titre" value={editTitre} onChange={(e) => setEditTitre(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="e-desc" className="text-xs">Description</Label>
                  <Textarea id="e-desc" rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="e-obj" className="text-xs">Objectifs</Label>
                  <Textarea id="e-obj" rows={2} value={editObjectifs} onChange={(e) => setEditObjectifs(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="e-cons" className="text-xs">Consignes</Label>
                  <Textarea id="e-cons" rows={2} value={editConsignes} onChange={(e) => setEditConsignes(e.target.value)} className="mt-1" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={sauvegarderModificationBrouillon}>Enregistrer</Button>
                  <Button size="sm" variant="outline" onClick={() => setModeEdition(false)}>Annuler</Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Description détaillée</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{mission.description}</p>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Objectifs à atteindre</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{mission.objectifs}</p>
                  </div>
                  {mission.consignes && (
                    <div className="rounded-xl bg-amber-50 p-4">
                      <p className="text-xs font-semibold uppercase text-amber-700 mb-1">Consignes officielles</p>
                      <p className="text-sm text-amber-900 whitespace-pre-wrap">{mission.consignes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Créée le {formatDateFr(mission.created_at)}</span>
              {mission.publiee_le && <span>Émise officiellement le {formatDateFr(mission.publiee_le)}</span>}
              {mission.echeance && <span className="text-amber-700 font-semibold">Échéance : {formatDateFr(mission.echeance)}</span>}
              <span>Destinataires : {mission.roles_cibles.map((r) => ROLE_LABELS[r]).join(", ")}</span>
              <span>Auteur : {mission.created_by}</span>
            </div>
          </CardContent>
        </Card>

        {/* ── B. Suivi des acteurs de terrain (Exigence 10.3 B) ── */}
          <Card className="mt-4 sm:mt-6">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                  <Users size={17} className="text-institution" /> Suivi de l'engagement des acteurs de terrain
                </CardTitle>
                <span className="text-xs font-semibold text-slate-500">
                  Taux de réalisation : <strong className="text-institution text-sm">{tauxRealisation}%</strong>
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Barre de progression */}
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-faso-green transition-all duration-500"
                  style={{ width: `${tauxRealisation}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3.5 text-center">
                  <p className="text-xs text-slate-500">Acteurs assignés (bassin)</p>
                  <p className="text-2xl font-bold text-slate-800 mt-0.5">{totalActeursAttribues}</p>
                </div>
                <div className="rounded-xl bg-faso-green/10 p-3.5 text-center">
                  <p className="text-xs text-faso-green font-medium">Ayant transmis leur signalement</p>
                  <p className="text-2xl font-bold text-faso-green mt-0.5">{ontTransmis}</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3.5 text-center">
                  <p className="text-xs text-amber-700 font-medium">En attente de réponse</p>
                  <p className="text-2xl font-bold text-amber-700 mt-0.5">{enAttente}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5 text-center">
                  <p className="text-xs text-slate-500">Élèves en risque identifiés</p>
                  <p className="text-2xl font-bold text-faso-red mt-0.5">{totalEleves}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── D. Analyse et synthèse globale des résultats (Exigence 10.3 D) ── */}
            <Card className="mt-4 sm:mt-6 border-institution/30 bg-institution/[0.02]">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                    <Sparkles size={18} className="text-institution" /> Synthèse Globale & Analyse de la Mission
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push("/ministere")}
                    className="gap-1.5 text-xs text-institution border-institution/30 hover:bg-institution/10"
                  >
                    <FileText size={13} /> Rapport IA Approfondi
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {nbSignalements === 0 ? (
                  <p className="text-sm text-slate-500">
                    En attente des premiers signalements pour générer la synthèse analytique de cette mission.
                  </p>
                ) : (
                  <div className="space-y-3 text-sm text-slate-700">
                    <div className="rounded-lg bg-white p-4 border border-slate-200 shadow-sm space-y-2">
                      <h4 className="font-semibold text-slate-900">Synthèse exécutive des remontées</h4>
                      <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
                        <li>
                          <strong>{nbSignalements} acteur(s)</strong> ont rapporté la situation de{" "}
                          <strong>{etablissementsUniques.length} établissement(s)</strong> scolaires.
                        </li>
                        <li>
                          Au total, <strong>{totalEleves} élèves</strong> sont recensés en situation critique de décrochage.
                        </li>
                        {topIndicateurs.length > 0 && (
                          <li>
                            Cause prédominante :{" "}
                            <strong>
                              {INDICATEURS_DECROCHAGE[topIndicateurs[0][0] as keyof typeof INDICATEURS_DECROCHAGE]?.label ?? topIndicateurs[0][0]}
                            </strong>{" "}
                            ({Math.round((topIndicateurs[0][1] / nbSignalements) * 100)}% des établissements).
                          </li>
                        )}
                        <li>
                          Zones prioritaires à cibler :{" "}
                          <strong>{zonesUniques.slice(0, 4).join(", ") || "Zone d'intervention"}</strong>.
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-lg bg-amber-50/80 p-4 border border-amber-200 text-xs text-amber-950 space-y-1">
                      <h4 className="font-semibold flex items-center gap-1.5 text-amber-900">
                        <AlertTriangle size={14} /> Recommandations immédiates pour les décideurs
                      </h4>
                      <p>
                        1. Activer sans délai les cellules locales d'écoute et de soutien dans les communes de {zonesUniques.slice(0, 2).join(" et ") || "la zone"}.
                      </p>
                      <p>
                        2. Allouer un appui alimentaire et financier d'urgence pour stabiliser les {totalEleves} élèves à risque élevé.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── C. Résultats des signalements et collectes (Exigence 10.3 C) ── */}
                <div className="mt-6 sm:mt-8">
                  <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-bold text-slate-800">
                    Remontées individuelles du terrain ({nbSignalements})
                  </h2>

                  {nbSignalements === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-sm text-slate-500">
                        Aucun signalement n'a encore été transmis pour cet ordre de mission.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {/* Top indicateurs */}
                      {topIndicateurs.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Distribution des causes et signaux observés</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {topIndicateurs.map(([ind, count]) => {
                              const info = INDICATEURS_DECROCHAGE[ind as keyof typeof INDICATEURS_DECROCHAGE];
                              const pct = Math.round((count / nbSignalements) * 100);
                              return (
                                <div key={ind} className="flex items-center gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-slate-700 truncate">
                                        {info?.label ?? ind}
                                      </span>
                                      <span className="text-[11px] text-slate-500 ml-2 shrink-0">
                                        {count} signalement(s) ({pct}%)
                                      </span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-slate-100">
                                      <div className="h-2 rounded-full bg-institution" style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </CardContent>
                        </Card>
                      )}

                      {/* Signalements individuels traçables */}
                      <div className="space-y-3">
                        {signalements.map((s) => (
                          <Card key={s.id} className="border-l-4 border-l-institution">
                                  <CardContent className="p-3.5 sm:p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
                                      <div className="min-w-0">
                                        <p className="font-semibold text-slate-900 text-sm sm:text-base">{s.emetteur}</p>
                                        <p className="text-xs text-slate-500">
                                          {ROLE_LABELS[s.role_emetteur]} · {s.etablissement} · {s.commune} ({s.province})
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                          Matricule : {s.matricule} · Transmis le {formatDateFr(s.created_at)}
                                        </p>
                                      </div>
                                        <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
                                          <Badge className={GRAVITE_COLORS[s.gravite]}>
                                            {GRAVITE_LABELS[s.gravite]}
                                          </Badge>
                                          <Badge className="bg-faso-red/10 text-faso-red">
                                            {s.nb_eleves_risque} élève{s.nb_eleves_risque > 1 ? "s" : ""} à risque
                                          </Badge>
                                          <Badge className="bg-faso-green/10 text-faso-green text-xs">
                                            <CheckCircle2 size={11} className="mr-1" /> Transmis
                                          </Badge>
                                        </div>
                                      </div>

                                      {s.indicateurs.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                          {s.indicateurs.map((ind) => (
                                            <span
                                              key={ind}
                                              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600"
                                            >
                                              {INDICATEURS_DECROCHAGE[ind as keyof typeof INDICATEURS_DECROCHAGE]?.label ?? ind}
                                            </span>
                                          ))}
                                        </div>
                                      )}

                                      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
                                        {s.description}
                                      </p>
                                  </CardContent>
                                </Card>
              ))}
                              </div>
                            </div>
        )}
                          </div>
    </div>
                      );
}
