"use client";

// ═══════════════════════════════════════════════════════════════════
// EDUGov-Bridge — Portail Privé Ministériel & Décideurs Nationaux
// URL SECRÈTE STRICTEMENT CONFIDENTIELLE : /cabinet-confidentiel-bf
// Ce portail n'est relié à aucun lien public (ni accueil, ni footer,
// ni espace terrain). Accès exclusif par URL privée transmise
// au Cabinet Ministériel et aux décideurs stratégiques de l'État.
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  Building2,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import {
  chargerSession,
  effacerSession,
  sauverSession,
  verifierEmailGouvernemental,
  type SessionUtilisateur,
} from "@/lib/auth";
import { connexionGouvernement } from "@/app/auth/actions";

export default function CabinetConfidentielPage() {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [alerteGov, setAlerteGov] = useState<string | null>(null);
  const [emailGov, setEmailGov] = useState("");

  // Redirection immédiate si déjà connecté
  useEffect(() => {
    const session = chargerSession();
    if (session?.type_compte === "gouvernement") {
      router.replace("/ministere");
    } else if (session?.type_compte === "terrain") {
      router.replace("/terrain");
    }
  }, [router]);

  const verifierGovEnDirect = (valeur: string): boolean => {
    const verdict = verifierEmailGouvernemental(valeur);
    if (!valeur.trim()) {
      setAlerteGov(null);
      return false;
    }
    if (verdict.motif === "personnel") {
      setAlerteGov(
        "⛔ Rejet formel : les adresses personnelles (@gmail.com, @yahoo.fr, @hotmail…) sont interdites. Utilisez obligatoirement votre adresse d'État officielle."
      );
      return false;
    }
    if (verdict.motif === "non_autorise") {
      setAlerteGov(
        "⛔ Domaine non habilité. Seuls les domaines régaliens sont autorisés (@education.gov.bf, @presidence.bf, @presidence.gov.bf, @mtdpce.gov.bf)."
      );
      return false;
    }
    if (verdict.motif === "invalide") {
      setAlerteGov("Format d'adresse email invalide.");
      return false;
    }
    setAlerteGov(null);
    return true;
  };

  const finaliser = (s: SessionUtilisateur, destination: string) => {
    effacerSession();
    sauverSession(s);
    // Remplacement de l'historique pour empêcher le retour en arrière
    router.replace(destination);
    router.refresh();
  };

  const soumettreGouvernement = (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    if (!verifierGovEnDirect(emailGov)) {
      setAlerteGov((a) => a ?? "⛔ Accès refusé : domaine email non conforme aux protocoles d'État.");
      return;
    }

    demarrer(async () => {
      const resultat = await connexionGouvernement({ email: emailGov });
      if (resultat.ok) {
        finaliser(resultat.session, "/ministere");
      } else {
        setErreur(resultat.error);
      }
    });
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      {/* En-tête institutionnel régalien */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-faso-gold shadow-lg ring-4 ring-slate-800">
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

      {/* Avertissement de sécurité stricte */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-700" />
        <div>
          <strong className="block font-semibold">Accès strictement confidentiel et restreint</strong>
          Cette URL privée est réservée aux autorités de tutelle. Les connexions font l'objet d'un audit de conformité.
          Les acteurs de terrain (enseignants, directeurs) doivent obligatoirement utiliser leur portail dédié.
        </div>
      </div>

      {/* Message d'erreur de soumission */}
      {erreur && (
        <p className="mt-6 flex items-start gap-2 rounded-xl border border-faso-red/30 bg-faso-red/10 px-4 py-3 text-sm text-faso-red">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" /> {erreur}
        </p>
      )}

      {/* Formulaire de connexion gouvernementale */}
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
              {enCours ? "Vérification cryptographique en cours…" : "Accéder au Tableau de Bord Stratégique"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

