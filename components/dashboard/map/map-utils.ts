// ─────────────────────────────────────────────────────────────────
// Utilitaires de la carte de vigilance éducative
// · Barème IRD cartographique (0–25 / 26–50 / 51–75 / 76–100)
// · Association SVG ↔ référentiel géographique officiel 2025
// · Agrégations par zone (aucun double comptage)
// ─────────────────────────────────────────────────────────────────

import { chefLieuOf, GEO_BURKINA } from "@/lib/geographie";
import {
  calculerIRD,
  ecolesEnAlerteCritique,
  elevesEnDanger,
} from "@/lib/decrochage";
import type { Signalement } from "@/types/database";

import type { RegionCarto, RegionSvg, StatsZone } from "./map.types";
import regionsSvg from "./regions-svg.json";

// ── Barème IRD de la carte ────────────────────────────────────────

export const SEUILS_IRD_CARTE = { modere: 25, eleve: 50, critique: 75 } as const;

export type ClePaletteIRD = "faible" | "modere" | "eleve" | "critique";

/** Palette institutionnelle (vert Faso → rouge alerte) + gris « sans données » */
export const COULEUR_IRD: Record<ClePaletteIRD, string> = {
  faible: "#009E49",
  modere: "#FACC15",
  eleve: "#F97316",
  critique: "#EF2B2D",
};

/** Couleur neutre pour les zones sans données (jamais de score fictif à 0) */
export const COULEUR_SANS_DONNEE = "#CBD5E1";

export function couleurPourIRD(ird: number | null): string {
  if (ird === null) return COULEUR_SANS_DONNEE;
  if (ird <= SEUILS_IRD_CARTE.modere) return COULEUR_IRD.faible;
  if (ird <= SEUILS_IRD_CARTE.eleve) return COULEUR_IRD.modere;
  if (ird <= SEUILS_IRD_CARTE.critique) return COULEUR_IRD.eleve;
  return COULEUR_IRD.critique;
}

export function niveauRisqueIRD(ird: number): "faible" | "modéré" | "élevé" | "critique" {
  if (ird <= SEUILS_IRD_CARTE.modere) return "faible";
  if (ird <= SEUILS_IRD_CARTE.eleve) return "modéré";
  if (ird <= SEUILS_IRD_CARTE.critique) return "élevé";
  return "critique";
}

/** Libellé lisible du niveau de risque selon les données présentes */
export function libelleNiveau(stats: StatsZone | null): string {
  return stats ? niveauRisqueIRD(stats.ird) : "Données indisponibles";
}

// ── Luminance / contraste (hérité de Visit_burkina utils/color.ts) ──

export function getLuminance(hex: string): number {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const a = [r, g, b].map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

export function getContrastText(hex: string): string {
  return getLuminance(hex) > 0.5 ? "#1E293B" : "#FFFFFF";
}

// ── Association SVG ↔ référentiel officiel 2025 ──────────────────
// Le fichier SVG source (Visit_burkina) utilise les toponymes 2025 à
// une divergence près : « Koulsé » (SVG) → « Kuilsé » (référentiel).
// Le mapping est explicite et validé sur les 17 régions.

const REGION_SVG_VERS_GEO: Record<string, string> = {
  bankui: "Bankui",
  djoro: "Djôrô",
  goulmou: "Goulmou",
  guiriko: "Guiriko",
  kadiogo: "Kadiogo",
  kulsi: "Kuilsé",
  liptako: "Liptako",
  nakambe: "Nakambé",
  nando: "Nando",
  nazinon: "Nazinon",
  oubri: "Oubri",
  sirba: "Sirba",
  soum: "Soum",
  sourou: "Sourou",
  tannounyan: "Tannounyan",
  tapoa: "Tapoa",
  yaadga: "Yaadga",
};

export const REGIONS_CARTO: RegionCarto[] = (regionsSvg as RegionSvg[]).map(
  (r) => {
    const nomGeo = REGION_SVG_VERS_GEO[r.id] ?? r.name;
    const estDansReferentiel = GEO_BURKINA.some((g) => g.nom === nomGeo);
    return {
      id: r.id,
      nomGeo: estDansReferentiel ? nomGeo : r.name,
      nomSvg: r.name,
      chefLieu: estDansReferentiel ? chefLieuOf(nomGeo) : "",
      path: r.path,
      center: r.center,
    };
  }
);

/** Région référentielle correspondant à un id SVG */
export function regionGeoDeCarto(idSvg: string): string {
  return REGIONS_CARTO.find((r) => r.id === idSvg)?.nomGeo ?? idSvg;
}

/** Petites régions : libellés réduits sur la carte (hérité du projet source) */
export const PETITES_REGIONS_SVG = [
  "kadiogo",
  "oubri",
  "nazinon",
  "nando",
  "sourou",
  "soum",
  "tapoa",
  "tannounyan",
  "sirba",
];

// ── Agrégations de données ────────────────────────────────────────

/** Statistiques d'un ensemble de signalements (zone homogène) */
export function statistiquesZone(items: Signalement[]): StatsZone {
  return {
    ird: calculerIRD(items),
    alertes: items.length,
    ecolesCritiques: ecolesEnAlerteCritique(items).length,
    elevesEnDanger: elevesEnDanger(items),
  };
}

function grouperPar(items: Signalement[], cle: (s: Signalement) => string) {
  const groupes = new Map<string, Signalement[]>();
  for (const s of items) {
    const k = cle(s);
    if (!groupes.has(k)) groupes.set(k, []);
    groupes.get(k)!.push(s);
  }
  return groupes;
}

/** Stats par région (toutes les régions du référentiel figurent au retour) */
export function statsParRegion(items: Signalement[]): Map<string, StatsZone | null> {
  const groupes = grouperPar(items, (s) => s.region);
  const resultat = new Map<string, StatsZone | null>();
  for (const r of GEO_BURKINA) {
    const g = groupes.get(r.nom);
    resultat.set(r.nom, g && g.length > 0 ? statistiquesZone(g) : null);
  }
  return resultat;
}

/** Stats par province à l'intérieur d'une région */
export function statsParProvince(
  region: string,
  items: Signalement[]
): Map<string, StatsZone | null> {
  const dansRegion = items.filter((s) => s.region === region);
  const groupes = grouperPar(dansRegion, (s) => s.province);
  const resultat = new Map<string, StatsZone | null>();
  for (const p of GEO_BURKINA.find((r) => r.nom === region)?.provinces ?? []) {
    const g = groupes.get(p.nom);
    resultat.set(p.nom, g && g.length > 0 ? statistiquesZone(g) : null);
  }
  return resultat;
}

/** Stats par commune à l'intérieur d'une province */
export function statsParCommune(
  region: string,
  province: string,
  items: Signalement[]
): Map<string, StatsZone | null> {
  const dansProvince = items.filter(
    (s) => s.region === region && s.province === province
  );
  const groupes = grouperPar(dansProvince, (s) => s.commune);
  const resultat = new Map<string, StatsZone | null>();
  for (const c of
    GEO_BURKINA.find((r) => r.nom === region)?.provinces.find(
      (p) => p.nom === province
    )?.communes ?? []
  ) {
    const g = groupes.get(c);
    resultat.set(c, g && g.length > 0 ? statistiquesZone(g) : null);
  }
  return resultat;
}
