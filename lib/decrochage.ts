// ─────────────────────────────────────────────────────────────────
// DÉFI 1 — Moteur « Décrochage Scolaire »
// Calcul de l'Indicateur Global de Risque (IRD), détection des écoles
// en alerte critique et agrégation des causes profondes.
// Fonctions pures, utilisables client + serveur.
// ─────────────────────────────────────────────────────────────────

import {
  INDICATEURS_DECROCHAGE,
  type IndicateurDecrochage,
  type Signalement,
} from "@/types/database";

/** Seuils d'interprétation de l'IRD (/100) */
export const IRD_SEUILS = { moyen: 45, eleve: 65 } as const;

export type NiveauRisque = "maîtrisé" | "moyen" | "élevé" | "critique";

export function niveauDeRisque(ird: number): NiveauRisque {
  if (ird <= 0) return "maîtrisé";
  if (ird >= IRD_SEUILS.eleve + 20) return "critique";
  if (ird >= IRD_SEUILS.eleve) return "élevé";
  if (ird >= IRD_SEUILS.moyen) return "moyen";
  return "maîtrisé";
}

/**
 * IRD = Indicateur Global de Risque de Décrochage (0 – 100).
 *  · 60 pts  — gravité moyenne des alertes (sur 5, normalisée)
 *  · 25 pts  — présence d'indicateurs lourds (poids ≥ 4 : sécurité,
 *              mariage précoce, orpaillage, abandon silencieux)
 *  · 15 pts  — volume d'alertes (saturation à 10 signaux)
 */
export function calculerIRD(signalements: Signalement[]): number {
  if (signalements.length === 0) return 0;

  const gravMoy =
    signalements.reduce((acc, s) => acc + s.gravite, 0) / signalements.length;
  const compGravite = (gravMoy / 5) * 60;

  const avecIndicateursLourds = signalements.filter((s) =>
    s.indicateurs.some((i) => INDICATEURS_DECROCHAGE[i]?.poids >= 4)
  ).length;
  const compIndicateurs =
    (avecIndicateursLourds / signalements.length) * 25;

  const compVolume = Math.min(1, signalements.length / 10) * 15;

  return Math.round(compGravite + compIndicateurs + compVolume);
}

/** Établissements en alerte critique : au moins une alerte de gravité ≥ 4 */
export function ecolesEnAlerteCritique(signalements: Signalement[]): string[] {
  return [
    ...new Set(
      signalements.filter((s) => s.gravite >= 4).map((s) => s.etablissement)
    ),
  ];
}

/** Total des élèves signalés en danger de déscolarisation */
export function elevesEnDanger(signalements: Signalement[]): number {
  return signalements.reduce((acc, s) => acc + (s.nb_eleves_risque ?? 0), 0);
}

/** Répartition des causes profondes (indicateurs) triée par fréquence */
export function causesPrincipales(signalements: Signalement[]): {
  indicateur: IndicateurDecrochage;
  label: string;
  n: number;
  part: number; // 0 → 1
}[] {
  const n = signalements.length;
  if (n === 0) return [];
  const compte = new Map<IndicateurDecrochage, number>();
  for (const s of signalements)
    for (const i of s.indicateurs)
      compte.set(i, (compte.get(i) ?? 0) + 1);
  return [...compte.entries()]
    .map(([indicateur, c]) => ({
      indicateur,
      label: INDICATEURS_DECROCHAGE[indicateur].label,
      n: c,
      part: c / n,
    }))
    .sort((a, b) => b.n - a.n);
}

/** Zones les plus touchées, à la granularité demandée (région / province / commune) */
export function zonesTouchees(
  signalements: Signalement[],
  granularite: "region" | "province" | "commune"
): { nom: string; alertes: number; eleves: number; ird: number }[] {
  const cle = (s: Signalement) =>
    granularite === "region"
      ? s.region
      : granularite === "province"
        ? `${s.province} (${s.region})`
        : `${s.commune} (${s.province})`;
  const groupes = new Map<string, Signalement[]>();
  for (const s of signalements) {
    const k = cle(s);
    if (!groupes.has(k)) groupes.set(k, []);
    groupes.get(k)!.push(s);
  }
  return [...groupes.entries()]
    .map(([nom, items]) => ({
      nom,
      alertes: items.length,
      eleves: elevesEnDanger(items),
      ird: calculerIRD(items),
    }))
    .sort((a, b) => b.ird - a.ird || b.alertes - a.alertes);
}
