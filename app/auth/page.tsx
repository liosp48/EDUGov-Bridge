"use client";

// ═══════════════════════════════════════════════════════════════════
// EDUGov-Bridge — Authentification à deux flux distincts
//  · Espace ACTEURS DU TERRAIN : email + matricule MENAPLN pré-validé
//  · Espace GOUVERNEMENT : email officiel .gov.bf / .presidence.bf
// ═══════════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  Building2,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Lock,
  LogIn,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@/components/ui";
import GeoSelector from "@/components/geo-selector";
import {
  effacerSession,
  sauverSession,
  verifierEmailGouvernemental,
} from "@/lib/auth";
import { connexionGouvernement, connexionTerrain, inscriptionTerrain } from "@/app/auth/actions";
import { ROLE_LABELS, TERRAIN_ROLES, type UserRole } from "@/types/database";

type Espace = "terrain" | "gouvernement";
type ModeTerrain = "connexion" | "inscription";

export default function AuthPage() {
  const router = useRouter();
  const [espace, setEspace] = useState<Espace>("terrain");
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [alerteGov, setAlerteGov] = useState<string | null>(null);

  // ── Formulaire Terrain ─────────────────────────────────────────
  const [modeTerrain, setModeTerrain] = useState<ModeTerrain>("connexion");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [emailTerrain, setEmailTerrain] = useState("");
  const [matricule, setMatricule] = useState("");
  const [role, setRole] = useState<UserRole>("enseignant");
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [commune, setCommune] = useState("");
  const [etablissement, setEtablissement] = useState("");

  // ── Formulaire Gouvernement ────────────────────────────────────
  const [emailGov, setEmailGov] = useState("");

  const verifierGovEnDirect = (valeur: string): boolean => {
    const verdict = verifierEmailGouvernemental(valeur);
    if (!valeur.trim()) {
      setAlerteGov(null);
      return false;
    }
    if (verdict.motif === "personnel") {
      setAlerteGov(
        "⛔ Les emails personnels (@gmail.com, @yahoo.fr…) sont formellement interdits sur cet espace. Utilisez votre adresse gouvernementale officielle."
      );
      return false;
    }
    if (verdict.motif === "non_autorise") {
      setAlerteGov(
        "⛔ Domaine non autorisé. Seuls les domaines officiels sont acceptés : @education.gov.bf, @presidence.bf, @presidence.gov.bf, @mtdpce.gov.bf."
      );
      return false;
    }
    if (verdict.motif === "invalide") {
      setAlerteGov("Adresse email invalide.");
      return false;
    }
    setAlerteGov(null);
    return true;
  };

  const finaliser = (s: Parameters<typeof sauverSession>[0], destination: string) => {
    effacerSession();
    sauverSession(s);
    router.push(destination);
    router.refresh();
  };

  const soumettreTerrain = (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    demarrer(async () => {
      const resultat =
        modeTerrain === "connexion"
          ? await connexionTerrain({ email: emailTerrain, matricule })
          : await inscriptionTerrain({
              nom,
              prenom,
              email: emailTerrain,
              matricule,
              role,
              region,
              province,
              commune,
              etablissement,
            });
      if (resultat.ok) finaliser(resultat.session, "/terrain");
      else setErreur(resultat.error);
    });
  };

  const soumettreGouvernement = (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    if (!verifierGovEnDirect(emailGov)) {
      setAlerteGov((a) => a ?? "⛔ Accès refusé : domaine email non officiel.");
      return;
    }
    demarrer(async () => {
      const resultat = await connexionGouvernement({ email: emailGov });
      if (resultat.ok) finaliser(resultat.session, "/ministere");
      else setErreur(resultat.error);
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Connexion sécurisée</h1>
      <p className="mt-2 text-slate-600">
        Deux espaces distincts : les acteurs du terrain s'authentifient par matricule MENAPLN,
        les décideurs par email gouvernemental officiel.
      </p>

      {/* Sélecteur d'espace */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          onClick={() => {
            setEspace("terrain");
            setErreur(null);
            setAlerteGov(null);
          }}
          className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
            espace === "terrain"
              ? "border-institution bg-institution/5 ring-2 ring-institution/30"
              : "border-slate-200 bg-white hover:border-institution/40"
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-institution text-white">
            <GraduationCap size={20} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Espace Acteurs du Terrain</span>
            <span className="block text-xs text-slate-500">
              Enseignants, Directeurs, Inspecteurs, APE/COGES — matricule agent MENAPLN requis
            </span>
          </span>
        </button>

        <button
          onClick={() => {
            setEspace("gouvernement");
            setErreur(null);
            setAlerteGov(null);
          }}
          className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
            espace === "gouvernement"
              ? "border-institution bg-institution/5 ring-2 ring-institution/30"
              : "border-slate-200 bg-white hover:border-institution/40"
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-faso-green text-white">
            <Building2 size={20} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Espace Gouvernement / Décideurs</span>
            <span className="block text-xs text-slate-500">
              Email gouvernemental officiel exclusivement (.gov.bf / @presidence.bf)
            </span>
          </span>
        </button>
      </div>

      {/* Message d'erreur global */}
      {erreur && (
        <p className="mt-6 flex items-start gap-2 rounded-lg border border-faso-red/30 bg-faso-red/10 px-4 py-3 text-sm text-faso-red">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" /> {erreur}
        </p>
      )}

      {/* ══════════ FORMULAIRE TERRAIN ══════════ */}
      {espace === "terrain" && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="text-institution" size={20} /> Acteurs du Terrain
              </CardTitle>
              <Badge className="bg-institution/10 text-institution">Vérification matricule DRH</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-5 inline-flex rounded-lg border border-slate-200 p-1">
              {(
                [
                  { key: "connexion", label: "Se connecter", icone: <LogIn size={14} /> },
                  { key: "inscription", label: "S'inscrire", icone: <UserPlus size={14} /> },
                ] as { key: ModeTerrain; label: string; icone: React.ReactNode }[]
              ).map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setModeTerrain(m.key);
                    setErreur(null);
                  }}
                  className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition ${
                    modeTerrain === m.key ? "bg-institution text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {m.icone} {m.label}
                </button>
              ))}
            </div>

            <form onSubmit={soumettreTerrain} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {modeTerrain === "inscription" && (
                  <>
                    <div>
                      <Label htmlFor="nom">Nom</Label>
                      <Input
                        id="nom"
                        required
                        placeholder="Ex : OUEDRAOGO"
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="prenom">Prénom(s)</Label>
                      <Input
                        id="prenom"
                        required
                        placeholder="Ex : Aïcha Marie"
                        value={prenom}
                        onChange={(e) => setPrenom(e.target.value)}
                      />
                    </div>
                  </>
                )}
                <div>
                  <Label htmlFor="email-terrain">Adresse mail</Label>
                  <Input
                    id="email-terrain"
                    type="email"
                    required
                    placeholder="vous@menapln.bf ou adresse personnelle autorisée"
                    value={emailTerrain}
                    onChange={(e) => setEmailTerrain(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="matricule">Numéro de Matricule Agent (MENAPLN)</Label>
                  <Input
                    id="matricule"
                    required
                    placeholder="Ex : MEN-2026-0031"
                    value={matricule}
                    onChange={(e) => setMatricule(e.target.value.toUpperCase())}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Le matricule est vérifié dans la table des agents autorisés.
                  </p>
                </div>
              </div>

              {modeTerrain === "inscription" && (
                <>
                  <div className="max-w-sm">
                    <Label htmlFor="role-terrain">Rôle sur le terrain</Label>
                    <Select id="role-terrain" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                      {TERRAIN_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <Label>Rôle & Localité — Région / Province / Commune / Établissement</Label>
                    <GeoSelector
                      region={region}
                      province={province}
                      commune={commune}
                      etablissement={etablissement}
                      onChange={(patch) => {
                        if (patch.region !== undefined) {
                          setRegion(patch.region);
                          setProvince("");
                          setCommune("");
                          setEtablissement("");
                        }
                        if (patch.province !== undefined) {
                          setProvince(patch.province);
                          setCommune("");
                          setEtablissement("");
                        }
                        if (patch.commune !== undefined) {
                          setCommune(patch.commune);
                          setEtablissement("");
                        }
                        if (patch.etablissement !== undefined) setEtablissement(patch.etablissement);
                      }}
                    />
                  </div>
                </>
              )}

              <Button type="submit" size="lg" disabled={enCours} className="w-full sm:w-auto">
                {enCours ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />}
                {enCours
                  ? "Vérification du matricule en cours…"
                  : modeTerrain === "connexion"
                    ? "Accéder à mon espace terrain"
                    : "Créer mon compte terrain"}
              </Button>

              <p className="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
                <strong className="text-slate-600">Matricules de démonstration :</strong>{" "}
                MEN-2026-0031 · MEN-2026-0457 · MEN-2026-1284 · MEN-2026-2210
              </p>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ══════════ FORMULAIRE GOUVERNEMENT ══════════ */}
      {espace === "gouvernement" && (
        <Card className="mt-6 border-2 border-faso-green/25">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="text-faso-green" size={20} /> Gouvernement / Décideurs
              </CardTitle>
              <Badge className="bg-faso-green/10 text-faso-green">
                <ShieldCheck size={13} /> Domaine officiel vérifié
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={soumettreGouvernement} className="space-y-4">
              <div>
                <Label htmlFor="email-gov">Adresse mail gouvernementale</Label>
                <Input
                  id="email-gov"
                  type="email"
                  required
                  className={alerteGov ? "border-faso-red focus:border-faso-red" : ""}
                  placeholder="prenom.nom@education.gov.bf"
                  value={emailGov}
                  onChange={(e) => {
                    setEmailGov(e.target.value);
                    verifierGovEnDirect(e.target.value);
                  }}
                />
              </div>

              {alerteGov ? (
                <p className="flex items-start gap-2 rounded-lg border border-faso-red/30 bg-faso-red/10 px-4 py-3 text-sm text-faso-red">
                  <Ban size={18} className="mt-0.5 shrink-0" /> {alerteGov}
                </p>
              ) : (
                <p className="flex items-start gap-2 rounded-lg border border-faso-green/30 bg-faso-green/10 px-4 py-3 text-sm text-faso-green">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> Domaine officiel reconnu.
                </p>
              )}

              <Button type="submit" variant="green" size="lg" disabled={enCours} className="w-full sm:w-auto">
                {enCours ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />}
                {enCours ? "Vérification du domaine…" : "Accéder au Tableau de Bord Stratégique"}
              </Button>

              <p className="text-xs text-slate-500">
                Domaines officiels autorisés : <strong>@education.gov.bf</strong>,{" "}
                <strong>@presidence.bf</strong>, <strong>@presidence.gov.bf</strong>,{" "}
                <strong>@mtdpce.gov.bf</strong> — toute adresse personnelle est rejetée
                automatiquement.
              </p>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

