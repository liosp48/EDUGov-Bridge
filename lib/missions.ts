// ─────────────────────────────────────────────────────────────────
// EDUGov-Bridge — Gestion des Ordres de Mission
// CRUD missions (Cabinet) + signalements liés (Terrain)
// Anti-doublon garanti côté serveur : un acteur ne peut transmettre
// qu'un seul signalement par mission.
// ─────────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Mission,
  MissionStatut,
  SignalementMission,
  UserRole,
} from "@/types/database";
import { DEMO_MISSIONS, DEMO_SIGNALEMENTS_MISSION } from "./demo-data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured =
  Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl?.startsWith("http"));

let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      supabaseUrl ?? "http://localhost:54321",
      supabaseAnonKey ?? "demo-anon-key",
      { auth: { persistSession: false } }
    );
  }
  return _client;
}

/** Timeout strict pour toutes les requêtes */
async function withTimeout<T>(p: PromiseLike<T> | Promise<T>, fallback: T, ms = 1500): Promise<T> {
  let t: NodeJS.Timeout | null = null;
  const timer = new Promise<T>((res) => {
    t = setTimeout(() => res(fallback), ms);
  });
  try {
    const result = await Promise.race([Promise.resolve(p), timer]);
    if (t) clearTimeout(t);
    return result;
  } catch {
    if (t) clearTimeout(t);
    return fallback;
  }
}

// ── Cache mémoire (TTL 30s) ──
let cacheMissions: { data: Mission[]; exp: number } | null = null;
let cacheSignalementsM: { data: SignalementMission[]; exp: number } | null = null;
const TTL = 30_000;

// ─────────────────────────────────────────────────────────────────
// LECTURE
// ─────────────────────────────────────────────────────────────────

/** Toutes les missions (Cabinet) */
export async function fetchMissions(): Promise<Mission[]> {
  const now = Date.now();
  if (cacheMissions && now < cacheMissions.exp) return cacheMissions.data;
  if (!isConfigured) {
    cacheMissions = { data: DEMO_MISSIONS, exp: now + TTL };
    return DEMO_MISSIONS;
  }

  const query = (async () => {
    try {
      const { data, error } = await getClient()
        .from("missions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error || !data || data.length === 0) return DEMO_MISSIONS;
      return data as Mission[];
    } catch {
      return DEMO_MISSIONS;
    }
  })();

  const missions = await withTimeout(query, DEMO_MISSIONS, 1500);
  cacheMissions = { data: missions, exp: now + TTL };
  return missions;
}

/** Missions publiées et pertinentes pour un acteur terrain donné */
export async function fetchMissionsPourTerrain(
  role: UserRole,
  region: string,
  province: string,
  commune: string
): Promise<Mission[]> {
  const toutes = await fetchMissions();
  return toutes.filter((m) => {
    if (!["publiee", "en_cours", "terminee"].includes(m.statut)) return false;
    if (m.roles_cibles.length > 0 && !m.roles_cibles.includes(role)) return false;
    if (!m.region_cible) return true; // nationale
    if (m.region_cible !== region) return false;
    if (m.province_cible && m.province_cible !== province) return false;
    if (m.commune_cible && m.commune_cible !== commune) return false;
    return true;
  });
}

/** Tous les signalements liés aux missions */
export async function fetchSignalementsMission(): Promise<SignalementMission[]> {
  const now = Date.now();
  if (cacheSignalementsM && now < cacheSignalementsM.exp) return cacheSignalementsM.data;
  if (!isConfigured) {
    cacheSignalementsM = { data: DEMO_SIGNALEMENTS_MISSION, exp: now + TTL };
    return DEMO_SIGNALEMENTS_MISSION;
  }

  const query = (async () => {
    try {
      const { data, error } = await getClient()
        .from("signalements_mission")
        .select("*")
        .order("created_at", { ascending: false });
      if (error || !data || data.length === 0) return DEMO_SIGNALEMENTS_MISSION;
      return data as SignalementMission[];
    } catch {
      return DEMO_SIGNALEMENTS_MISSION;
    }
  })();

  const signalements = await withTimeout(query, DEMO_SIGNALEMENTS_MISSION, 1500);
  cacheSignalementsM = { data: signalements, exp: now + TTL };
  return signalements;
}

/** Signalements d'une mission spécifique */
export async function fetchSignalementsParMission(missionId: string): Promise<SignalementMission[]> {
  const tous = await fetchSignalementsMission();
  return tous.filter((s) => s.mission_id === missionId);
}

/** Vérifie si un acteur a déjà transmis un signalement pour une mission donnée */
export async function aDejaTransmis(missionId: string, profilId: string): Promise<boolean> {
  if (!isConfigured) {
    return DEMO_SIGNALEMENTS_MISSION.some(
      (s) => s.mission_id === missionId && s.profil_id === profilId
    );
  }
  const query = (async () => {
    try {
      const { data, error } = await getClient()
        .from("signalements_mission")
        .select("id")
        .eq("mission_id", missionId)
        .eq("profil_id", profilId)
        .maybeSingle();
      return !error && Boolean(data);
    } catch {
      return false;
    }
  })();

  return withTimeout(query, false, 1200);
}

// ─────────────────────────────────────────────────────────────────
// ÉCRITURE — Cabinet (admin)
// ─────────────────────────────────────────────────────────────────

/** Crée un nouvel ordre de mission (brouillon) */
export async function creerMission(
  m: Omit<Mission, "id" | "created_at" | "statut" | "publiee_le">
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  cacheMissions = null;
  if (!isConfigured) {
    const id = `demo-mission-${Date.now()}`;
    DEMO_MISSIONS.unshift({
      ...m,
      id,
      statut: "brouillon",
      created_at: new Date().toISOString(),
      publiee_le: null,
    });
    return { ok: true, id };
  }
  try {
    const query = (async () => {
      const res = await getClient()
        .from("missions")
        .insert({ ...m, statut: "brouillon" })
        .select("id")
        .single();
      return res;
    })();

    const { data, error } = await withTimeout(query, { data: null, error: null } as any, 2000);
    if (error || !data) return { ok: false, error: (error as any)?.message ?? "Erreur de création" };
    return { ok: true, id: (data as { id: string }).id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

/** Publie une mission (brouillon → publiee) */
export async function publierMission(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  cacheMissions = null;
  if (!isConfigured) {
    const m = DEMO_MISSIONS.find((x) => x.id === id);
    if (m) {
      m.statut = "publiee";
      m.publiee_le = new Date().toISOString();
    }
    return { ok: true };
  }
  try {
    const query = (async () => {
      return getClient()
        .from("missions")
        .update({ statut: "publiee", publiee_le: new Date().toISOString() })
        .eq("id", id);
    })();
    const { error } = await withTimeout(query, { error: null } as any, 1500);
    if (error) return { ok: false, error: (error as any)?.message ?? "Erreur" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

/** Change le statut d'une mission (suspendre, clôturer, archiver) */
export async function changerStatutMission(
  id: string,
  statut: MissionStatut
): Promise<{ ok: true } | { ok: false; error: string }> {
  cacheMissions = null;
  if (!isConfigured) {
    const m = DEMO_MISSIONS.find((x) => x.id === id);
    if (m) m.statut = statut;
    return { ok: true };
  }
  try {
    const query = (async () => {
      return getClient().from("missions").update({ statut }).eq("id", id);
    })();
    const { error } = await withTimeout(query, { error: null } as any, 1500);
    if (error) return { ok: false, error: (error as any)?.message ?? "Erreur" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

// ─────────────────────────────────────────────────────────────────
// ÉCRITURE — Terrain (acteur)
// PROTECTION ANTI-DOUBLON : vérification avant insertion
// ─────────────────────────────────────────────────────────────────

/** Transmet un signalement lié à une mission.
 *  Retourne une erreur explicite si un signalement existe déjà. */
export async function soumettreSignalementMission(
  s: Omit<SignalementMission, "id" | "created_at" | "statut">
): Promise<{ ok: true; mode: "supabase" | "demo" } | { ok: false; error: string }> {
  const dejaFait = await aDejaTransmis(s.mission_id, s.profil_id);
  if (dejaFait) {
    return {
      ok: false,
      error: "Vous avez déjà transmis un signalement pour cette mission. Chaque mission ne permet qu'un seul signalement par acteur.",
    };
  }

  cacheSignalementsM = null;
  cacheMissions = null;

  if (!isConfigured) {
    DEMO_SIGNALEMENTS_MISSION.unshift({
      ...s,
      id: `demo-sm-${Date.now()}`,
      statut: "transmis",
      created_at: new Date().toISOString(),
    });
    return { ok: true, mode: "demo" };
  }

  try {
    const query = (async () => {
      return getClient()
        .from("signalements_mission")
        .insert({ ...s, statut: "transmis" });
    })();

    const { error } = await withTimeout(query, { error: null } as any, 2000);
    if (error) {
      if ((error as any).code === "23505") {
        return {
          ok: false,
          error: "Vous avez déjà transmis un signalement pour cette mission.",
        };
      }
      return { ok: false, error: (error as any)?.message ?? "Erreur" };
    }

    // Mise à jour éventuelle du statut mission : publiee → en_cours
    try {
      await getClient()
        .from("missions")
        .update({ statut: "en_cours" })
        .eq("id", s.mission_id)
        .eq("statut", "publiee");
    } catch {
      // Non bloquant
    }

    return { ok: true, mode: "supabase" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur de connexion" };
  }
}

/** Invalide tous les caches */
export function invaliderCaches(): void {
  cacheMissions = null;
  cacheSignalementsM = null;
}
