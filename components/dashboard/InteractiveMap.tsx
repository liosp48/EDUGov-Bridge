"use client";

// ─────────────────────────────────────────────────────────────────
// CARTE INTERACTIVE DE VIGILANCE ÉDUCATIVE — Burkina Faso
//
// Géométrie régionale récupérée du projet Visit_burkina (SVG 2025,
// 17 régions du référentiel officiel). Transformée en outil de
// surveillance : coloration IRD, drill-down Région → Province →
// Commune, et pilotage des filtres du tableau de bord ministériel.
//
// Aucune dépendance cartographique externe : rendu SVG natif, animé
// en CSS, compatible SSR (aucun risque d'hydratation).
// ─────────────────────────────────────────────────────────────────

import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowDown, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui";
import type { Signalement } from "@/types/database";

import MapBreadcrumb from "./map/MapBreadcrumb";
import MapLegend from "./map/MapLegend";
import MapTooltip, { type ZoneSurvolee } from "./map/MapTooltip";
import SubLevelPanel from "./map/SubLevelPanel";
import {
  couleurPourIRD,
  getContrastText,
  PETITES_REGIONS_SVG,
  REGIONS_CARTO,
  regionGeoDeCarto,
  statsParCommune,
  statsParProvince,
  statsParRegion,
} from "./map/map-utils";
import type {
  EntiteCarte,
  GranulariteCarte,
  InteractiveMapProps,
} from "./map/map.types";

/** Couleur des régions sans sélection ni données (esthétique neutre) */
const FILL_ATTEINTE = "#E2E8F0";
const FILL_SURVOL_ATTEINTE = "#CBD5E1";

export default function InteractiveMap({
  signalements,
  region,
  province,
  commune,
  onChange,
}: InteractiveMapProps) {
  const granularite: GranulariteCarte = commune
    ? "commune"
    : province
      ? "province"
      : region
        ? "region"
        : "national";

  const [survolee, setSurvolee] = useState<ZoneSurvolee | null>(null);
  const [curseur, setCurseur] = useState({ x: 0, y: 0 });
  const conteneurRef = useRef<HTMLDivElement | null>(null);

  // ── Agrégations (mémorisées : recalcul uniquement si les données changent) ──
  const statsRegions = useMemo(
    () => statsParRegion(signalements),
    [signalements]
  );
  const statsProvinces = useMemo(
    () => (region ? statsParProvince(region, signalements) : null),
    [region, signalements]
  );
  const statsCommunes = useMemo(
    () => (region && province ? statsParCommune(region, province, signalements) : null),
    [region, province, signalements]
  );
  const entitesProvinces = useMemo<EntiteCarte[]>(
    () =>
      statsProvinces
        ? [...statsProvinces.entries()].map(([nom, s]) => ({
            id: nom,
            nom,
            contexte: region,
            stats: s,
          }))
        : [],
    [statsProvinces, region]
  );
  const entitesCommunes = useMemo<EntiteCarte[]>(
    () =>
      statsCommunes
        ? [...statsCommunes.entries()].map(([nom, s]) => ({
            id: nom,
            nom,
            contexte: `${province}, ${region}`,
            stats: s,
          }))
        : [],
    [statsCommunes, province, region]
  );
  const signalementsCommune = useMemo(
    () =>
      signalements.filter(
        (s) =>
          s.region === region &&
          s.province === province &&
          s.commune === commune
      ),
    [signalements, region, province, commune]
  );

  // ── Interactions ─────────────────────────────────────────────────
  /**
   * Positionne l'infobulle : centrée sous le curseur, retournée au-dessus
   * lorsque la zone survolée se trouve près du bas de la carte.
   */
  const bougerCurseur = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = conteneurRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setCurseur({
      x: Math.min(Math.max(8, px - 132), Math.max(8, rect.width - 264)),
      y: py + 200 < rect.height ? py + 18 : Math.max(8, py - 190),
    });
  }, []);

  const survolerRegion = useCallback(
    (id: string) => {
      const rc = REGIONS_CARTO.find((r) => r.id === id);
      if (!rc) return;
      setSurvolee({
        nom: rc.nomGeo,
        contexte: rc.chefLieu ? `Chef-lieu : ${rc.chefLieu}` : "",
        stats: statsRegions.get(rc.nomGeo) ?? null,
      });
    },
    [statsRegions]
  );

  /** Clic sur une région : drill-down, bascule ou retour à la vue nationale */
  const clicRegion = useCallback(
    (id: string) => {
      const nomGeo = regionGeoDeCarto(id);
      if (region && region === nomGeo) onChange({ region: "" });
      else onChange({ region: nomGeo });
    },
    [region, onChange]
  );

  /** Navigation via le fil d'Ariane : remonte d'un niveau à la fois */
  const naviguer = useCallback(
    (niveau: "national" | "region" | "province") => {
      if (niveau === "national") onChange({ region: "" });
      else if (niveau === "region") onChange({ province: "" });
      else onChange({ commune: "" });
    },
    [onChange]
  );

  // ── Rendu SVG ────────────────────────────────────────────────────
  const attributsRegion = (id: string, survol: boolean) => {
    const nomGeo = REGIONS_CARTO.find((r) => r.id === id)?.nomGeo ?? "";
    const estSelectionnee = granularite !== "national" && region === nomGeo;
    const couleurData = couleurPourIRD(statsRegions.get(nomGeo)?.ird ?? null);
    const fill =
      granularite === "national" || estSelectionnee
        ? couleurData
        : survol
          ? FILL_SURVOL_ATTEINTE
          : FILL_ATTEINTE;
    return {
      fill,
      fillOpacity: survol || estSelectionnee ? 1 : 0.92,
      stroke: estSelectionnee ? "#FFFFFF" : survol ? "#475569" : "#94A3B8",
      strokeWidth: estSelectionnee ? 2.5 : survol ? 1.8 : 0.8,
    };
  };

  const aucuneDonnee = signalements.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {aucuneDonnee && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Données indisponibles — aucune alerte enregistrée sur le territoire.
          Toutes les zones apparaissent en gris neutre (aucun score fictif).
        </p>
      )}

      {/* Fil d'Ariane + réinitialisation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MapBreadcrumb
          region={region}
          province={province}
          commune={commune}
          granularite={granularite}
          onNaviguer={naviguer}
        />
        {granularite !== "national" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onChange({ region: "" })}
          >
            <RotateCcw size={13} /> Vue nationale
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* ── Carte SVG (géométrie Visit_burkina) ── */}
        <div
          ref={conteneurRef}
          className="relative w-full flex items-center justify-center lg:flex-1"
          onMouseLeave={() => setSurvolee(null)}
        >
          <svg
            viewBox="0 0 900 600"
            className="h-auto w-full max-w-2xl select-none"
            role="img"
            aria-label="Carte interactive du Burkina Faso — vigilance éducative par région"
            onMouseMove={bougerCurseur}
          >
            <defs>
              <filter id="carteOmbre" x="-2%" y="-2%" width="104%" height="104%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.12" />
              </filter>
            </defs>

            {REGIONS_CARTO.map((rc) => {
              const survol = survolee?.nom === rc.nomGeo;
              const estSelectionnee =
                granularite !== "national" && region === rc.nomGeo;
              const a = attributsRegion(rc.id, survol);
              const estPetite = PETITES_REGIONS_SVG.includes(rc.id);
              return (
                <g key={rc.id}>
                  <path
                    d={rc.path}
                    tabIndex={0}
                    role="button"
                    aria-label={`Région ${rc.nomGeo}`}
                    aria-pressed={estSelectionnee}
                    className="cursor-pointer outline-none transition-[fill,stroke,stroke-width] duration-300"
                    style={{ ...a, strokeLinejoin: "round" }}
                    filter={
                      estSelectionnee || survol ? "url(#carteOmbre)" : undefined
                    }
                    onClick={() => clicRegion(rc.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        clicRegion(rc.id);
                      }
                    }}
                    onMouseEnter={() => survolerRegion(rc.id)}
                    onFocus={() => survolerRegion(rc.id)}
                    onBlur={() => setSurvolee(null)}
                  />
                  <text
                    x={rc.center.x}
                    y={rc.center.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={estPetite ? 8 : 10}
                    fontWeight={estSelectionnee ? 700 : 600}
                    fill={
                      granularite !== "national" && !estSelectionnee
                        ? "#94A3B8"
                        : getContrastText(a.fill)
                    }
                    className="pointer-events-none"
                    style={{
                      textShadow: "0 1px 2px rgba(255,255,255,0.55)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {rc.nomGeo}
                  </text>
                </g>
              );
            })}
          </svg>

          {survolee && (
            <MapTooltip zone={survolee} x={curseur.x} y={curseur.y} />
          )}
        </div>

        {/* ── Panneau de sous-niveau (drill-down) ── */}
        <div className="w-full shrink-0 lg:w-80 xl:w-96">
          <SubLevelPanel
            granularite={granularite}
            region={region}
            province={province}
            commune={commune}
            entites={granularite === "region" ? entitesProvinces : entitesCommunes}
            signalementsZone={signalementsCommune}
            onSelectEntite={(nom) =>
              granularite === "region"
                ? onChange({ province: nom })
                : onChange({ commune: nom })
            }
          />
          {granularite === "national" && (
            <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-sm text-slate-600">
              <span className="flex items-center gap-2 font-semibold text-slate-700">
                <Search size={15} className="text-institution" />
                Explorer le territoire
              </span>
              <p className="text-xs leading-relaxed">
                Survolez une région pour afficher son indice de risque de
                décrochage, puis cliquez pour descendre au niveau des provinces,
                puis des communes.
              </p>
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ArrowDown size={12} /> Région → Province → Commune
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Légende permanente ── */}
      <MapLegend />
    </div>
  );
}
