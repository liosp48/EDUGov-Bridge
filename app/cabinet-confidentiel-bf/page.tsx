"use client";

// ═══════════════════════════════════════════════════════════════════
// EDUGov-Bridge — Portail Privé Ministériel & Décideurs Nationaux
// URL SECRÈTE STRICTEMENT CONFIDENTIELLE : /cabinet-confidentiel-bf
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileText,
  Filter,
  Loader2,
  Lock,
  MapPin,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
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
  Select,
} from "@/components/ui";
import {
  chargerSession,
  effacerSession,
  sauverSession,
  verifierEmailGouvernemental,
  type SessionUtilisateur,
} from "@/lib/auth";
import { connexionGouvernement } from "@/app/auth/actions";
import { fetchMissions, fetchSignalementsMission } from "@/lib/missions";
import type { Mission, SignalementMission, UserRole } from "@/types/database";
import {
  MISSION_STATUT_COLORS,
  MISSION_STATUT_LABELS,
  ROLE_LABELS,
  TERRAIN_ROLES,
} from "@/types/database";
import { formatDateFr } from "@/lib/utils";
import { GEO_BURKINA, type RegionGeo } from "@/lib/geographie";
import { deconnexion as deconnexionServeur } from "@/app/auth/actions";

// ── Vue Dashboard & Suivi des Ordres de Mission (après authentification) ──

function Dashboard({
  session,
  onDeconnexion,
}: {
  session: SessionUtilisateur;
  onDeconnexion: () => void;
}) {
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [signalements, setSignalements] = useState<SignalementMission[]>([]);
  const [chargement, setChargement] = useState(true);

  // Filtres
  const [filtreStatut, setFiltreStatut] = useState<"tous" | Mission["statut"]>("tous");
  const [recherche, setRecherche] = useState("");
  const [filtreRegion, setFiltreRegion] = useState("");
  const [filtreRole, setFiltreRole] = useState<string>("");
  const [afficherFiltresAvances, setAfficherFiltresAvances] = useState(false);

  useEffect(() => {
    void (async () => {
      const [m, s] = await Promise.all([fetchMissions(), fetchSignalementsMission()]);
      setMissions(m);
      setSignalements(s);
      setChargement(false);
    })();
  }, []);

  // Filtrage multi-critères (Exigence 10.2)
  const missionsFiltrees = missions.filter((m) => {
    // 1. Statut
    if (filtreStatut !== "tous" && m.statut !== filtreStatut) return false;

    // 2. Recherche textuelle (titre ou description)
    if (recherche.trim()) {
      const term = recherche.toLowerCase();
      const matchTitre = m.titre.toLowerCase().includes(term);
      const matchDesc = m.description.toLowerCase().includes(term);
      if (!matchTitre && !matchDesc) return false;
    }

    // 3. Région
    if (filtreRegion) {
      if (filtreRegion === "nationale") {
        if (m.region_cible) return false;
      } else {
        if (m.region_cible && m.region_cible !== filtreRegion) return false;
      }
    }

    // 4. Rôle d'acteur ciblé
    if (filtreRole && m.roles_cibles.length > 0) {
      if (!m.roles_cibles.includes(filtreRole as UserRole)) return false;
    }

    return true;
  });

  // KPIs globaux
  const totalMissions = missions.length;
  const brouillons = missions.filter((m) => m.statut === "brouillon").length;
  const publiees = missions.filter((m) => m.statut === "publiee").length;
  const enCours = missions.filter((m) => m.statut === "en_cours").length;
  const terminees = missions.filter((m) => m.statut === "terminee").length;
  const cloturees = missions.filter((m) => m.statut === "cloturee").length;
  const totalSignalements = signalements.length;

  const signalementsParMission = (id: string) =>
    signalements.filter((s) => s.mission_id === id).length;

  const FILTRES: Array<{ key: "tous" | Mission["statut"]; label: string; count: number }> = [
    { key: "tous", label: "Toutes les missions", count: totalMissions },
    { key: "brouillon", label: "Brouillons", count: brouillons },
    { key: "publiee", label: "Publiées", count: publiees },
    { key: "en_cours", label: "En cours", count: enCours },
    { key: "terminee", label: "Terminées", count: terminees },
    { key: "cloturee", label: "Clôturées", count: cloturees },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg">
              <Building2 size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Cabinet Ministériel & Décideurs</h1>
              <p className="text-sm text-slate-500">
                Supervision centrale des Ordres de Mission · Connecté : <strong>{session.email}</strong>
              </p>
            </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push("/ministere")}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <ClipboardList size={15} /> Tableau Stratégique
          </Button>
          <Button
            onClick={() => router.push("/cabinet-confidentiel-bf/missions/nouvelle")}
            size="sm"
            className="gap-1.5"
          >
            <Plus size={15} /> Nouvel ordre de mission
          </Button>
          <Button size="sm" variant="outline" onClick={onDeconnexion} className="gap-1.5">
            Quitter
          </Button>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Missions totales", value: totalMissions, color: "text-slate-800" },
          { label: "Publiées & En cours", value: publiees + enCours, color: "text-blue-600" },
          { label: "Missions terminées", value: terminees, color: "text-faso-green" },
          { label: "Signalements reçus du terrain", value: totalSignalements, color: "text-faso-red" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">{k.label}</p>
              <p className={`mt-1 text-3xl font-extrabold ${k.color}`}>{chargement ? "…" : k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Catégories de classement des missions (Exigence 10.2) */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {FILTRES.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltreStatut(f.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${filtreStatut === f.key
                ? "bg-institution text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
          >
            <span>{f.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${filtreStatut === f.key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Barre de recherche et filtres combinés */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Rechercher par mot-clé dans les missions…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setAfficherFiltresAvances((prev) => !prev)}
          className="gap-1.5 text-xs h-9"
        >
          <Filter size={13} />
          <span>Filtres région & rôles</span>
          {(filtreRegion || filtreRole) && (
            <span className="h-2 w-2 rounded-full bg-institution" />
          )}
        </Button>
      </div>

      {/* Panneau dépliable filtres avancés */}
      {afficherFiltresAvances && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
          <div>
            <Label htmlFor="f-region" className="text-xs font-semibold text-slate-700">
              Zone géographique
            </Label>
            <Select
              id="f-region"
              value={filtreRegion}
              onChange={(e) => setFiltreRegion(e.target.value)}
              className="mt-1 h-8 text-xs"
            >
              <option value="">Toutes les zones (nationales + régionales)</option>
              <option value="nationale">Missions d'envergure nationale uniquement</option>
              {GEO_BURKINA.map((r: RegionGeo) => (
                <option key={r.nom} value={r.nom}>
                  Région : {r.nom}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="f-role" className="text-xs font-semibold text-slate-700">
              Type d'acteurs de terrain ciblés
            </Label>
            <Select
              id="f-role"
              value={filtreRole}
              onChange={(e) => setFiltreRole(e.target.value)}
              className="mt-1 h-8 text-xs"
            >
              <option value="">Tous les types d'acteurs</option>
              {TERRAIN_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>

          {(filtreRegion || filtreRole) && (
            <div className="sm:col-span-2 flex justify-end">
              <button
                onClick={() => {
                  setFiltreRegion("");
                  setFiltreRole("");
                }}
                className="text-xs text-faso-red hover:underline"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      )}

      {/* Liste des missions classées */}
      <div className="mt-6 space-y-3">
        {chargement ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 className="animate-spin text-institution" size={24} />
            <span className="ml-2 text-sm">Chargement des missions…</span>
          </div>
        ) : missionsFiltrees.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-slate-500">
              Aucune mission ne correspond aux critères sélectionnés.
              <div className="mt-3">
                <Button
                  size="sm"
                  onClick={() => router.push("/cabinet-confidentiel-bf/missions/nouvelle")}
                  className="gap-1.5"
                >
                  <Plus size={14} /> Créer un ordre de mission
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          missionsFiltrees.map((m) => {
            const nbSignalements = signalementsParMission(m.id);
            return (
              <Card
                key={m.id}
                className="cursor-pointer transition hover:shadow-md hover:border-institution/40"
                onClick={() => router.push(`/cabinet-confidentiel-bf/missions/${m.id}`)}
              >
                <CardContent className="flex flex-wrap items-center gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <Badge className={MISSION_STATUT_COLORS[m.statut]}>
                        {MISSION_STATUT_LABELS[m.statut]}
                      </Badge>
                      {m.region_cible ? (
                        <Badge className="bg-slate-100 text-slate-700 text-xs">
                          <MapPin size={11} className="mr-1" />
                          {m.commune_cible ?? m.province_cible ?? m.region_cible}
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-50 text-blue-700 text-xs">Nationale</Badge>
                      )}
                      {m.roles_cibles.length > 0 && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Users size={12} />
                          {m.roles_cibles.map((r) => ROLE_LABELS[r]).join(", ")}
                        </span>
                      )}
                    </div>

                    <p className="font-semibold text-slate-900 text-base">{m.titre}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{m.description}</p>

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span>Créée le {formatDateFr(m.created_at)}</span>
                      {m.publiee_le && <span>· Émise le {formatDateFr(m.publiee_le)}</span>}
                      {m.echeance && (
                        <span className="text-amber-700 flex items-center gap-1">
                          <Calendar size={11} /> Échéance : {formatDateFr(m.echeance)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-5 shrink-0 border-l border-slate-100 pl-4">
                    <div className="text-center">
                      <p className="text-2xl font-black text-faso-green">{nbSignalements}</p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        signalement{nbSignalements > 1 ? "s" : ""}
                      </p>
                    </div>
                    <FileText size={18} className="text-slate-400" />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Formulaire de connexion (URL secrète — avant authentification) ──

export default function CabinetConfidentielPage() {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [alerteGov, setAlerteGov] = useState<string | null>(null);
  const [emailGov, setEmailGov] = useState("");
  const [session, setSession] = useState<SessionUtilisateur | null>(null);
  const [verifié, setVérifié] = useState(false);

  useEffect(() => {
    const s = chargerSession();
    if (s?.type_compte === "gouvernement") {
      setSession(s);
    } else if (s?.type_compte === "terrain") {
      router.replace("/terrain");
    }
    setVérifié(true);
  }, [router]);

  const verifierGovEnDirect = (valeur: string): boolean => {
    const verdict = verifierEmailGouvernemental(valeur);
    if (!valeur.trim()) {
      setAlerteGov(null);
      return false;
    }
    if (verdict.motif === "personnel") {
      setAlerteGov("⛔ Rejet : les adresses personnelles sont interdites. Utilisez votre adresse d'État officielle.");
      return false;
    }
    if (verdict.motif === "non_autorise") {
      setAlerteGov("⛔ Domaine non habilité. Domaines acceptés : @education.gov.bf, @presidence.bf, @presidence.gov.bf, @mtdpce.gov.bf");
      return false;
    }
    if (verdict.motif === "invalide") {
      setAlerteGov("Format d'email invalide.");
      return false;
    }
    setAlerteGov(null);
    return true;
  };

  const finaliser = (s: SessionUtilisateur) => {
    effacerSession();
    sauverSession(s);
    setSession(s);
    router.refresh();
  };

  const soumettreGouvernement = (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    if (!verifierGovEnDirect(emailGov)) {
      setAlerteGov((a) => a ?? "⛔ Accès refusé : domaine email non conforme.");
      return;
    }
    demarrer(async () => {
      const resultat = await connexionGouvernement({ email: emailGov });
      if (resultat.ok) finaliser(resultat.session);
      else setErreur(resultat.error);
    });
  };

  const seDeconnecter = () => {
    void (async () => {
      await deconnexionServeur();
      effacerSession();
      setSession(null);
      router.refresh();
    })();
  };

  if (!verifié) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-institution" size={28} />
      </div>
    );
  }

  if (session?.type_compte === "gouvernement") {
    return <Dashboard session={session} onDeconnexion={seDeconnecter} />;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg ring-4 ring-slate-800">
            <Building2 size={32} />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Burkina Faso · Présidence & Ministères
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Cabinet Ministériel & Décideurs
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Portail stratégique confidentiel — Accès réservé aux membres du Gouvernement et hauts décideurs.
          </p>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-700" />
          <div>
            <strong className="block font-semibold">Accès strictement confidentiel et restreint</strong>
            Cette URL privée est réservée aux autorités de tutelle. Les connexions font l'objet d'un audit de conformité.
          </div>
        </div>

        {erreur && (
          <p className="mt-6 flex items-start gap-2 rounded-xl border border-faso-red/30 bg-faso-red/10 px-4 py-3 text-sm text-faso-red">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" /> {erreur}
          </p>
        )}

        <Card className="mt-6 border-2 border-slate-900/10 shadow-lg">
          <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                <Lock size={17} className="text-faso-green" /> Authentification Haute Sécurité
              </CardTitle>
              <Badge className="bg-faso-green/15 text-faso-green font-semibold">
                <ShieldCheck size={13} /> Protocole d'État
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={soumettreGouvernement} className="space-y-5">
              <div>
                <Label htmlFor="email-gov" className="text-sm font-semibold text-slate-800">
                  Adresse email gouvernementale officielle
                </Label>
                <Input
                  id="email-gov"
                  type="email"
                  required
                  autoComplete="email"
                  className={`mt-1.5 ${alerteGov ? "border-faso-red focus:border-faso-red" : ""}`}
                  placeholder="prenom.nom@education.gov.bf"
                  value={emailGov}
                  onChange={(e) => {
                    setEmailGov(e.target.value);
                    verifierGovEnDirect(e.target.value);
                  }}
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Domaines acceptés : <strong>@education.gov.bf</strong>, <strong>@presidence.bf</strong>,{" "}
                  <strong>@presidence.gov.bf</strong>, <strong>@mtdpce.gov.bf</strong>.
                </p>
              </div>

              {alerteGov ? (
                <p className="flex items-start gap-2 rounded-lg border border-faso-red/30 bg-faso-red/10 px-4 py-3 text-xs text-faso-red">
                  <Ban size={16} className="mt-0.5 shrink-0" /> {alerteGov}
                </p>
              ) : emailGov.trim() ? (
                <p className="flex items-start gap-2 rounded-lg border border-faso-green/30 bg-faso-green/10 px-4 py-3 text-xs text-faso-green">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> Domaine régalien valide.
                </p>
              ) : null}

              <Button
                type="submit"
                variant="green"
                size="lg"
                disabled={enCours}
                className="w-full font-semibold shadow-md"
              >
                {enCours ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />}
                {enCours ? "Vérification en cours…" : "Accéder au Cabinet"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      );
}
