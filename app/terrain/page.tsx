"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, LogOut, Send, BellRing, UserRound, Lightbulb } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea, Select } from "@/components/ui";
import GeoSelector from "@/components/geo-selector";
import { insertReponse, insertSignalement, fetchConsultations, fetchReponses } from "@/lib/supabase";
import { DEMO_REPONSES } from "@/lib/demo-data";
import {
  CATEGORIE_COLORS,
  CATEGORIE_LABELS,
  ROLE_LABELS,
  TERRAIN_ROLES,
  type CategorieSignalement,
  type Consultation,
  type ReponseConsultation,
  type UserRole,
} from "@/types/database";
import { formatDateFr } from "@/lib/utils";
import { chargerSession, effacerSession, type SessionUtilisateur } from "@/lib/auth";
import { deconnexion as deconnexionServeur } from "@/app/auth/actions";

type Onglet = "signaler" | "consultations";

const GRAVITE_LABELS: Record<number, string> = {
  1: "Mineur — à suivre",
  2: "Modéré — mérite attention",
  3: "Sérieux — à traiter ce trimestre",
  4: "Critique — action nécessaire",
  5: "Urgence vitale — intervention immédiate",
};

// ── Les 3 missions nationales auxquelles chaque signal contribue ──
// (défis du Data Challenge Burkina 2026 — miroir de l'accueil public)
const MISSIONS_TERRAIN = [
  {
    n: 1,
    titre: "Alerte Précoce & Détection des Signaux Faibles",
    defi: "Défi Décrochage Scolaire",
    desc: "Vos constats d'absences, de transhumance ou d'orpaillage interceptent le décrochage avant qu'il ne survienne.",
    categories: ["decrochage", "pedagogie"] as CategorieSignalement[],
    color: CATEGORIE_COLORS.decrochage,
  },
  {
    n: 2,
    titre: "Cartographie Terrain des Barrières d'Accès",
    defi: "Défi Inégalités & Équité",
    desc: "Vos mesures micro-locales cartographient distance, frais annexes, sécurité et inégalités de genre école par école.",
    categories: ["genre_rural", "securite"] as CategorieSignalement[],
    color: CATEGORIE_COLORS.genre_rural,
  },
  {
    n: 3,
    titre: "Inventaire Dynamique Collaboratif",
    defi: "Défi Infrastructures & Ressources",
    desc: "Vos inventaires temps réel listent tables-bancs, toitures, latrines et matériel manquant, établissement par établissement.",
    categories: ["infrastructure"] as CategorieSignalement[],
    color: CATEGORIE_COLORS.infrastructure,
  },
];

const missionDe = (c: CategorieSignalement) =>
  MISSIONS_TERRAIN.find((m) => m.categories.includes(c));

export default function TerrainPage() {
  const router = useRouter();
  const [onglet, setOnglet] = useState<Onglet>("signaler");
  const [session, setSession] = useState<SessionUtilisateur | null>(null);

  // ── Garde de session : réservé aux acteurs du terrain authentifiés ──
  useEffect(() => {
    const s = chargerSession();
    if (!s || s.type_compte !== "terrain") {
      router.replace("/auth");
      return;
    }
    setSession(s);
    // Pré-remplissage avec l'identité authentifiée
    setRole(s.role as UserRole);
    setEmetteur([s.prenom, s.nom].filter(Boolean).join(" "));
    if (s.region) setRegion(s.region);
    if (s.province) setProvince(s.province);
    if (s.commune) setCommune(s.commune);
    if (s.etablissement) setEtablissement(s.etablissement);
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

  // Identité terrain
  const [role, setRole] = useState<UserRole>("enseignant");
  const [emetteur, setEmetteur] = useState("");
  const [village, setVillage] = useState("");

  // Géographie
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [commune, setCommune] = useState("");
  const [etablissement, setEtablissement] = useState("");

  // Signalement
  const [categorie, setCategorie] = useState<CategorieSignalement>("decrochage");
  const [gravite, setGravite] = useState(3);
  const [description, setDescription] = useState("");
  const [proposition, setProposition] = useState("");

  // États UI
  const [envoi, setEnvoi] = useState(false);
  const [succes, setSucces] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const [consultations, setConsultations] = useState<Consultation[] | null>(null);
  const [reponses, setReponses] = useState<ReponseConsultation[] | null>(null);
  const [reponseOuverte, setReponseOuverte] = useState<string | null>(null);
  const [texteReponse, setTexteReponse] = useState("");
  const [reponseEnvoi, setReponseEnvoi] = useState(false);

  const geoOK = useMemo(() => Boolean(region && province && commune && etablissement), [region, province, commune, etablissement]);

  const chargerConsultations = async () => {
    if (consultations) return;
    const [c, r] = await Promise.all([fetchConsultations(), fetchReponses()]);
    setConsultations(c);
    setReponses(r);
  };

  // Consultations pertinentes : ouvertes, ciblées sur la géo de l'utilisateur OU nationales
  const consultationsPertinentes = useMemo(() => {
    if (!consultations) return [];
    return consultations.filter((c) => {
      if (c.statut !== "ouverte") return false;
      if (!c.region_cible) return true; // nationale
      if (!region) return false;
      return (
        c.region_cible === region &&
        (!c.province_cible || c.province_cible === province) &&
        (!c.commune_cible || c.commune_cible === commune)
      );
    });
  }, [consultations, region, province, commune]);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setSucces(null);
    setErreur(null);

    if (!emetteur.trim()) return setErreur("Veuillez saisir le nom de l'émetteur.");
    if (!geoOK) return setErreur("Veuillez compléter toute la localisation (région, province, commune, établissement).");
    if (description.trim().length < 30)
      return setErreur("Merci de détailler le constat (minimum 30 caractères) pour que l'analyse soit utile.");

    setEnvoi(true);
    const result = await insertSignalement({
      profil_id: null,
      emetteur: emetteur.trim(),
      role_emetteur: role,
      region,
      province,
      commune,
      village_secteur: village.trim() || null,
      etablissement,
      categorie,
      gravite: gravite as 1 | 2 | 3 | 4 | 5,
      description: description.trim(),
      proposition_innovation: proposition.trim() || null,
    });
    setEnvoi(false);

    if (!result.ok) return setErreur(result.error);

    setSucces(
      result.mode === "supabase"
        ? "✅ Signalement transmis à la base nationale. Merci : votre voix est comptabilisée."
        : "✅ Signalement enregistré (mode démo). Merci : votre voix est comptabilisée."
    );
    setDescription("");
    setProposition("");
    setGravite(3);
  };

  // ── Sous-onglet Consultations ──────────────────────────────────
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
      // Ajout local pour preuve immédiate en mode démo
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

  // Le garde session est testé APRÈS tous les hooks (règle React)
  if (!session) {
    return (
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-24 text-slate-600">
        <Loader2 className="animate-spin text-institution" size={24} />
        Vérification de votre session terrain… redirection vers la connexion.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Espace Acteurs du Terrain</h1>
          <p className="mt-1 text-slate-600">
            Votre constat devient une donnée nationale. Votre innovation peut inspirer tout le Burkina.
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
              {session.matricule ? `Matricule ${session.matricule}` : session.email}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={deconnexion} aria-label="Se déconnecter">
            <LogOut size={15} /> Quitter
          </Button>
        </Card>
      </div>

      {/* ── Vos signaux alimentent 3 missions nationales ──────────── */}
      <Card className="mt-6 border-l-4 border-l-faso-green">
        <CardHeader>
          <CardTitle>Chaque signal que vous remontez alimente 3 missions nationales</CardTitle>
          <p className="text-sm text-slate-600">
            Vos contributions entrent directement dans les défis du Data Challenge Burkina 2026.
            Vos signalements sont catégorisés vers la mission correspondante, automatiquement.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {MISSIONS_TERRAIN.map((m) => (
              <div
                key={m.n}
                className="rounded-xl border border-slate-200 bg-white p-4"
                style={{ borderTopColor: m.color, borderTopWidth: 3 }}
              >
                <Badge color={m.color}>Mission {m.n} · {m.defi}</Badge>
                <p className="mt-2 text-sm font-semibold text-slate-900">{m.titre}</p>
                <p className="mt-1 text-xs text-slate-500">{m.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Onglets */}
      <div className="mt-8 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-card">
        {(
          [
            { key: "signaler", label: "Signaler / Proposer" },
            { key: "consultations", label: "Consultations Ministérielles" },
          ] as { key: Onglet; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setOnglet(t.key);
              if (t.key === "consultations") void chargerConsultations();
            }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              onglet === t.key ? "bg-institution text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {onglet === "signaler" ? (
        <form onSubmit={soumettre} className="mt-6 space-y-6">
          {/* ── 1. Qui êtes-vous ? ─────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>1 · Identité de l'émetteur</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="role">Rôle</Label>
                <Select id="role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                  {TERRAIN_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="emetteur">Nom complet</Label>
                <Input
                  id="emetteur"
                  placeholder="Ex : Aïcha Ouédraogo"
                  value={emetteur}
                  onChange={(e) => setEmetteur(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── 2. Localisation ───────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>2 · Localisation exacte</CardTitle>
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

          {/* ── 3. Transmission ───────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>3 · Transmission du signal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="categorie">Catégorie</Label>
                  <Select
                    id="categorie"
                    value={categorie}
                    onChange={(e) => setCategorie(e.target.value as CategorieSignalement)}
                  >
                    {(Object.keys(CATEGORIE_LABELS) as CategorieSignalement[]).map((c) => (
                      <option key={c} value={c}>
                        {CATEGORIE_LABELS[c]}
                      </option>
                    ))}
                  </Select>
                  {missionDe(categorie) && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: missionDe(categorie)!.color }}
                      />
                      <span className="font-medium text-slate-700">
                        Votre signal alimente la Mission {missionDe(categorie)!.n}
                      </span>
                      <span className="text-slate-500">— {missionDe(categorie)!.titre}</span>
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="gravite">Niveau de gravité : {GRAVITE_LABELS[gravite]}</Label>
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
                <Label htmlFor="description">Description détaillée du constat (données chiffrées appréciées)</Label>
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

          {/* ── 4. Boîte à Solutions ────────────────────────────── */}
          <Card className="border-l-4" style={{ borderLeftColor: missionDe(categorie)?.color ?? CATEGORIE_COLORS.decrochage }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb size={19} className="text-amber-500" />
                4 · Boîte à Solutions — votre innovation pour votre localité
              </CardTitle>
              <p className="text-sm text-slate-600">
                Proposez une idée d'innovation pédagogique ou logistique adaptée à{" "}
                <strong className="text-slate-800">
                  {commune || "votre commune"}
                  {commune ? ` (${region || "votre région"})` : ""}
                </strong>
                . Une idée pertinente peut inspirer tout le Burkina.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {[
                  "Parrainage scolaire par les notables",
                  "Cours du soir avec lampes solaires",
                  "Jardin maraîcher pour la cantine",
                  "Convois scolaires communautaires",
                  "Bibliothèque de classe numérique",
                  "Bancs fabriqués par les forgerons locaux",
                ].map((idee) => (
                  <button
                    key={idee}
                    type="button"
                    onClick={() => setProposition(idee + " — adapté à " + (commune || "ma localité") + " : ")}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 transition hover:border-institution/40 hover:text-institution"
                  >
                    {idee}
                  </button>
                ))}
              </div>
              <div>
                <Label htmlFor="proposition">Proposition d'idée novatrice</Label>
                <Textarea
                  id="proposition"
                  rows={4}
                  placeholder="Ex : Clubs de parrainage scolaire gérés par l'APE avec kits solaires…"
                  value={proposition}
                  onChange={(e) => setProposition(e.target.value)}
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Facultatif, mais précieux : les propositions les plus fertiles sont remontées
                  avec le signal du périmètre concerné.
                </p>
              </div>
            </CardContent>
          </Card>

          {erreur && (
            <p className="rounded-lg border border-faso-red/30 bg-faso-red/10 px-4 py-3 text-sm text-faso-red">
              {erreur}
            </p>
          )}
          {succes && (
            <p className="flex items-center gap-2 rounded-lg border border-faso-green/30 bg-faso-green/10 px-4 py-3 text-sm text-faso-green">
              <CheckCircle2 size={18} /> {succes}
            </p>
          )}

          <Button type="submit" size="lg" disabled={envoi} className="w-full sm:w-auto">
            {envoi ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {envoi ? "Transmission en cours…" : "Transmettre au système national"}
          </Button>
        </form>
      ) : (
        /* ── ONGLET CONSULTATIONS ────────────────────────────── */
        <div className="mt-6 space-y-4">
          {!consultations ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
              <Loader2 className="animate-spin text-institution" size={20} /> Chargement des
              consultations…
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500">
                {consultationsPertinentes.length} consultation(s) applicable(s) à votre localisation
                — les consultations nationales sont toujours affichées.
              </p>
              {consultationsPertinentes.length === 0 && (
                <Card>
                  <CardContent className="p-6 text-sm text-slate-600">
                    Aucune consultation ciblée sur votre zone actuellement. Réessayez après la
                    prochaine consultation ministérielle.
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
                        <Badge className="bg-slate-100 text-slate-600">{c.region_cible ? `Ciblée : ${c.commune_cible ?? c.province_cible ?? c.region_cible}` : "Nationale"}</Badge>
                        <span className="text-xs text-slate-500">
                          Publiée le {formatDateFr(c.date_publication)}
                          {c.date_cloture ? ` · clôture le ${formatDateFr(c.date_cloture)}` : ""}
                        </span>
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
                            <Button size="sm" disabled={reponseEnvoi || texteReponse.trim().length < 15} onClick={() => void envoyerReponse(c.id)}>
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
