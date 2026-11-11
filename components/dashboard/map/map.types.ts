// ─────────────────────────────────────────────────────────────────
// Types de la carte interactive de vigilance éducative
// Géométrie régionale héritée du projet Visit_burkina (SVG 2025).
// ─────────────────────────────────────────────────────────────────

import type { Signalement } from "@/types/database";

/** Niveau de navigation géographique de la carte */
export type GranulariteCarte = "national" | "region" | "province" | "commune";

/**
 * Statistiques de vigilance agrégées pour une zone géographique.
 * Agrégées depuis les signalements via lib/decrochage (aucun double comptage :
 * chaque signalement est compté dans sa seule zone de rattachement).
 */
export interface StatsZone {
  /** Indice de Risque de Décrochage (0–100) — null si la zone n'a aucune alerte */
  ird: number;
  /** Nombre total d'alertes actives remontées */
  alertes: number;
  /** Établissements en alerte critique (≥ 1 alerte de gravité ≥ 4) */
  ecolesCritiques: number;
  /** Élèves signalés en situation de danger */
  elevesEnDanger: number;
}

/** Entité affichable sur la carte ou dans un panneau de sous-niveau */
export interface EntiteCarte {
  /** Identifiant unique (nom référentiel ou id SVG pour les régions) */
  id: string;
  /** Nom officiel affiché */
  nom: string;
  /** Contexte d'affichage (ex : région parente d'une commune) */
  contexte: string;
  /** null = aucune donnée sur la zone (rendu gris « Données indisponibles ») */
  stats: StatsZone | null;
}

/** Donnée géométrique d'une région du fichier SVG source */
export interface RegionSvg {
  id: string;
  name: string;
  path: string;
  center: { x: number; y: number };
}

/** Région enrichie : géométrie SVG + référentiel officiel 2025 */
export interface RegionCarto {
  id: string;
  /** Nom officiel du référentiel (ex : « Kuilsé ») */
  nomGeo: string;
  /** Nom du fichier SVG source (ex : « Koulsé ») — fallback d'affichage */
  nomSvg: string;
  chefLieu: string;
  path: string;
  center: { x: number; y: number };
}

/** Niveau de risque selon le barème cartographique IRD (0–100) */
export type NiveauRisqueCarte = "faible" | "modéré" | "élevé" | "critique";

/** Patch de sélection émis par la carte vers le tableau de bord */
export interface PatchSelection {
  region?: string;
  province?: string;
  commune?: string;
}

/** Props de la carte interactive — branchée sur les états existants du dashboard */
export interface InteractiveMapProps {
  /** Signalements complets (Supabase ou démo) — la carte filtre en interne */
  signalements: Signalement[];
  region: string;
  province: string;
  commune: string;
  onChange: (patch: PatchSelection) => void;
}
