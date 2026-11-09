// ─────────────────────────────────────────────────────────────────
// EDUGov-Bridge — Module d'authentification MVP
// Utilisable côté CLIENT (validation instantanée) ET côté SERVEUR
// (server actions) : c'est une fonction pure, aucune dépendance DOM.
// ─────────────────────────────────────────────────────────────────

// ── 1. Domaines gouvernementaux officiels autorisés ─────────────
export const DOMAINES_GOUVERNEMENTAUX = [
  "education.gov.bf",
  "presidence.bf",
  "presidence.gov.bf",
  "mtdpce.gov.bf",
] as const;

// Fournisseurs GRAND PUBLIC formellement interdits (alerte explicite)
export const EMAIL_PERSONNELS = [
  "gmail.com",
  "yahoo.fr",
  "yahoo.com",
  "hotmail.com",
  "hotmail.fr",
  "outlook.com",
  "outlook.fr",
  "live.com",
  "live.fr",
  "icloud.com",
  "orange.fr",
  "fasonet.bf",
  "zoho.com",
] as const;

export type MotifRejetEmail = "invalide" | "personnel" | "non_autorise";

export interface ResultatEmailGov {
  ok: boolean;
  motif?: MotifRejetEmail;
}

/**
 * Vérification STRICTE de l'email gouvernemental.
 * Règle : l'email doit se TERMINER par un domaine officiel (@education.gov.bf, …).
 * Rejet automatique et motivé des emails personnels (@gmail.com, @ yahoo.fr, …).
 */
export function verifierEmailGouvernemental(email: string): ResultatEmailGov {
  const normalise = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalise)) {
    return { ok: false, motif: "invalide" };
  }

  if (EMAIL_PERSONNELS.some((d) => normalise.endsWith(`@${d}`))) {
    return { ok: false, motif: "personnel" };
  }

  if (!DOMAINES_GOUVERNEMENTAUX.some((d) => normalise.endsWith(`@${d}`))) {
    return { ok: false, motif: "non_autorise" };
  }

  return { ok: true };
}

/** Normalise un matricule MENAPLN (trim + majuscules) */
export function normaliserMatricule(matricule: string): string {
  return matricule.trim().toUpperCase().replace(/\s+/g, "");
}

/** Format attendu : MEN-2026-XXXX (sinon matricule libre de la DGB) */
export function matriculeValide(matricule: string): boolean {
  return /^[A-Z0-9][A-Z0-9/-]{3,24}$/.test(normaliserMatricule(matricule));
}

// ── 2. Session locale (MVP — remplace Supabase Auth côté démo) ────
export type TypeCompte = "terrain" | "gouvernement";

export interface SessionUtilisateur {
  type_compte: TypeCompte;
  id: string;
  nom: string;
  prenom?: string | null;
  email: string;
  matricule?: string | null;
  role: string;
  region: string;
  province: string;
  commune: string;
  etablissement?: string | null;
  authentifie_le: string;
}

const CLE_SESSION = "edugov_session";

/** Nom du cookie httpOnly posé par les server actions (lu par le middleware) */
export const CLE_COOKIE = "edugov_session";

export function sauverSession(s: SessionUtilisateur): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLE_SESSION, JSON.stringify(s));
}

export function chargerSession(): SessionUtilisateur | null {
  if (typeof window === "undefined") return null;
  try {
    const brut = window.localStorage.getItem(CLE_SESSION);
    if (!brut) return null;
    return JSON.parse(brut) as SessionUtilisateur;
  } catch {
    return null;
  }
}

export function effacerSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CLE_SESSION);
}

/** Parse le payload brut d'un cookie de session (middleware / serveur) */
export function lireSessionCookie(brut: string | undefined): SessionUtilisateur | null {
  if (!brut) return null;
  try {
    return JSON.parse(decodeURIComponent(brut)) as SessionUtilisateur;
  } catch {
    return null;
  }
}

/** Espace de travail d'un profil selon son type de compte */
export function espaceDe(s: SessionUtilisateur | null): "/terrain" | "/ministere" | "/auth" {
  if (!s) return "/auth";
  return s.type_compte === "terrain" ? "/terrain" : "/ministere";
}
