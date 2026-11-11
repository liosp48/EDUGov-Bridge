"use client";

// ─────────────────────────────────────────────────────────────────
// Infobulle de la carte : suit le curseur sur les régions et affiche
// le détail de vigilance de la zone survolée.
// ─────────────────────────────────────────────────────────────────

import { AlertTriangle, Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { couleurPourIRD, niveauRisqueIRD } from "./map-utils";
import type { StatsZone } from "./map.types";

export interface ZoneSurvolee {
  nom: string;
  contexte: string;
  stats: StatsZone | null;
}

function LigneStat({
  icone,
  label,
  valeur,
}: {
  icone: React.ReactNode;
  label: string;
  valeur: number;
}) {
  return (
    <li className="flex items-center justify-between gap-3 text-xs">
      <span className="flex items-center gap-1.5 text-slate-600">
        {icone}
        {label}
      </span>
      <span className="font-semibold text-slate-800">{valeur}</span>
    </li>
  );
}

export default function MapTooltip({
  zone,
  x,
  y,
}: {
  zone: ZoneSurvolee;
  /** Coordonnées (px) du coin supérieur gauche, déjà ajustées par la carte */
  x: number;
  y: number;
}) {
  const couleur = couleurPourIRD(zone.stats?.ird ?? null);
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-none absolute z-30 w-64 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur",
        "transition-opacity duration-150"
      )}
      style={{ left: x, top: y }}
    >
      <p className="text-sm font-bold leading-tight text-slate-900">{zone.nom}</p>
      {zone.contexte && (
        <p className="mt-0.5 text-[11px] text-slate-500">{zone.contexte}</p>
      )}
      {zone.stats ? (
        <>
          <div
            className="mt-2 flex items-center justify-between rounded-lg px-2.5 py-1.5"
            style={{ backgroundColor: `${couleur}1A` }}
          >
            <span className="text-xs font-semibold" style={{ color: couleur }}>
              {niveauRisqueIRD(zone.stats.ird)}
            </span>
            <span className="text-sm font-bold" style={{ color: couleur }}>
              IRD {zone.stats.ird}/100
            </span>
          </div>
          <ul className="mt-2 divide-y divide-slate-100">
            <LigneStat
              icone={<Building2 size={12} />}
              label="Écoles en alerte critique"
              valeur={zone.stats.ecolesCritiques}
            />
            <LigneStat
              icone={<Users size={12} />}
              label="Élèves en danger"
              valeur={zone.stats.elevesEnDanger}
            />
            <LigneStat
              icone={<AlertTriangle size={12} />}
              label="Alertes actives"
              valeur={zone.stats.alertes}
            />
          </ul>
        </>
      ) : (
        <p className="mt-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-500">
          Données indisponibles — aucune alerte enregistrée sur cette zone.
        </p>
      )}
    </div>
  );
}
