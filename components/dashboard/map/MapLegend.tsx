"use client";

// ─────────────────────────────────────────────────────────────────
// Légende permanente du barème IRD cartographique (0–100).
// ─────────────────────────────────────────────────────────────────

import { COULEUR_IRD, COULEUR_SANS_DONNEE, SEUILS_IRD_CARTE } from "./map-utils";

const NIVEAUX = [
  {
    couleur: COULEUR_IRD.faible,
    label: `Faible (0–${SEUILS_IRD_CARTE.modere})`,
  },
  {
    couleur: COULEUR_IRD.modere,
    label: `Modéré (${SEUILS_IRD_CARTE.modere + 1}–${SEUILS_IRD_CARTE.eleve})`,
  },
  {
    couleur: COULEUR_IRD.eleve,
    label: `Élevé (${SEUILS_IRD_CARTE.eleve + 1}–${SEUILS_IRD_CARTE.critique})`,
  },
  {
    couleur: COULEUR_IRD.critique,
    label: `Critique (${SEUILS_IRD_CARTE.critique + 1}–100)`,
  },
  {
    couleur: COULEUR_SANS_DONNEE,
    label: "Données indisponibles",
  },
];

export default function MapLegend() {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2"
      aria-label="Légende de l'indice de risque de décrochage"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        IRD — Indice de Risque de Décrochage
      </span>
      {NIVEAUX.map((n) => (
        <span key={n.label} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span
            className="inline-block h-3 w-3 rounded-sm border border-white shadow-sm"
            style={{ backgroundColor: n.couleur }}
            aria-hidden="true"
          />
          {n.label}
        </span>
      ))}
    </div>
  );
}
