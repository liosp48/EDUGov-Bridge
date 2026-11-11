"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  LogOut,
  Send,
  BellRing,
  UserRound,
  AlertTriangle,
  ClipboardList,
  Eye,
  FileCheck2,
  MapPin,
  Calendar,
  Lock,
  ChevronDown,
  ChevronUp,
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
import GeoSelector from "@/components/geo-selector";
import { insertReponse, insertSignalement, fetchConsultations, fetchReponses } from "@/lib/supabase";
import { DEMO_REPONSES } from "@/lib/demo-data";
import {
  INDICATEURS_DECROCHAGE,
  ROLE_LABELS,
  type Consultation,
  type IndicateurDecrochage,
  type Mission,
  type ReponseConsultation,
  type SignalementMission,
  type UserRole,
} from "@/types/database";
import { formatDateFr } from "@/lib/utils";
import { chargerSession, effacerSession, type SessionUtilisateur } from "@/lib/auth";
import { deconnexion as deconnexionServeur } from "@/app/auth/actions";
import {
  fetchMissionsPourTerrain,
  fetchSignalementsMission,
  soumettreSignalementMission,
} from "@/lib/missions";

type Onglet = "missions" | "signaler" | "consultations";

const GRAVITE_LABELS: Record<number, string> = {
  1: "Mineur — à suivre",
  2: "Modéré — mérite attention",
  3: "Sérieux — à traiter ce trimestre",
  4: "Critique — action nécessaire",
  5: "Urgence vitale — intervention immédiate",
};

export default function TerrainPage() {
  const router = useRouter();
  const [onglet, setOnglet] = useState<Onglet>("missions");
  const [session, setSession] = useState<SessionUtilisateur | null>(null);

  // ── Garde de session : réservé aux acteurs du terrain authentifiés ──
  useEffect(() => {
    const s = chargerSession();
    if (!s || s.type_compte !== "terrain") {
      router.replace("/auth");
      return;
    }
    setSession(s);
    setRole(s.role as UserRole);
    setEmetteur([s.prenom, s.nom].filter(Boolean).join(" "));
    if (s.region) setRegion(s.region);
    if (s.province) setProvince(s.province);
    if (s.commune) setCommune(s.commune);
    if (s.etablissement) setEtablissement(s.etablissement);
  }, [router]);

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
      router.replace("/auth");
      router.refresh();
    })();
  };

  // Identité terrain
  const [role, setRole] = useState<UserRole>("enseignant");
  const [emetteur, setEmetteur] = useState("");
  const [village, setVillage] = useState("");

  // Géographie
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [commune, setCommune] = useState("");
  const [etablissement, setEtablissement] = useState("");

  // ── Onglet Ordres de Mission ──
  const [missionsTerrain, setMissionsTerrain] = useState<Mission[]>([]);
  const [signalementsMissions, setSignalementsMissions] = useState<SignalementMission[]>([]);
  const [chargementMissions, setChargementMissions] = useState(false);

  // Mission en cours d'exécution par l'acteur
  const [missionActiveId, setMissionActiveId] = useState<string | null>(null);
  const [missionAfficheeLectureId, setMissionAfficheeLectureId] = useState<string | null>(null);

  // Formulaire de signalement lié à la mission
  const [missionIndicateurs, setMissionIndicateurs] = useState<string[]>([]);
  const [missionNbEleves, setMissionNbEleves] = useState<number>(0);
  const [missionGravite, setMissionGravite] = useState(3);
  const [missionDescription, setMissionDescription] = useState("");
  const [missionEnvoi, setMissionEnvoi] = useState(false);
  const [missionErreur, setMissionErreur] = useState<string | null>(null);
  const [missionSucces, setMissionSucces] = useState<string | null>(null);

  // Alerte précoce spontanée libre (Défi 1)
  const [indicateurs, setIndicateurs] = useState<string[]>([]);
  const [nbEleves, setNbEleves] = useState<number>(0);
  const [gravite, setGravite] = useState(3);
  const [description, setDescription] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [succes, setSucces] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // Consultations
  const [consultations, setConsultations] = useState<Consultation[] | null>(null);
  const [reponses, setReponses] = useState<ReponseConsultation[] | null>(null);
  const [reponseOuverte, setReponseOuverte] = useState<string | null>(null);
  const [texteReponse, setTexteReponse] = useState("");
  const [reponseEnvoi, setReponseEnvoi] = useState(false);

  // Chargement des missions attribuées à l'acteur connecté
  const chargerMissions = async () => {
    if (!session) return;
    setChargementMissions(true);
    try {
      const [m, sigs] = await Promise.all([
        fetchMissionsPourTerrain(
          (session.role as UserRole) || role,
          session.region || region,
          session.province || province,
          session.commune || commune
        ),
        fetchSignalementsMission(),
      ]);
      setMissionsTerrain(m);
      setSignalementsMissions(sigs);
    } finally {
      setChargementMissions(false);
    }
  };

  useEffect(() => {
    if (session) {
      void chargerMissions();
    }
  }, [session]);

  const geoOK = useMemo(
    () => Boolean(region && province && commune && etablissement),
    [region, province, commune, etablissement]
  );

  const toggleIndicateurLibre = (cle: string) => {
    setIndicateurs((prev) =>
      prev.includes(cle) ? prev.filter((i) => i !== cle) : [...prev, cle]
    );
  };

  const toggleMissionIndicateur = (cle: string) => {
    setMissionIndicateurs((prev) =>
      prev.includes(cle) ? prev.filter((i) => i !== cle) : [...prev, cle]
    );
  };

  // Détection des signalements déjà transmis par cet utilisateur
  const identifierMonSignalement = (missionId: string): SignalementMission | undefined => {
    if (!session) return undefined;
    return signalementsMissions.find(
      (s) =>
        s.mission_id === missionId &&
        ((session.matricule && s.matricule === session.matricule) ||
          s.profil_id === session.id ||
          s.profil_id === session.matricule)
    );
  };

  // Compteurs missions
  const nbMissionsTerminees = useMemo(() => {
    return missionsTerrain.filter((m) => Boolean(identifierMonSignalement(m.id))).length;
  }, [missionsTerrain, signalementsMissions, session]);

  const nbMissionsEnAttente = useMemo(() => {
    return missionsTerrain.length - nbMissionsTerminees;
  }, [missionsTerrain.length, nbMissionsTerminees]);

  // Soumission du signalement lié à un ordre de mission
  const soumettreSignalementPourMission = async (m: Mission) => {
    if (!session) return;
    setMissionErreur(null);
    setMissionSucces(null);

    // Vérification côté client
    const dejaFait = identifierMonSignalement(m.id);
    if (dejaFait) {
      setMissionErreur("Vous avez déjà transmis un signalement pour cet ordre de mission. Il est en lecture seule.");
      return;
    }

    if (missionIndicateurs.length === 0) {
      setMissionErreur("Veuillez sélectionner au moins un indicateur de terrain.");
      return;
    }
    if (missionDescription.trim().length < 20) {
      setMissionErreur("Merci de détailler vos observations (minimum 20 caractères).");
      return;
    }

    setMissionEnvoi(true);
    const profilId = session.matricule || session.id;

    const res = await soumettreSignalementMission({
      mission_id: m.id,
      profil_id: profilId,
      matricule: session.matricule || "SANS-MATRICULE",
      emetteur: [session.prenom, session.nom].filter(Boolean).join(" ") || "Acteur terrain",
      role_emetteur: (session.role as UserRole) || role,
      region: session.region || region || "Région non renseignée",
      province: session.province || province || "Province non renseignée",
      commune: session.commune || commune || "Commune non renseignée",
      etablissement: session.etablissement || etablissement || "Établissement non renseigné",
      indicateurs: missionIndicateurs as IndicateurDecrochage[],
      nb_eleves_risque: missionNbEleves,
      gravite: missionGravite as 1 | 2 | 3 | 4 | 5,
      description: missionDescription.trim(),
    });

    setMissionEnvoi(false);

    if (!res.ok) {
      setMissionErreur(res.error);
      return;
    }

    setMissionSucces("✅ Signalement transmis avec succès au Cabinet Ministériel ! La mission est désormais validée pour votre profil.");
    setMissionActiveId(null);
    setMissionIndicateurs([]);
    setMissionNbEleves(0);
    setMissionGravite(3);
    setMissionDescription("");

    // Recharger la liste pour afficher immédiatement le badge Terminé et le mode lecture seule
    await chargerMissions();
  };

  const chargerConsultations = async () => {
    if (consultations) return;
    const [c, r] = await Promise.all([fetchConsultations(), fetchReponses()]);
    setConsultations(c);
    setReponses(r);
  };

  const consultationsPertinentes = useMemo(() => {
    if (!consultations) return [];
    return consultations.filter((c) => {
      if (c.statut !== "ouverte") return false;
      if (!c.region_cible) return true;
      if (!region) return false;
      return (
        c.region_cible === region &&
        (!c.province_cible || c.province_cible === province) &&
        (!c.commune_cible || c.commune_cible === commune)
      );
    });
  }, [consultations, region, province, commune]);

  // Soumission alerte spontanée libre
  const soumettreLibre = async (e: React.FormEvent) => {
    e.preventDefault();
    setSucces(null);
    setErreur(null);

    if (!emetteur.trim()) return setErreur("Veuillez saisir le nom de l'émetteur.");
    if (!geoOK) return setErreur("Veuillez compléter toute la localisation.");
    if (indicateurs.length === 0) return setErreur("Sélectionnez au moins un indicateur de risque.");
    if (nbEleves < 0 || !Number.isInteger(nbEleves)) return setErreur("Le nombre d'élèves doit être un entier positif.");
    if (description.trim().length < 30) return setErreur("Merci de détailler le contexte (minimum 30 caractères).");

    setEnvoi(true);
    const result = await insertSignalement({
      profil_id: session?.id || null,
      emetteur: emetteur.trim(),
      role_emetteur: role,
      region,
      province,
      commune,
      village_secteur: village.trim() || null,
      etablissement,
      categorie: "decrochage",
      indicateurs: indicateurs as IndicateurDecrochage[],
      nb_eleves_risque: nbEleves,
      gravite: gravite as 1 | 2 | 3 | 4 | 5,
      description: description.trim(),
    });
    setEnvoi(false);

    if (!result.ok) return setErreur(result.error);

    setSucces("✅ Alerte transmise à la base nationale. Merci pour votre engagement sur le terrain.");
    setDescription("");
    setIndicateurs([]);
    setNbEleves(0);
    setGravite(3);
  };

  const reponsesDe = (idConsultation: string) =>
    reponses?.filter((r) => r.consultation_id === idConsultation) ?? [];

  const envoyerReponse = async (idConsultation: string) => {
    if (texteReponse.trim().length < 15) return;
    setReponseEnvoi(true);
    const result = await insertReponse({
      consultation_id: idConsultation,
      role_emetteur: role,
      emetteur: emetteur.trim() || "Acteur terrain",
      region: region || "—",
      province: province || "—",
      commune: commune || "—",
      etablissement: etablissement || null,
      contenu: texteReponse.trim(),
    });
    if (result.ok && result.mode === "demo") {
      setReponses([
        {
          id: `local-${Date.now()}`,
          consultation_id: idConsultation,
          role_emetteur: role,
          emetteur: emetteur.trim() || "Acteur terrain",
          region: region || "—",
          province: province || "—",
          commune: commune || "—",
          etablissement,
          contenu: texteReponse.trim(),
          created_at: new Date().toISOString(),
        },
        ...(reponses ?? DEMO_REPONSES),
      ]);
    } else if (result.ok) {
      const r = await fetchReponses();
      setReponses(r);
    }
    setReponseEnvoi(false);
    setTexteReponse("");
    setReponseOuverte(null);
  };

  if (!session) {
    return (
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-24 text-slate-600">
        <Loader2 className="animate-spin text-institution" size={24} />
        Vérification de votre session terrain…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* En-tête profil */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Espace Terrain</h1>
          <p className="mt-1 text-slate-600">
            Liaison opérationnelle avec le Cabinet Ministériel & Alerte précoce.
          </p>
        </div>
        <Card className="flex items-center gap-3 px-4 py-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-institution/10 text-institution">
            <UserRound size={18} />
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold leading-tight text-slate-800">
              {session.prenom ? `${session.prenom} ${session.nom}` : session.nom}
            </p>
            <p className="text-xs text-slate-500">
              {session.matricule ? `Matricule ${session.matricule}` : session.email} · {ROLE_LABELS[role]}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={deconnexion} aria-label="Se déconnecter">
            <LogOut size={15} /> Quitter
          </Button>
        </Card>
      </div>

      {/* Message de succès global des missions */}
      {missionSucces && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-faso-green/30 bg-faso-green/10 p-4 text-sm text-faso-green">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{missionSucces}</span>
          </div>
          <button
            onClick={() => setMissionSucces(null)}
            className="text-xs font-semibold hover:underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Onglets principaux */}
      <div className="mt-8 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setOnglet("missions")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${onglet === "missions"
              ? "bg-institution text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
            }`}
        >
          <ClipboardList size={16} />
          <span>Ordres de Mission</span>
          {nbMissionsEnAttente > 0 ? (
            <span className="rounded-full bg-institution px-2 py-0.5 text-xs font-bold text-white">
              {nbMissionsEnAttente} à faire
            </span>
          ) : (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
              {missionsTerrain.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setOnglet("signaler")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            onglet === "signaler"
              ? "bg-institution text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <AlertTriangle size={16} />
          <span>Alerte Précoce Spontanée</span>
        </button>

        <button
          onClick={() => {
            setOnglet("consultations");
            void chargerConsultations();
          }}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            onglet === "consultations"
              ? "bg-institution text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <BellRing size={16} />
          <span>Consultations</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 1. ONGLET ORDRES DE MISSION (POINTS 9, 10, 11)             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {onglet === "missions" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-900">
            <p className="font-semibold flex items-center gap-1.5">
              <ClipboardList size={17} className="text-blue-700" /> Ordres de mission émis par le Cabinet Ministériel
            </p>
            <p className="mt-1 text-xs text-blue-800">
              Chaque ordre de mission requiert un signalement ou relevé de données. Une fois votre signalement transmis,
              la mission passe automatiquement en statut <strong>Terminée</strong> pour votre profil et reste consultable
              en lecture seule. Aucun doublon ne peut être envoyé pour une même mission.
            </p>
          </div>

          {chargementMissions ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="animate-spin text-institution" size={24} />
              <span className="ml-2 text-sm">Synchronisation avec le Cabinet…</span>
            </div>
          ) : missionsTerrain.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-slate-500">
                Aucun ordre de mission ne vous est actuellement attribué pour votre zone ({session.region || "Burkina Faso"}).
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {missionsTerrain.map((m) => {
                const monSignalement = identifierMonSignalement(m.id);
                const estEffectuee = Boolean(monSignalement);
                const estOuvertePourSaisie = missionActiveId === m.id;
                const estAfficheeEnLecture = missionAfficheeLectureId === m.id;

                return (
                  <Card
                    key={m.id}
                    className={`border transition ${estEffectuee
                        ? "border-faso-green/40 bg-faso-green/[0.02]"
                        : "border-slate-200 bg-white shadow-sm"
                      }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {estEffectuee ? (
                              <Badge className="bg-faso-green/15 text-faso-green font-semibold">
                                <CheckCircle2 size={13} className="mr-1" /> Terminée pour vous
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 font-semibold">
                                <AlertTriangle size={13} className="mr-1" /> À exécuter
                              </Badge>
                            )}

                            {m.region_cible ? (
                              <Badge className="bg-slate-100 text-slate-600 text-xs">
                                <MapPin size={11} className="mr-1" />
                                {m.commune_cible ?? m.province_cible ?? m.region_cible}
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-50 text-blue-700 text-xs">Portée nationale</Badge>
                            )}

                            {m.echeance && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Calendar size={12} /> Échéance : {formatDateFr(m.echeance)}
                              </span>
                            )}
                          </div>
                          <CardTitle className="text-lg text-slate-900">{m.titre}</CardTitle>
                        </div>

                        {/* Actions selon état d'avancement de CET utilisateur */}
                        <div className="shrink-0">
                          {estEffectuee ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setMissionAfficheeLectureId((prev) => (prev === m.id ? null : m.id))
                              }
                              className="gap-1.5 text-slate-700"
                            >
                              <Eye size={14} />
                              {estAfficheeEnLecture ? "Masquer mon signalement" : "Voir mon signalement (Lecture seule)"}
                              {estAfficheeEnLecture ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setMissionActiveId((prev) => (prev === m.id ? null : m.id));
                                setMissionErreur(null);
                              }}
                              className="gap-1.5"
                            >
                              <FileCheck2 size={14} />
                              {estOuvertePourSaisie ? "Fermer le formulaire" : "Exécuter la mission"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                      <p className="text-sm text-slate-600">{m.description}</p>

                      {/* Objectifs & consignes de la mission */}
                      <div className="grid gap-2 sm:grid-cols-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                        <div>
                          <strong className="block font-semibold text-slate-900 mb-0.5">Objectifs :</strong>
                          <p className="whitespace-pre-line text-slate-600">{m.objectifs}</p>
                        </div>
                        {m.consignes && (
                          <div>
                            <strong className="block font-semibold text-amber-800 mb-0.5">Consignes :</strong>
                            <p className="whitespace-pre-line text-slate-600">{m.consignes}</p>
                          </div>
                        )}
                      </div>

                      {/* ── CONSULTATION EN LECTURE SEULE DU SIGNALEMENT DÉJÀ TRANSMIS (RÈGLE 9) ── */}
                      {estEffectuee && monSignalement && estAfficheeEnLecture && (
                        <div className="mt-4 rounded-xl border border-faso-green/30 bg-faso-green/5 p-4 text-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-faso-green/20 pb-2">
                            <span className="font-semibold text-faso-green flex items-center gap-1.5">
                              <Lock size={14} /> Signalement transmis le {formatDateFr(monSignalement.created_at)} (Verrouillé)
                            </span>
                            <Badge className="bg-faso-green/20 text-faso-green text-xs">
                              Statut : Transmis
                            </Badge>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-3 text-xs">
                            <div>
                              <span className="text-slate-500 block">Élèves signalés :</span>
                              <strong className="text-slate-800 text-sm">{monSignalement.nb_eleves_risque} élève(s)</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Urgence évaluée :</span>
                              <strong className="text-slate-800 text-sm">{GRAVITE_LABELS[monSignalement.gravite]}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Établissement rattaché :</span>
                              <strong className="text-slate-800 text-sm">{monSignalement.etablissement}</strong>
                            </div>
                          </div>

                          {monSignalement.indicateurs.length > 0 && (
                            <div>
                              <span className="text-xs text-slate-500 block mb-1">Indicateurs observés :</span>
                              <div className="flex flex-wrap gap-1">
                                {monSignalement.indicateurs.map((ind) => (
                                  <span
                                    key={ind}
                                    className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs text-slate-700"
                                  >
                                    {INDICATEURS_DECROCHAGE[ind as keyof typeof INDICATEURS_DECROCHAGE]?.label ?? ind}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <span className="text-xs text-slate-500 block mb-1">Observations détaillées transmises :</span>
                            <p className="rounded-lg bg-white p-3 text-xs text-slate-700 border border-slate-200 whitespace-pre-wrap">
                              {monSignalement.description}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500 italic">
                            🔒 Ce signalement a été définitivement transmis au Cabinet Ministériel. Il ne peut pas être modifié ni re-soumis.
                          </p>
                        </div>
                      )}

                      {/* ── FORMULAIRE DE TRANSMISSION DE LA MISSION (NON ENCORE EFFECTUÉE) ── */}
                      {!estEffectuee && estOuvertePourSaisie && (
                        <div className="mt-4 rounded-xl border border-institution/30 bg-institution/[0.02] p-5 space-y-4">
                          <div className="border-b border-institution/20 pb-2">
                            <h3 className="font-bold text-institution text-base">
                              Formulaire officiel de signalement · {m.titre}
                            </h3>
                            <p className="text-xs text-slate-500">
                              Renseignez les données observées sur le terrain conformément aux consignes ci-dessus.
                            </p>
                          </div>

                          {missionErreur && (
                            <p className="flex items-center gap-2 rounded-lg border border-faso-red/30 bg-faso-red/10 px-3 py-2 text-xs text-faso-red">
                              <AlertTriangle size={15} /> {missionErreur}
                            </p>
                          )}

                          <div>
                            <Label className="text-xs font-semibold text-slate-700">
                              Signaux faibles observés pour cette mission *
                            </Label>
                            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                              {(Object.entries(INDICATEURS_DECROCHAGE) as [string, { label: string; poids: number }][]).map(
                                ([cle, { label }]) => {
                                  const actif = missionIndicateurs.includes(cle);
                                  return (
                                    <button
                                      type="button"
                                      key={cle}
                                      onClick={() => toggleMissionIndicateur(cle)}
                                      className={`flex items-center gap-2 rounded-lg border p-2 text-left text-xs transition ${actif
                                          ? "border-institution bg-institution/10 text-institution font-medium"
                                          : "border-slate-200 bg-white text-slate-700 hover:border-institution/40"
                                        }`}
                                    >
                                      <span
                                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${actif ? "border-institution bg-institution text-white" : "border-slate-300"
                                          }`}
                                      >
                                        {actif && <CheckCircle2 size={12} />}
                                      </span>
                                      <span className="truncate">{label}</span>
                                    </button>
                                  );
                                }
                              )}
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <Label htmlFor={`nb-${m.id}`} className="text-xs font-semibold text-slate-700">
                                Nombre d'élèves concernés / à risque
                              </Label>
                              <Input
                                id={`nb-${m.id}`}
                                type="number"
                                min={0}
                                value={missionNbEleves || ""}
                                onChange={(e) =>
                                  setMissionNbEleves(Math.max(0, Math.floor(Number(e.target.value) || 0)))
                                }
                                placeholder="Ex : 12"
                                className="mt-1 h-9 text-xs"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`grav-${m.id}`} className="text-xs font-semibold text-slate-700">
                                Urgence perçue : {GRAVITE_LABELS[missionGravite]}
                              </Label>
                              <input
                                id={`grav-${m.id}`}
                                type="range"
                                min={1}
                                max={5}
                                step={1}
                                value={missionGravite}
                                onChange={(e) => setMissionGravite(Number(e.target.value))}
                                className="mt-2 w-full accent-institution"
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor={`desc-${m.id}`} className="text-xs font-semibold text-slate-700">
                              Observations de terrain & rapport de mission *
                            </Label>
                            <Textarea
                              id={`desc-${m.id}`}
                              rows={4}
                              placeholder="Détaillez vos constats, les entretiens avec les familles, la situation des registres…"
                              value={missionDescription}
                              onChange={(e) => setMissionDescription(e.target.value)}
                              className="mt-1 text-xs"
                            />
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              disabled={missionEnvoi}
                              onClick={() => void soumettreSignalementPourMission(m)}
                              className="gap-1.5"
                            >
                              {missionEnvoi ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}
                              {missionEnvoi ? "Transmission en cours…" : "Transmettre définitivement mon signalement"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setMissionActiveId(null)}
                            >
                              Annuler
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 2. ONGLET ALERTE PRÉCOCE SPONTANÉE LIBRE                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {onglet === "signaler" && (
        <form onSubmit={soumettreLibre} className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1 · Identité de l'émetteur</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-institution/10 text-institution">
                  <UserRound size={20} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{emetteur || "—"}</p>
                  <p className="text-xs text-slate-500">Matricule {session.matricule ?? "—"}</p>
                </div>
                <Badge className="bg-institution/10 text-institution">{ROLE_LABELS[role]}</Badge>
                <p className="ml-auto text-xs text-slate-400">Verrouillé — profil du compte</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2 · Localité précise de l'alerte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <GeoSelector
                region={region}
                province={province}
                commune={commune}
                etablissement={etablissement}
                onChange={(patch) => {
                  if (patch.region !== undefined) setRegion(patch.region);
                  if (patch.province !== undefined) setProvince(patch.province);
                  if (patch.commune !== undefined) setCommune(patch.commune);
                  if (patch.etablissement !== undefined) setEtablissement(patch.etablissement);
                }}
              />
              <div className="max-w-md">
                <Label htmlFor="village">Village / Secteur (facultatif)</Label>
                <Input
                  id="village"
                  placeholder="Ex : Gounghin, Sarfalao…"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3 · Signaux faibles de décrochage observés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.entries(INDICATEURS_DECROCHAGE) as [string, { label: string; poids: number }][]).map(
                  ([cle, { label, poids }]) => {
                    const actif = indicateurs.includes(cle);
                    return (
                      <button
                        type="button"
                        key={cle}
                        onClick={() => toggleIndicateurLibre(cle)}
                        aria-pressed={actif}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${actif
                            ? "border-faso-red bg-faso-red/5 ring-2 ring-faso-red/30"
                            : "border-slate-200 bg-white hover:border-faso-red/40"
                          }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${actif ? "border-faso-red bg-faso-red text-white" : "border-slate-300 bg-white"
                            }`}
                        >
                          {actif && <CheckCircle2 size={14} />}
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-slate-800">{label}</span>
                          <span className="block text-xs text-slate-500">Poids de criticité : {poids}/5</span>
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="nb-eleves">Nombre d'élèves en danger de déscolarisation</Label>
                  <Input
                    id="nb-eleves"
                    type="number"
                    min={0}
                    required
                    placeholder="Ex : 19"
                    value={nbEleves || ""}
                    onChange={(e) => setNbEleves(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                  />
                </div>
                <div>
                  <Label htmlFor="gravite">Urgence perçue : {GRAVITE_LABELS[gravite]}</Label>
                  <input
                    id="gravite"
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={gravite}
                    onChange={(e) => setGravite(Number(e.target.value))}
                    className="mt-3 w-full accent-institution"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description libre du contexte</Label>
                <Textarea
                  id="description"
                  rows={5}
                  placeholder="Ex : Sur 52 filles inscrites en 6e, 19 ne reviennent plus depuis novembre…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {erreur && (
            <p className="flex items-center gap-2 rounded-lg border border-faso-red/30 bg-faso-red/10 px-4 py-3 text-sm text-faso-red">
              <AlertTriangle size={18} className="shrink-0" /> {erreur}
            </p>
          )}
          {succes && (
            <p className="flex items-center gap-2 rounded-lg border border-faso-green/30 bg-faso-green/10 px-4 py-3 text-sm text-faso-green">
              <CheckCircle2 size={18} /> {succes}
            </p>
          )}

          <Button type="submit" size="lg" disabled={envoi} className="w-full sm:w-auto">
            {envoi ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {envoi ? "Transmission en cours…" : "Transmettre l'alerte au système national"}
          </Button>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 3. ONGLET CONSULTATIONS                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {onglet === "consultations" && (
        <div className="mt-6 space-y-4">
          {!consultations ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
              <Loader2 className="animate-spin text-institution" size={20} /> Chargement des consultations…
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500">
                {consultationsPertinentes.length} consultation(s) applicable(s) à votre zone.
              </p>
              {consultationsPertinentes.length === 0 && (
                <Card>
                  <CardContent className="p-6 text-sm text-slate-600">
                    Aucune consultation ministérielle en cours pour votre zone.
                  </CardContent>
                </Card>
              )}
              {consultationsPertinentes.map((c) => {
                const rs = reponsesDe(c.id);
                const ouverte = reponseOuverte === c.id;
                return (
                  <Card key={c.id}>
                    <CardHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-faso-green/10 text-faso-green">
                          <BellRing size={13} /> Ouverte
                        </Badge>
                        <Badge className="bg-slate-100 text-slate-600">
                          {c.region_cible ? `Ciblée : ${c.commune_cible ?? c.province_cible ?? c.region_cible}` : "Nationale"}
                        </Badge>
                        <span className="text-xs text-slate-500">Publiée le {formatDateFr(c.date_publication)}</span>
                      </div>
                      <CardTitle>{c.titre}</CardTitle>
                      <p className="text-sm text-slate-600">{c.question}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {rs.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase text-slate-500">
                            Réponses du terrain ({rs.length})
                          </p>
                          {rs.map((r) => (
                            <div key={r.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                              <p className="font-medium text-slate-700">
                                {r.emetteur}{" "}
                                <span className="text-xs font-normal text-slate-500">
                                  · {ROLE_LABELS[r.role_emetteur]} · {r.commune}
                                </span>
                              </p>
                              <p className="mt-1 text-slate-600">{r.contenu}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {ouverte ? (
                        <div className="space-y-2">
                          <Textarea
                            rows={3}
                            autoFocus
                            placeholder="Votre réponse au ministère…"
                            value={texteReponse}
                            onChange={(e) => setTexteReponse(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              disabled={reponseEnvoi || texteReponse.trim().length < 15}
                              onClick={() => void envoyerReponse(c.id)}
                            >
                              {reponseEnvoi ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                              Envoyer
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setReponseOuverte(null)}>
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReponseOuverte(c.id);
                            setTexteReponse("");
                          }}
                        >
                          Répondre en tant que {ROLE_LABELS[role]}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
