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

/** Catégorie de signalement — MVP restreint au Défi 1 (Décrochage) */
export type CategorieSignalement = "decrochage";

export const CATEGORIE_LABELS: Record<CategorieSignalement, string> = {
  decrochage: "Décrochage scolaire",
};

export const CATEGORIE_COLORS: Record<CategorieSignalement, string> = {
  decrochage: "#EF2B2D", // rouge Burkina
};

// ─────────────────────────────────────────────────────────────────
// DÉFI 1 — ANTICIPATION & LUTTE CONTRE LE DÉCROCHAGE SCOLAIRE
// Indicateurs comportementaux et contextuels de risque (signaux faibles)
// ─────────────────────────────────────────────────────────────────

export type IndicateurDecrochage =
  | "absenteisme_repete"
  | "difficultes_financieres"
  | "choc_securitaire"
  | "choc_climatique"
  | "mariage_grossesse_precoce"
  | "orpaillage_transhumance"
  | "abandon_silencieux";

/** Catalogue des signaux faibles, avec poids de criticité (1 → 5) */
export const INDICATEURS_DECROCHAGE: Record<
  IndicateurDecrochage,
  { label: string; poids: 1 | 2 | 3 | 4 | 5 }
> = {
  absenteisme_repete: {
    label: "Absentéisme répété (2 semaines et plus)",
    poids: 3,
  },
  difficultes_financieres: {
    label: "Difficultés financières de la famille",
    poids: 3,
  },
  choc_securitaire: {
    label: "Choc sécuritaire local (déplacements, fermetures)",
    poids: 4,
  },
  choc_climatique: {
    label: "Choc climatique (inondations, sécheresse, récoltes perdues)",
    poids: 2,
  },
  mariage_grossesse_precoce: {
    label: "Mariage / grossesse précoce",
    poids: 4,
  },
  orpaillage_transhumance: {
    label: "Orpaillage, transhumance, travail des enfants",
    poids: 4,
  },
  abandon_silencieux: {
    label: "Abandon silencieux (élève disparu des registres)",
    poids: 5,
  },
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

/** Signalement terrain = alerte précoce de décrochage remontée par les acteurs */
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
  /** Signaux faibles observés (Défi 1) */
  indicateurs: IndicateurDecrochage[];
  /** Nombre d'élèves en danger de déscolarisation sur ce signal */
  nb_eleves_risque: number;
  gravite: 1 | 2 | 3 | 4 | 5;
  description: string;
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

/** Sortie structurée du « Ministre Brief IA » dédié au décrochage (Défi 1) */
export interface BriefDecrochage {
  /** a) Zones géographiques les plus menacées en ce moment */
  zones_menacees: string[];
  /** b) Causes principales identifiées par le terrain (avec proportions) */
  causes_principales: string[];
  /** c) Plan d'action d'urgence recommandé */
  plan_action: string;
  fondement_ia?: boolean;
}

/** Filtres géographiques partagés */
export interface FiltreGeo {
  region: string;
  province: string;
  commune: string;
}
