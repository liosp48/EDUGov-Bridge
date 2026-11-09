// ─────────────────────────────────────────────────────────────────
// EDUGov-Bridge (Faso Édu-Data) — Schéma de données applicatif
// Miroir TypeScript = supabase/init.sql
// ─────────────────────────────────────────────────────────────────

/** Les 5 rôles utilisateurs de la plateforme */
export type UserRole =
  | "enseignant"
  | "directeur_ecole"
  | "inspecteur"
  | "representant_parents"
  | "decideur_ministere";

export const ROLE_LABELS: Record<UserRole, string> = {
  enseignant: "Enseignant",
  directeur_ecole: "Directeur d'école",
  inspecteur: "Inspecteur / Encadreur pédagogique",
  representant_parents: "Représentant APE / COGES",
  decideur_ministere: "Décideur Ministère",
};

/** Rôles couverts par l'Espace Terrain (formulaire collaboratif) */
export const TERRAIN_ROLES: UserRole[] = [
  "enseignant",
  "directeur_ecole",
  "inspecteur",
  "representant_parents",
];

/** Catégories de signalement */
export type CategorieSignalement =
  | "decrochage"
  | "infrastructure"
  | "genre_rural"
  | "pedagogie"
  | "securite";

export const CATEGORIE_LABELS: Record<CategorieSignalement, string> = {
  decrochage: "Décrochage scolaire",
  infrastructure: "Infrastructure / Matériel",
  genre_rural: "Inégalité Genre / Rural",
  pedagogie: "Pédagogie & Formation",
  securite: "Sécurité",
};

export const CATEGORIE_COLORS: Record<CategorieSignalement, string> = {
  decrochage: "#EF2B2D", // rouge Burkina
  infrastructure: "#0F4C81", // bleu institutionnel
  genre_rural: "#7C3AED",
  pedagogie: "#F59E0B",
  securite: "#009E49", // vert Burkina
};

/** Statut de traitement d'un signalement */
export type StatutSignalement =
  | "nouveau"
  | "en_analyse"
  | "verifie"
  | "transmis_bureau"
  | "clos";

export const STATUT_LABELS: Record<StatutSignalement, string> = {
  nouveau: "Nouveau",
  en_analyse: "En analyse",
  verifie: "Vérifié",
  transmis_bureau: "Transmis au bureau",
  clos: "Clos",
};

/** Profil minimal d'un acteur (pas d'auth complexe dans le MVP) */
export interface Profil {
  id: string;
  nom_complet: string;
  prenom?: string | null;
  role: UserRole;
  region: string;
  province: string;
  commune: string;
  telephone?: string;
  email?: string | null;
  matricule?: string | null;
  etablissement?: string | null;
  type_compte?: "terrain" | "gouvernement";
  created_at: string;
}

/** Agent dont le matricule MENAPLN est pré-validé par la DRH (table de référence) */
export interface MatriculeAutorise {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  email?: string | null;
  actif: boolean;
  created_at: string;
}

/** Signalement terrain = signal faible remonté par les acteurs */
export interface Signalement {
  id: string;
  profil_id?: string | null;
  emetteur: string;
  role_emetteur: UserRole;
  region: string;
  province: string;
  commune: string;
  village_secteur?: string | null;
  etablissement: string;
  categorie: CategorieSignalement;
  gravite: 1 | 2 | 3 | 4 | 5;
  description: string;
  proposition_innovation?: string | null;
  statut: StatutSignalement;
  created_at: string;
}

/** Consultation ciblée lancée par le Ministère */
export interface Consultation {
  id: string;
  titre: string;
  question: string;
  region_cible?: string | null;
  province_cible?: string | null;
  commune_cible?: string | null;
  date_publication: string;
  date_cloture?: string | null;
  statut: "ouverte" | "clos";
}

/** Réponse d'un acteur terrain à une consultation */
export interface ReponseConsultation {
  id: string;
  consultation_id: string;
  role_emetteur: UserRole;
  emetteur: string;
  region: string;
  province: string;
  commune: string;
  etablissement?: string | null;
  contenu: string;
  created_at: string;
}

/** Sortie structurée de la synthèse IA (Ministre Brief) */
export interface SyntheseIA {
  resume_executif: string;
  triangulation: string;
  top_innovations: string[];
  fondement_ia?: boolean;
}

/** Filtres géographiques partagés */
export interface FiltreGeo {
  region: string;
  province: string;
  commune: string;
}
