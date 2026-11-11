"use client";

// ─────────────────────────────────────────────────────────────────
// Panneau de sous-niveau géographique (drill-down).
// Niveau 2 : provinces de la région sélectionnée.
// Niveau 3 : communes de la province sélectionnée.
// Niveau commune : fiche de détail de la zone sélectionnée.
// Aucune géométrie provinciale/communale n'existant au niveau national,
// les sous-niveaux sont présentés en tuiles d'agrégation (IRD) — sans
// jamais fabriquer de frontières approximatives.
// ─────────────────────────────────────────────────────────────────

import { ArrowLeft, Building2, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ecolesEnAlerteCritique } from "@/lib/decrochage";
import type { Signalement } from "@/types/database";
import {
  couleurPourIRD,
  getContrastText,
  niveauRisqueIRD,
  statistiquesZone,
} from "./map-utils";
import type { EntiteCarte, GranulariteCarte } from "./map.types";

export default function SubLevelPanel({
  granularite,
  region,
  province,
  commune,
  entites,
  signalementsZone,
  onSelectEntite,
}: {
  granularite: GranulariteCarte;
  region: string;
  province: string;
  commune: string;
  entites: EntiteCarte[];
  signalementsZone: Signalement[];
  onSelectEntite: (nom: string) => void;
}) {
  // ── Niveau 4 (focus) : fiche de détail de la commune ──
  if (granularite === "commune") {
    const stats = statistiquesZone(signalementsZone);
    const ecoles = ecolesEnAlerteCritique(signalementsZone);
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Commune sélectionnée
        </p>
        <p className="mt-1 text-lg font-bold text-slate-900">{commune}</p>
        <p className="text-xs text-slate-500">
          {province}, {region}
        </p>
        <div
          className="mt-3 flex items-center justify-between rounded-lg px-3 py-2"
          style={{ backgroundColor: `${couleurPourIRD(stats.ird)}1A` }}
        >
          <span
            className="text-xs font-semibold"
            style={{ color: couleurPourIRD(stats.ird) }}
          >
            Risque {niveauRisqueIRD(stats.ird)}
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: couleurPourIRD(stats.ird) }}
          >
            IRD {stats.ird}/100
          </span>
        </div>
        <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
          <li className="flex items-center gap-2">
            <Building2 size={12} className="text-faso-red" />
            <span>
              <b className="text-slate-800">{stats.ecolesCritiques}</b> école(s) en
              alerte critique
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Users size={12} className="text-faso-red" />
            <span>
              <b className="text-slate-800">{stats.elevesEnDanger}</b> élève(s) en
              situation de danger
            </span>
          </li>
          <li className="flex items-center gap-2">
            <MapPin size={12} className="text-institution" />
            <span>
              <b className="text-slate-800">{stats.alertes}</b> alerte(s) active(s)
            </span>
          </li>
        </ul>
        {ecoles.length > 0 && (
          <div className="mt-3 border-t border-slate-200 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Établissements en alerte critique
            </p>
            <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
              {ecoles.slice(0, 5).map((e) => (
                <li key={e} className="truncate">
                  • {e}
                </li>
              ))}
              {ecoles.length > 5 && (
                <li className="text-slate-500">… et {ecoles.length - 5} autre(s)</li>
              )}
            </ul>
          </div>
        )}
        {signalementsZone.length === 0 && (
          <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">
            Données indisponibles — aucune alerte enregistrée sur cette commune.
          </p>
        )}
      </div>
    );
  }

  // ── Aucune sélection : invitation au drill-down ──
  if (entites.length === 0) return null;

  const titre =
    granularite === "region"
      ? `Provinces de ${region}`
      : `Communes de ${province}`;

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {titre} · {entites.length} zone(s)
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {entites.map((e) => {
          const couleur = couleurPourIRD(e.stats?.ird ?? null);
          const selectionnee =
            granularite === "region" ? false : e.nom === commune;
          return (
            <button
              key={e.id}
              onClick={() => onSelectEntite(e.nom)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-all duration-200",
                "hover:-translate-y-0.5 hover:shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-institution",
                selectionnee ? "ring-2 ring-institution" : ""
              )}
              style={{
                backgroundColor: `${couleur}1A`,
                borderColor: e.stats ? `${couleur}55` : "#E2E8F0",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {e.nom}
                </p>
                {e.stats && (
                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={{
                      backgroundColor: couleur,
                      color: getContrastText(couleur),
                    }}
                  >
                    {e.stats.ird}
                  </span>
                )}
              </div>
              {e.stats ? (
                <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
                  {e.stats.alertes} alerte(s) · {e.stats.elevesEnDanger} élève(s) ·{" "}
                  {e.stats.ecolesCritiques} école(s) critique(s)
                </p>
              ) : (
                <p className="mt-0.5 text-[11px] italic text-slate-400">
                  Données indisponibles
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
