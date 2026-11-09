import { Select } from "@/components/ui";
import {
  GEO_BURKINA,
  REGIONS,
  communesOf,
  etablissementsOf,
  provincesOf,
} from "@/lib/geographie";

/**
 * Sélecteur géographique en cascade :
 * Région → Province → Commune → Établissement (+ Village/Secteur en champ texte côté page)
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
  const communes = region && province ? communesOf(region, province) : [];
  const ecoles =
    region && province && commune ? etablissementsOf(region, province, commune) : [];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <Select
          aria-label="Région"
          disabled={disabled}
          value={region}
          onChange={(e) => onChange({ region: e.target.value, province: "", commune: "", etablissement: "" })}
        >
          <option value="">— Région —</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Select
          aria-label="Province"
          disabled={disabled || !region}
          value={province}
          onChange={(e) => onChange({ province: e.target.value, commune: "", etablissement: "" })}
        >
          <option value="">— Province —</option>
          {provincesOf(region).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Select
          aria-label="Commune"
          disabled={disabled || !province}
          value={commune}
          onChange={(e) => onChange({ commune: e.target.value, etablissement: "" })}
        >
          <option value="">— Commune —</option>
          {communes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {withEtablissement && (
        <div>
          <Select
            aria-label="Établissement"
            disabled={disabled || !commune}
            value={etablissement ?? ""}
            onChange={(e) => onChange({ etablissement: e.target.value })}
          >
            <option value="">— Établissement —</option>
            {ecoles.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      )}

      {!region && (
        <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-4">
          {GEO_BURKINA.length} régions couvertes — de Dori (Sahel) à Banfora (Cascades)
        </p>
      )}
    </div>
  );
}
