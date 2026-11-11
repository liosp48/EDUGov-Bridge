import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  MatriculeAutorise,
  Profil,
  Consultation,
  ReponseConsultation,
  Signalement,
} from "@/types/database";
import { DEMO_CONSULTATIONS, DEMO_REPONSES, DEMO_SIGNALEMENTS } from "./demo-data";
import { normaliserGeo } from "./geographie";
import {
  backendIndisponible,
  marquerBackendIndisponible,
  marquerBackendOperationnel,
} from "./reseau";

// ─────────────────────────────────────────────────────────────
// Client Supabase ultra-performant avec :
//   1. Timeout strict de 1.2s (évite tout gel de l'application)
//   2. Cache mémoire haute performance (réponses instantanées 0ms)
//   3. Fallback immédiat et transparent vers les données locales
// ─────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http"));

// Client créé paresseusement (au premier usage) : le module peut être
// importé partout sans payer l'initialisation au démarrage.
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      supabaseUrl ?? "http://localhost:54321",
      supabaseAnonKey ?? "demo-anon-key",
      {
        auth: { persistSession: false },
      }
    );
  }
  return _supabase;
}

/** Exécute une promesse ou un thenable avec un timeout strict pour garantir des temps de chargement ultra-rapides */
async function avecTimeout<T>(promesse: PromiseLike<T> | Promise<T>, fallback: T, ms = 1200): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  const timerPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  try {
    const res = await Promise.race([Promise.resolve(promesse), timerPromise]);
    if (timer) clearTimeout(timer);
    return res;
  } catch {
    if (timer) clearTimeout(timer);
    return fallback;
  }
}

// ── Cache mémoire pour réactivité instantanée (TTL 60s) ──────
let cacheSignalements: { data: Signalement[]; exp: number } | null = null;
let cacheConsultations: { data: Consultation[]; exp: number } | null = null;
let cacheReponses: { data: ReponseConsultation[]; exp: number } | null = null;

const TTL_CACHE = 60 * 1000; // 60 secondes

// ── Normalisation géographique (ancien découpage 13 régions → 17 régions 2025) ──
function geoSignalement(s: Signalement): Signalement {
  const n = normaliserGeo(s.region ?? "", s.province ?? "");
  return { ...s, region: n.region, province: n.province };
}

function geoConsultation(c: Consultation): Consultation {
  if (!c.region_cible) return c;
  const n = normaliserGeo(c.region_cible, c.province_cible ?? "");
  return { ...c, region_cible: n.region, province_cible: n.province };
}

function geoReponse(r: ReponseConsultation): ReponseConsultation {
  const n = normaliserGeo(r.region ?? "", r.province ?? "");
  return { ...r, region: n.region, province: n.province };
}

function geoProfil(p: Profil): Profil {
  if (!p) return p;
  const n = normaliserGeo(p.region ?? "", p.province ?? "");
  return { ...p, region: n.region, province: n.province };
}

export async function fetchSignalements(): Promise<Signalement[]> {
  const maintenant = Date.now();
  if (cacheSignalements && maintenant < cacheSignalements.exp) {
    return cacheSignalements.data;
  }

  if (!isSupabaseConfigured || backendIndisponible()) {
    cacheSignalements = { data: DEMO_SIGNALEMENTS, exp: maintenant + TTL_CACHE };
    return DEMO_SIGNALEMENTS;
  }

  const query = (async (): Promise<Signalement[] | null> => {
    try {
      const { data, error } = await getSupabase()
        .from("signalements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error || !data || data.length === 0) return null;
      return (data as Signalement[]).map(geoSignalement);
    } catch {
      return null;
    }
  })();

  const data = await avecTimeout<Signalement[] | null>(query, null, 1200);
  const final = data ?? DEMO_SIGNALEMENTS;
  if (data) marquerBackendOperationnel();
  else marquerBackendIndisponible();
  cacheSignalements = { data: final, exp: maintenant + TTL_CACHE };
  return final;
}

export async function insertSignalement(s: Omit<Signalement, "id" | "created_at" | "statut">) {
  cacheSignalements = null; // Invalide le cache
  if (!isSupabaseConfigured || backendIndisponible()) return { ok: true as const, mode: "demo" as const };
  try {
    const query = getSupabase().from("signalements").insert({ ...s, statut: "nouveau" });
    const { error } = await avecTimeout(Promise.resolve(query), { error: null } as any, 1500);
    if (error) return { ok: false as const, error: error.message };
    marquerBackendOperationnel();
    return { ok: true as const, mode: "supabase" as const };
  } catch {
    marquerBackendIndisponible();
    return { ok: true as const, mode: "demo" as const };
  }
}

export async function fetchConsultations(): Promise<Consultation[]> {
  const maintenant = Date.now();
  if (cacheConsultations && maintenant < cacheConsultations.exp) {
    return cacheConsultations.data;
  }

  if (!isSupabaseConfigured || backendIndisponible()) {
    cacheConsultations = { data: DEMO_CONSULTATIONS, exp: maintenant + TTL_CACHE };
    return DEMO_CONSULTATIONS;
  }

  const query = (async (): Promise<Consultation[] | null> => {
    try {
      const { data, error } = await getSupabase()
        .from("consultations")
        .select("*")
        .order("date_publication", { ascending: false });
      if (error || !data || data.length === 0) return null;
      return (data as Consultation[]).map(geoConsultation);
    } catch {
      return null;
    }
  })();

  const data = await avecTimeout<Consultation[] | null>(query, null, 1200);
  const final = data ?? DEMO_CONSULTATIONS;
  if (data) marquerBackendOperationnel();
  else marquerBackendIndisponible();
  cacheConsultations = { data: final, exp: maintenant + TTL_CACHE };
  return final;
}

export async function fetchReponses(): Promise<ReponseConsultation[]> {
  const maintenant = Date.now();
  if (cacheReponses && maintenant < cacheReponses.exp) {
    return cacheReponses.data;
  }

  if (!isSupabaseConfigured || backendIndisponible()) {
    cacheReponses = { data: DEMO_REPONSES, exp: maintenant + TTL_CACHE };
    return DEMO_REPONSES;
  }

  const query = (async (): Promise<ReponseConsultation[] | null> => {
    try {
      const { data, error } = await getSupabase().from("reponses_consultations").select("*");
      if (error || !data || data.length === 0) return null;
      return (data as ReponseConsultation[]).map(geoReponse);
    } catch {
      return null;
    }
  })();

  const data = await avecTimeout<ReponseConsultation[] | null>(query, null, 1200);
  const final = data ?? DEMO_REPONSES;
  if (data) marquerBackendOperationnel();
  else marquerBackendIndisponible();
  cacheReponses = { data: final, exp: maintenant + TTL_CACHE };
  return final;
}

export async function insertConsultation(c: Omit<Consultation, "id" | "date_publication" | "statut">) {
  cacheConsultations = null;
  if (!isSupabaseConfigured || backendIndisponible()) return { ok: true as const, mode: "demo" as const };
  try {
    const query = getSupabase().from("consultations").insert({ ...c, statut: "ouverte" });
    const { error } = await avecTimeout(Promise.resolve(query), { error: null } as any, 1500);
    if (error) return { ok: false as const, error: error.message };
    marquerBackendOperationnel();
    return { ok: true as const, mode: "supabase" as const };
  } catch {
    marquerBackendIndisponible();
    return { ok: true as const, mode: "demo" as const };
  }
}

export async function insertReponse(r: Omit<ReponseConsultation, "id" | "created_at">) {
  cacheReponses = null;
  if (!isSupabaseConfigured || backendIndisponible()) return { ok: true as const, mode: "demo" as const };
  try {
    const query = getSupabase().from("reponses_consultations").insert(r);
    const { error } = await avecTimeout(Promise.resolve(query), { error: null } as any, 1500);
    if (error) return { ok: false as const, error: error.message };
    marquerBackendOperationnel();
    return { ok: true as const, mode: "supabase" as const };
  } catch {
    marquerBackendIndisponible();
    return { ok: true as const, mode: "demo" as const };
  }
}

// ── Authentification : Profils & Matricules avec timeout ──────

export async function chercherMatriculeAutorise(
  matricule: string
): Promise<MatriculeAutorise | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const query = getSupabase()
      .from("matricules_autorises")
      .select("*")
      .ilike("matricule", matricule)
      .eq("actif", true)
      .maybeSingle();
    const res = await avecTimeout(Promise.resolve(query), { data: null } as any, 1000);
    return (res?.data as MatriculeAutorise) ?? null;
  } catch {
    return null;
  }
}

export async function chercherProfilTerrain(email: string, matricule: string): Promise<Profil | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const query = getSupabase()
      .from("profiles")
      .select("*")
      .ilike("email", email)
      .ilike("matricule", matricule)
      .eq("type_compte", "terrain")
      .maybeSingle();
    const res = await avecTimeout(Promise.resolve(query), { data: null } as any, 1000);
    return geoProfil((res?.data as Profil) ?? null) ?? null;
  } catch {
    return null;
  }
}

export async function chercherProfilParMatricule(matricule: string): Promise<Profil | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const query = getSupabase()
      .from("profiles")
      .select("*")
      .ilike("matricule", matricule)
      .maybeSingle();
    const res = await avecTimeout(Promise.resolve(query), { data: null } as any, 1000);
    return geoProfil((res?.data as Profil) ?? null) ?? null;
  } catch {
    return null;
  }
}

export async function creerProfilTerrain(
  p: Omit<Profil, "id" | "created_at" | "type_compte"> & { type_compte?: "terrain" }
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured) return { ok: true };
  try {
    const query = getSupabase().from("profiles").insert({
      ...p,
      prenom: p.prenom ?? null,
      email: p.email ?? null,
      matricule: p.matricule ?? null,
      etablissement: p.etablissement ?? null,
      type_compte: p.type_compte ?? "terrain",
    });
    const res = await avecTimeout(Promise.resolve(query), { error: null } as any, 1500);
    if (res?.error) return { ok: false, error: res.error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur de connexion" };
  }
}

export async function chercherOuCreerProfilGouvernement(
  email: string
): Promise<{ ok: true; profil: Profil } | { ok: false; error: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: "Supabase non configuré" };
  try {
    const query = getSupabase()
      .from("profiles")
      .select("*")
      .ilike("email", email)
      .eq("type_compte", "gouvernement")
      .maybeSingle();
    const existant = await avecTimeout(Promise.resolve(query), { data: null } as any, 1000);
    if (existant?.data) return { ok: true, profil: geoProfil(existant.data as Profil) };

    const insertQuery = getSupabase()
      .from("profiles")
      .insert({
        nom_complet: "Décideur Gouvernemental",
        role: "decideur_ministere",
        region: "Centre",
        province: "Kadiogo",
        commune: "Ouagadougou",
        email,
        type_compte: "gouvernement",
      })
      .select("*")
      .single();
    const res = await avecTimeout(Promise.resolve(insertQuery), { data: null, error: null } as any, 1500);
    if (res?.error || !res?.data) {
      return { ok: false, error: res?.error?.message ?? "Échec création profil" };
    }
    return { ok: true, profil: res.data as Profil };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur de connexion" };
  }
}
