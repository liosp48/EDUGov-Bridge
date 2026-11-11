"use client";

// ═══════════════════════════════════════════════════════════════════
// EDUGov-Bridge — Authentification Espace Acteurs du Terrain
// Réservé exclusivement aux acteurs éducatifs de terrain :
// Enseignants, Directeurs d'école, Inspecteurs, APE/COGES.
// Authentification par matricule MENAPLN officiel.
// (L'accès ministériel / gouvernemental est strictement déporté sur
// une URL privée protégée et n'apparaît nulle part ici).
// ═══════════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  GraduationCap,
  Loader2,
  Lock,
  LogIn,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@/components/ui";
import GeoSelector from "@/components/geo-selector";
import {
  effacerSession,
  sauverSession,
  type SessionUtilisateur,
} from "@/lib/auth";
import { AGENTS_DEMO_DATA } from "@/lib/demo-data";
import { connexionTerrain, inscriptionTerrain } from "@/app/auth/actions";
import { ROLE_LABELS, TERRAIN_ROLES, type UserRole } from "@/types/database";

type ModeTerrain = "connexion" | "inscription";

export default function AuthTerrainPage() {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

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

  const finaliser = (s: SessionUtilisateur, destination: string) => {
    effacerSession();
    sauverSession(s);
    router.replace(destination);
    router.refresh();
  };

  /** Pré-remplit le formulaire avec un profil de test en un clic */
  const selectionnerAgentDemo = (mat: string) => {
    const demo = AGENTS_DEMO_DATA[mat];
    if (!demo) return;
    setMatricule(mat);
    setEmailTerrain(demo.email);
    setNom(demo.nom);
    setPrenom(demo.prenom);
    setRole(demo.role);
    setRegion(demo.region);
    setProvince(demo.province);
    setCommune(demo.commune);
    setEtablissement(demo.etablissement);
    setErreur(null);
  };

  const soumettreTerrain = (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    demarrer(async () => {
        try {
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

          if (resultat.ok) {
            finaliser(resultat.session, "/terrain");
          } else {
            setErreur(resultat.error);
          }
        } catch (err) {
          setErreur(err instanceof Error ? err.message : "Erreur lors de la communication serveur.");
        }
      });
  };

  return (
    <div className="mx-auto max-w-2xl px-3 py-6 sm:px-6 sm:py-10">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <span className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-institution text-white shadow-sm shrink-0">
          <GraduationCap size={22} className="sm:size-[26px]" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-3xl">Espace Acteurs du Terrain</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Portail réservé aux Enseignants, Directeurs d'école, Inspecteurs et Comités APE/COGES.
          </p>
        </div>
      </div>

      {/* Message d'erreur global */}
      {erreur && (
        <p className="mt-4 sm:mt-6 flex items-start gap-2 rounded-lg border border-faso-red/30 bg-faso-red/10 px-3.5 py-2.5 text-xs sm:text-sm text-faso-red">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {erreur}
        </p>
      )}

      {/* ══════════ FORMULAIRE TERRAIN ══════════ */}
      <Card className="mt-4 sm:mt-6 border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base sm:text-lg">Authentification par Matricule MENAPLN</CardTitle>
            <Badge className="bg-institution/10 text-institution text-[10px] sm:text-xs">Base DRH Officielle</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 sm:mb-5 grid grid-cols-2 sm:inline-flex w-full sm:w-auto rounded-lg border border-slate-200 p-1">
            {(
              [
                { key: "connexion", label: "Se connecter", icone: <LogIn size={14} /> },
                { key: "inscription", label: "S'inscrire", icone: <UserPlus size={14} /> },
              ] as { key: ModeTerrain; label: string; icone: React.ReactNode }[]
            ).map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => {
                  setModeTerrain(m.key);
                  setErreur(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-md px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium transition ${modeTerrain === m.key ? "bg-institution text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                {m.icone} {m.label}
              </button>
            ))}
          </div>

          <form onSubmit={soumettreTerrain} className="space-y-3.5 sm:space-y-4">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {modeTerrain === "inscription" && (
                <>
                  <div>
                    <Label htmlFor="nom">Nom</Label>
                    <Input
                      id="nom"
                      required={modeTerrain === "inscription"}
                      placeholder="Ex : OUEDRAOGO"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="prenom">Prénom(s)</Label>
                    <Input
                      id="prenom"
                      required={modeTerrain === "inscription"}
                      placeholder="Ex : Aïcha Marie"
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                    />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="email-terrain">Adresse email</Label>
                <Input
                  id="email-terrain"
                  type="email"
                  required
                  placeholder="vous@menapln.bf ou adresse professionnelle"
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
                <p className="mt-1 text-[11px] text-slate-500">
                  Le matricule est vérifié dans la base des agents autorisés de la DRH.
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
                      if (patch.region !== undefined) setRegion(patch.region);
                      if (patch.province !== undefined) setProvince(patch.province);
                      if (patch.commune !== undefined) setCommune(patch.commune);
                      if (patch.etablissement !== undefined) setEtablissement(patch.etablissement);
                    }}
                  />
                </div>
              </>
            )}

            <Button type="submit" size="md" disabled={enCours} className="w-full sm:w-auto">
              {enCours ? <Loader2 className="animate-spin" size={16} /> : <Lock size={16} />}
              {enCours
                ? "Vérification du matricule en cours…"
                : modeTerrain === "connexion"
                  ? "Accéder à mon espace terrain"
                  : "Créer mon compte terrain"}
            </Button>

            {/* Profils de démonstration en un clic (idéal pitch jury) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <p className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600">
                <Sparkles size={13} className="text-institution" /> Profils de test rapides (cliquez pour remplir)
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                {Object.entries(AGENTS_DEMO_DATA).map(([mat, data]) => (
                  <button
                    key={mat}
                    type="button"
                    onClick={() => selectionnerAgentDemo(mat)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition hover:border-institution hover:bg-institution/5 hover:text-institution"
                  >
                    <span className="font-mono font-semibold">{mat}</span>
                    <span className="text-slate-400">·</span>
                    <span>{data.prenom} ({ROLE_LABELS[data.role]})</span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
