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
  Select,
} from "@/components/ui";
import GeoSelector from "@/components/geo-selector";
import { insertReponse, insertSignalement, fetchConsultations, fetchReponses } from "@/lib/supabase";
import { DEMO_REPONSES } from "@/lib/demo-data";
import {
  INDICATEURS_DECROCHAGE,
  ROLE_LABELS,
  TERRAIN_ROLES,
  type Consultation,
  type IndicateurDecrochage,
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

  // Alerte précoce de décrochage (Défi 1)
  const [indicateurs, setIndicateurs] = useState<string[]>([]);
  const [nbEleves, setNbEleves] = useState<number>(0);
  const [gravite, setGravite] = useState(3);
  const [description, setDescription] = useState("");

  // États UI
  const [envoi, setEnvoi] = useState(false);
  const [succes, setSucces] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const [consultations, setConsultations] = useState<Consultation[] | null>(null);
  const [reponses, setReponses] = useState<ReponseConsultation[] | null>(null);
  const [reponseOuverte, setReponseOuverte] = useState<string | null>(null);
  const [texteReponse, setTexteReponse] = useState("");
  const [reponseEnvoi, setReponseEnvoi] = useState(false);

  const geoOK = useMemo(
    () => Boolean(region && province && commune && etablissement),
    [region, province, commune, etablissement]
  );

  const toggleIndicateur = (cle: string) => {
    setIndicateurs((prev) =>
      prev.includes(cle) ? prev.filter((i) => i !== cle) : [...prev, cle]
    );
  };

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
    if (!geoOK)
      return setErreur(
        "Veuillez compléter toute la localisation (région, province, commune, établissement)."
      );
    if (indicateurs.length === 0)
      return setErreur("Sélectionnez au moins un indicateur de risque observé.");
    if (nbEleves < 0 || !Number.isInteger(nbEleves))
      return setErreur("Le nombre d'élèves en danger doit être un entier positif.");
    if (description.trim().length < 30)
      return setErreur(
        "Merci de détailler le contexte (minimum 30 caractères) pour que l'analyse soit utile."
      );

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
      categorie: "decrochage",
      indicateurs: indicateurs as IndicateurDecrochage[],
      nb_eleves_risque: nbEleves,
      gravite: gravite as 1 | 2 | 3 | 4 | 5,
      description: description.trim(),
    });
    setEnvoi(false);

    if (!result.ok) return setErreur(result.error);

    setSucces(
      result.mode === "supabase"
        ? "✅ Alerte transmise à la base nationale. Merci : chaque jour gagné, c'est un enfant qui reste à l'école."
        : "✅ Alerte enregistrée (mode démo). Merci : chaque jour gagné, c'est un enfant qui reste à l'école."
    );
    setDescription("");
    setIndicateurs([]);
    setNbEleves(0);
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
          <h1 className="text-3xl font-bold text-slate-900">Espace Terrain — Alerte Précoce</h1>
          <p className="mt-1 text-slate-600">
            Votre observation d'aujourd'hui intercepte le décrochage de demain.
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

      {/* ── Bannière mission unique : Défi 1 ──────────────────────── */}
      <Card className="mt-6 border-l-4 border-l-faso-red">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-faso-red/10 text-faso-red">Défi 1 · Data Challenge Burkina 2026</Badge>
            <Badge className="bg-slate-100 text-slate-600">Anticipation du décrochage scolaire</Badge>
          </div>
          <CardTitle>Votre alerte déclenche la riposte nationale</CardTitle>
          <p className="text-sm text-slate-600">
            Dès qu'un élève disparaît des registres, chaque semaine compte. Sélectionnez les
            signaux faibles observés : ils alimentent en direct l'Indicateur Global de Risque (IRD)
            du tableau de bord ministériel et le plan d'urgence généré par IA.
          </p>
        </CardHeader>
      </Card>

      {/* Onglets */}
      <div className="mt-8 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-card">
        {(
          [
            { key: "signaler", label: "Alerte Précoce" },
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

          {/* ── 3. Signaux faibles observés ───────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>3 · Signaux faibles de décrochage observés</CardTitle>
              <p className="text-sm text-slate-600">
                Cochez tous les indicateurs que vous avez constatés sur vos élèves. Ces indicateurs
                calculent automatiquement le niveau de risque national.
              </p>
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
                        onClick={() => toggleIndicateur(cle)}
                        aria-pressed={actif}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                          actif
                            ? "border-faso-red bg-faso-red/5 ring-2 ring-faso-red/30"
                            : "border-slate-200 bg-white hover:border-faso-red/40"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            actif ? "border-faso-red bg-faso-red text-white" : "border-slate-300 bg-white"
                          }`}
                        >
                          {actif && <CheckCircle2 size={14} />}
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-slate-800">{label}</span>
                          <span className="block text-xs text-slate-500">
                            Poids de criticité : {poids}/5
                          </span>
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
                  <Label htmlFor="gravite">
                    Urgence perçue : {GRAVITE_LABELS[gravite]}
                  </Label>
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
                <Label htmlFor="description">
                  Description libre du contexte — ce que l'école observe, ce que disent les familles
                </Label>
                <Textarea
                  id="description"
                  rows={5}
                  placeholder="Ex : Sur 52 filles inscrites en 6e, 19 ne reviennent plus depuis novembre. Les familles indiquent qu'elles partent garder le bétail…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Ne jamais mentionner le nom complet d'un élève mineur : décrivez la situation, pas
                  l'identité.
                </p>
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
                        <Badge className="bg-slate-100 text-slate-600">
                          {c.region_cible
                            ? `Ciblée : ${c.commune_cible ?? c.province_cible ?? c.region_cible}`
                            : "Nationale"}
                        </Badge>
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
                            <Button
                              size="sm"
                              disabled={reponseEnvoi || texteReponse.trim().length < 15}
                              onClick={() => void envoyerReponse(c.id)}
                            >
                              {reponseEnvoi ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : (
                                <Send size={14} />
                              )}
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
