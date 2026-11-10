"use client";

import { useEffect, useState } from "react";
import { Select, Input } from "@/components/ui";
import {
  REGIONS,
  NB_REGIONS,
  communesOf,
  provincesOf,
  normaliserGeo,
  normaliserRegion,
} from "@/lib/geographie";

const AUTRE = "__autre__";

/**
 * Sélecteur géographique en cascade (référentiel officiel 2025 : 17 régions) :
 * Région → Province → Commune → Établissement.
 *
 * · Province et Commune non répertoriées → saisie libre (option « Autre »)
 *   pour ne jamais bloquer un utilisateur du fait d'un référentiel incomplet.
 * · L'établissement scolaire est TOUJOURS saisi librement : il n'existe
 *   aucune base exhaustive d'écoles et il ne doit pas y en avoir.
 */
export default function GeoSelector({
  region,
  province,
  commune,
  etablissement,
  onChange,
  withEtablissement = true,
  disabled = false,
}: {
  region: string;
  province: string;
  commune: string;
  etablissement?: string;
  onChange: (patch: { region?: string; province?: string; commune?: string; etablissement?: string }) => void;
  withEtablissement?: boolean;
  disabled?: boolean;
}) {
  // Normalisation automatique d'éventuelles données héritées de l'ancien
  // découpage (13 régions) pour rester cohérent avec le référentiel 2025.
  const [normalise, setNormalise] = useState(false);
  const [autreProvince, setAutreProvince] = useState(false);
  const [autreCommune, setAutreCommune] = useState(false);

  useEffect(() => {
    if (normalise) return;
    const geo = normaliserGeo(region, province);
    if (geo.region !== region || geo.province !== province) {
      onChange({
        region: geo.region,
        province: geo.province,
        ...(geo.province !== province ? { commune: "" } : {}),
      });
    }
    setNormalise(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mode « Autre » activé si la valeur pré-remplie n'existe pas dans le référentiel
  useEffect(() => {
    if (!region) return;
    if (province && !provincesOf(region).includes(province)) setAutreProvince(true);
    if (
      province &&
      commune &&
      !communesOf(region, province).includes(commune)
    )
      setAutreCommune(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalise]);

  const provinces = region ? provincesOf(region) : [];
  const communes = region && province ? communesOf(region, province) : [];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* ── 1. Région (les 17 régions officielles du Burkina Faso) ── */}
      <div>
        <Select
          aria-label="Région"
          disabled={disabled}
          value={region}
          onChange={(e) => {
            setAutreProvince(false);
            setAutreCommune(false);
            onChange({ region: e.target.value, province: "", commune: "", etablissement: "" });
          }}
        >
          <option value="">— Région ({NB_REGIONS} officielles) —</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </div>

      {/* ── 2. Province (liste auto selon région, ou saisie libre) ── */}
      <div>
        <Select
          aria-label="Province"
          disabled={disabled || !region}
          value={autreProvince ? AUTRE : province}
          onChange={(e) => {
            if (e.target.value === AUTRE) {
              setAutreProvince(true);
              onChange({ province: "", commune: "", etablissement: "" });
            } else {
              setAutreProvince(false);
              onChange({ province: e.target.value, commune: "", etablissement: "" });
            }
          }}
        >
          <option value="">— Province —</option>
          {provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
          <option value={AUTRE}>Autre / non répertoriée…</option>
        </Select>
        {autreProvince && (
          <Input
            className="mt-2"
            aria-label="Nom exact de la province"
            placeholder="Tapez le nom exact de la province…"
            maxLength={60}
            required
            value={province}
            disabled={disabled}
            onChange={(e) => onChange({ province: e.target.value })}
          />
        )}
      </div>

      {/* ── 3. Commune (liste auto selon province, ou saisie libre) ── */}
      <div>
        <Select
          aria-label="Commune"
          disabled={disabled || !province}
          value={autreCommune ? AUTRE : commune}
          onChange={(e) => {
            if (e.target.value === AUTRE) {
              setAutreCommune(true);
              onChange({ commune: "", etablissement: "" });
            } else {
              setAutreCommune(false);
              onChange({ commune: e.target.value, etablissement: "" });
            }
          }}
        >
          <option value="">— Commune —</option>
          {communes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value={AUTRE}>Autre / non répertoriée…</option>
        </Select>
        {autreCommune && (
          <Input
            className="mt-2"
            aria-label="Nom exact de la commune ou du département"
            placeholder="Tapez le nom exact de la commune…"
            maxLength={60}
            required
            value={commune}
            disabled={disabled}
            onChange={(e) => onChange({ commune: e.target.value })}
          />
        )}
      </div>

      {/* ── 4. Établissement : SAISIE LIBRE (aucun référentiel d'écoles) ── */}
      {withEtablissement && (
        <div>
          <Input
            aria-label="Établissement"
            placeholder="Nom exact de votre école…"
            maxLength={120}
            value={etablissement ?? ""}
            disabled={disabled}
            onChange={(e) => onChange({ etablissement: e.target.value })}
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Publique, privée ou non répertoriée : tapez le nom exact.
          </p>
        </div>
      )}

      {!region && (
        <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-4">
          {NB_REGIONS} régions officielles (référentiel administratif 2025) — de
          Bankui (Dédougou) à Tannounyan (Banfora).
        </p>
      )}
    </div>
  );
}
