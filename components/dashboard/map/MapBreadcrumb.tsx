"use client";

// ─────────────────────────────────────────────────────────────────
// Fil d'Ariane géographique : Nation → Région → Province → Commune.
// Permet de remonter d'un niveau ou de revenir à la vue nationale.
// ─────────────────────────────────────────────────────────────────

import { ChevronRight, Globe2 } from "lucide-react";
import type { GranulariteCarte } from "./map.types";

export default function MapBreadcrumb({
  region,
  province,
  commune,
  granularite,
  onNaviguer,
}: {
  region: string;
  province: string;
  commune: string;
  granularite: GranulariteCarte;
  onNaviguer: (niveau: "national" | "region" | "province") => void;
}) {
  return (
    <nav
      aria-label="Navigation géographique"
      className="flex flex-wrap items-center gap-1 text-sm"
    >
      <button
        onClick={() => onNaviguer("national")}
        className={`flex items-center gap-1 rounded-md px-2 py-1 font-medium transition ${
          granularite === "national"
            ? "bg-institution/10 text-institution"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <Globe2 size={14} /> Burkina Faso
      </button>
      {region && (
        <>
          <ChevronRight size={14} className="text-slate-400" />
          <button
            onClick={() => onNaviguer("region")}
            className={`rounded-md px-2 py-1 font-medium transition ${
              granularite === "region"
                ? "bg-institution/10 text-institution"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {region}
          </button>
        </>
      )}
      {province && (
        <>
          <ChevronRight size={14} className="text-slate-400" />
          <button
            onClick={() => onNaviguer("province")}
            className={`rounded-md px-2 py-1 font-medium transition ${
              granularite === "province"
                ? "bg-institution/10 text-institution"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {province}
          </button>
        </>
      )}
      {commune && (
        <>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="rounded-md bg-institution/10 px-2 py-1 font-semibold text-institution">
            {commune}
          </span>
        </>
      )}
    </nav>
  );
}
