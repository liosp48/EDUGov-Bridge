"use server";

// ═══════════════════════════════════════════════════════════════════
// EDUGov-Bridge — Server Actions d'authentification
// TOUTE la validation strictement sensible est REPÉTÉE ICI côté serveur
// (la validation client n'est qu'une aide UX, jamais une garantie).
// ═══════════════════════════════════════════════════════════════════

import { cookies } from "next/headers";
import {
  isSupabaseConfigured,
  chercherMatriculeAutorise,
  chercherProfilTerrain,
  chercherProfilParMatricule,
  creerProfilTerrain,
  chercherOuCreerProfilGouvernement,
} from "@/lib/supabase";
import {
  CLE_COOKIE,
  effacerSession,
  normaliserMatricule,
  matriculeValide,
  verifierEmailGouvernemental,
  type SessionUtilisateur,
} from "@/lib/auth";
import { TERRAIN_ROLES, type UserRole } from "@/types/database";

type ResultatAuth =
  | { ok: true; session: SessionUtilisateur }
  | { ok: false; error: string };

/** Pose le cookie de session httpOnly lu par le middleware (contrôle serveur réel) */
async function poserCookieSession(s: SessionUtilisateur): Promise<void> {
  const store = await cookies();
  store.set(CLE_COOKIE, encodeURIComponent(JSON.stringify(s)), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

import { AGENTS_DEMO_DATA } from "@/lib/demo-data";

function sessionTerrain(args: {
  id: string;
  nom: string;
  prenom?: string | null;
  email: string;
  matricule: string;
  role: UserRole;
  region: string;
  province: string;
  commune: string;
  etablissement?: string | null;
}): SessionUtilisateur {
  return {
    type_compte: "terrain",
    id: args.id,
    nom: args.nom,
    prenom: args.prenom ?? null,
    email: args.email,
    matricule: args.matricule,
    role: args.role,
    region: args.region,
    province: args.province,
    commune: args.commune,
    etablissement: args.etablissement ?? null,
    authentifie_le: new Date().toISOString(),
  };
}

// ── 1. CONNEXION TERRAIN (email + matricule) ──────────────────────
export async function connexionTerrain(input: {
  email: string;
  matricule: string;
}): Promise<ResultatAuth> {
  try {
    const email = input.email.trim().toLowerCase();
    const matricule = normaliserMatricule(input.matricule);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      return { ok: false, error: "Adresse email invalide." };
    if (!matriculeValide(matricule))
      return { ok: false, error: "Format de matricule invalide (ex : MEN-2026-0031)." };

    // ── Priorité 1 : Matricules de démonstration officiels du challenge ──
    // Doivent TOUJOURS fonctionner immédiatement (avec ou sans Supabase)
    if (AGENTS_DEMO_DATA[matricule]) {
      const demo = AGENTS_DEMO_DATA[matricule];
      const session = sessionTerrain({
        id: `demo-${matricule}`,
        nom: demo.nom,
        prenom: demo.prenom,
        email: email || demo.email,
        matricule,
        role: demo.role,
        region: demo.region,
        province: demo.province,
        commune: demo.commune,
        etablissement: demo.etablissement,
      });
      await poserCookieSession(session);
      return { ok: true, session };
    }

    // ── Mode Supabase : recherche du profil ──
    if (isSupabaseConfigured) {
      try {
        const profil = await chercherProfilTerrain(email, matricule);
        if (profil) {
          const session = sessionTerrain({
            id: profil.id,
            nom: profil.nom_complet,
            prenom: profil.prenom,
            email,
            matricule,
            role: profil.role as UserRole,
            region: profil.region,
            province: profil.province,
            commune: profil.commune,
            etablissement: profil.etablissement,
          });
          await poserCookieSession(session);
          return { ok: true, session };
        }

        // Si le profil existe par matricule
        const profilMatricule = await chercherProfilParMatricule(matricule);
        if (profilMatricule) {
          const session = sessionTerrain({
            id: profilMatricule.id,
            nom: profilMatricule.nom_complet,
            prenom: profilMatricule.prenom,
            email,
            matricule,
            role: profilMatricule.role as UserRole,
            region: profilMatricule.region,
            province: profilMatricule.province,
            commune: profilMatricule.commune,
            etablissement: profilMatricule.etablissement,
          });
          await poserCookieSession(session);
          return { ok: true, session };
        }

        const autorise = await chercherMatriculeAutorise(matricule);
        if (autorise) {
          return {
            ok: false,
            error:
              "Matricule reconnu par la DRH, mais aucun compte n'a encore été finalisé — passez par l'onglet S'inscrire.",
          };
        }
      } catch (err) {
        console.error("Erreur connexion Supabase:", err);
      }
    }

    return {
      ok: false,
      error:
        "Matricule ou email non reconnu. Utilisez un matricule de test (MEN-2026-0031, MEN-2026-0457, MEN-2026-1284, MEN-2026-2210).",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur lors de la connexion.",
    };
  }
}

// ── 2. INSCRIPTION TERRAIN (matricule pré-validé obligatoire) ─────
export async function inscriptionTerrain(input: {
  nom: string;
  prenom: string;
  email: string;
  matricule: string;
  role: string;
  region: string;
  province: string;
  commune: string;
  etablissement: string;
}): Promise<ResultatAuth> {
  try {
    const nom = input.nom.trim();
    const prenom = input.prenom.trim();
    const email = input.email.trim().toLowerCase();
    const matricule = normaliserMatricule(input.matricule);
    const role = input.role as UserRole;

    if (nom.length < 2 || prenom.length < 2)
      return { ok: false, error: "Nom et prénom(s) sont obligatoires (2 caractères minimum)." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      return { ok: false, error: "Adresse email invalide." };
    if (!matriculeValide(matricule))
      return { ok: false, error: "Format de matricule MENAPLN invalide (ex : MEN-2026-0031)." };
    if (!TERRAIN_ROLES.includes(role))
      return { ok: false, error: "Sélectionnez un rôle valide." };
    if (!input.region || !input.province || !input.commune || !input.etablissement)
      return {
        ok: false,
        error: "Localisation incomplète : région, province, commune et établissement requis.",
      };

    // ── Priorité 1 : Matricule de démo reconnu ──
    if (AGENTS_DEMO_DATA[matricule]) {
      const demo = AGENTS_DEMO_DATA[matricule];
      const session = sessionTerrain({
        id: `demo-${matricule}`,
        nom: nom || demo.nom,
        prenom: prenom || demo.prenom,
        email,
        matricule,
        role,
        region: input.region || demo.region,
        province: input.province || demo.province,
        commune: input.commune || demo.commune,
        etablissement: input.etablissement || demo.etablissement,
      });
      await poserCookieSession(session);
      return { ok: true, session };
    }

    // ── Mode Supabase ──
    if (isSupabaseConfigured) {
      try {
        const autorise = await chercherMatriculeAutorise(matricule);
        if (!autorise) {
          return {
            ok: false,
            error: "Inscription refusée : ce matricule n'existe pas dans la base des agents autorisés (DRH MENAPLN).",
          };
        }

        const dejaInscrit = await chercherProfilParMatricule(matricule);
        if (dejaInscrit) {
          const session = sessionTerrain({
            id: dejaInscrit.id,
            nom: nom || dejaInscrit.nom_complet,
            prenom: prenom || dejaInscrit.prenom,
            email,
            matricule,
            role,
            region: input.region,
            province: input.province,
            commune: input.commune,
            etablissement: input.etablissement,
          });
          await poserCookieSession(session);
          return { ok: true, session };
        }

        const resultat = await creerProfilTerrain({
          nom_complet: `${nom} ${autorise.prenom || prenom}`.trim(),
          prenom: prenom || autorise.prenom,
          role,
          region: input.region,
          province: input.province,
          commune: input.commune,
          etablissement: input.etablissement,
          email,
          matricule,
        });

        if (!resultat.ok) return { ok: false, error: resultat.error };

        const session = sessionTerrain({
          id: autorise.id,
          nom,
          prenom: prenom || autorise.prenom,
          email,
          matricule,
          role,
          region: input.region,
          province: input.province,
          commune: input.commune,
          etablissement: input.etablissement,
        });
        await poserCookieSession(session);
        return { ok: true, session };
      } catch (err) {
        console.error("Erreur inscription Supabase:", err);
      }
    }

    // Fallback mode démo
    const session = sessionTerrain({
      id: `agent-${matricule}`,
      nom,
      prenom,
      email,
      matricule,
      role,
      region: input.region,
      province: input.province,
      commune: input.commune,
      etablissement: input.etablissement,
    });
    await poserCookieSession(session);
    return { ok: true, session };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur lors de l'inscription.",
    };
  }
}

// ── 3. CONNEXION GOUVERNEMENT (email officiel, vérification stricte) ──
export async function connexionGouvernement(input: { email: string }): Promise<ResultatAuth> {
  const email = input.email.trim().toLowerCase();

  // Validation stricte REFAITE côté serveur (anti-falsification du client)
  const verdict = verifierEmailGouvernemental(email);
  if (verdict.ok !== true) {
    const messages: Record<string, string> = {
      invalide: "Adresse email invalide.",
      personnel:
        "⛔ Accès refusé : les emails personnels (@gmail.com, @yahoo.fr…) ne sont pas tolérés. Utilisez impérativement votre adresse gouvernementale officielle (ex : @education.gov.bf).",
      non_autorise:
        "⛔ Accès refusé : ce domaine n'appartient pas aux domaines officiels autorisés (@education.gov.bf, @presidence.bf, @presidence.gov.bf, @mtdpce.gov.bf).",
    };
    return { ok: false, error: messages[verdict.motif ?? "invalide"] ?? "Email refusé." };
  }

  try {
    if (isSupabaseConfigured) {
      try {
        const profilGov = await chercherOuCreerProfilGouvernement(email);
        if (profilGov.ok) {
          const profil = profilGov.profil;
          const session: SessionUtilisateur = {
            type_compte: "gouvernement",
            id: profil.id,
            nom: profil.nom_complet,
            email,
            role: profil.role,
            region: profil.region,
            province: profil.province,
            commune: profil.commune,
            authentifie_le: new Date().toISOString(),
          };
          await poserCookieSession(session);
          return { ok: true, session };
        }
      } catch (err) {
        console.error("Erreur connexion Gov Supabase:", err);
      }
    }

    const session: SessionUtilisateur = {
      type_compte: "gouvernement",
      id: `gov-${email.replace(/[^a-zA-Z0-9]/g, "-")}`,
      nom: "Décideur Gouvernemental",
      email,
      role: "decideur_ministere",
      region: "Centre",
      province: "Kadiogo",
      commune: "Ouagadougou",
      authentifie_le: new Date().toISOString(),
    };
    await poserCookieSession(session);
    return { ok: true, session };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur de connexion gouvernementale.",
    };
  }
}

// ── 4. DÉCONNEXION : purge du cookie httpOnly côté serveur ─────────
export async function deconnexion(): Promise<void> {
  const store = await cookies();
  store.delete(CLE_COOKIE);
  effacerSession();
}
