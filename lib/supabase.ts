import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────
// Client Supabase unique (PostgreSQL + RLS côté serveur)
// Si les variables d'env sont absentes → MODE DÉMO (données locales)
// ─────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true si Supabase est réellement configuré — sinon on tombe sur le mode démo */
export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http"));

export const supabase = createClient(
  supabaseUrl ?? "http://localhost:54321",
  supabaseAnonKey ?? "demo-anon-key",
  {
    auth: { persistSession: false },
  }
);

// ── Helpers de haut niveau ────────────────────────────────────

import type {
  MatriculeAutorise,
  Profil,
  Consultation,
  ReponseConsultation,
  Signalement,
} from "@/types/database";
import { DEMO_CONSULTATIONS, DEMO_REPONSES, DEMO_SIGNALEMENTS } from "./demo-data";

export async function fetchSignalements(): Promise<Signalement[]> {
  if (!isSupabaseConfigured) return DEMO_SIGNALEMENTS;
  const { data, error } = await supabase
    .from("signalements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error || !data) {
    console.error("fetchSignalements:", error?.message);
    return DEMO_SIGNALEMENTS;
  }
  return data as Signalement[];
}

export async function insertSignalement(s: Omit<Signalement, "id" | "created_at" | "statut">) {
  if (!isSupabaseConfigured) return { ok: true as const, mode: "demo" as const };
  const { error } = await supabase.from("signalements").insert({ ...s, statut: "nouveau" });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, mode: "supabase" as const };
}

export async function fetchConsultations(): Promise<Consultation[]> {
  if (!isSupabaseConfigured) return DEMO_CONSULTATIONS;
  const { data, error } = await supabase
    .from("consultations")
    .select("*")
    .order("date_publication", { ascending: false });
  if (error || !data) {
    console.error("fetchConsultations:", error?.message);
    return DEMO_CONSULTATIONS;
  }
  return data as Consultation[];
}

export async function fetchReponses(): Promise<ReponseConsultation[]> {
  if (!isSupabaseConfigured) return DEMO_REPONSES;
  const { data, error } = await supabase.from("reponses_consultations").select("*");
  if (error || !data) return DEMO_REPONSES;
  return data as ReponseConsultation[];
}

export async function insertConsultation(c: Omit<Consultation, "id" | "date_publication" | "statut">) {
  if (!isSupabaseConfigured) return { ok: true as const, mode: "demo" as const };
  const { error } = await supabase.from("consultations").insert({ ...c, statut: "ouverte" });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, mode: "supabase" as const };
}

export async function insertReponse(r: Omit<ReponseConsultation, "id" | "created_at">) {
  if (!isSupabaseConfigured) return { ok: true as const, mode: "demo" as const };
  const { error } = await supabase.from("reponses_consultations").insert(r);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, mode: "supabase" as const };
}

// ── Authentification MVP : profils & matricules autorisés ─────

/** Recherche le matricule dans la table DRH de référence */
export async function chercherMatriculeAutorise(
  matricule: string
): Promise<MatriculeAutorise | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase
    .from("matricules_autorises")
    .select("*")
    .ilike("matricule", matricule)
    .eq("actif", true)
    .maybeSingle();
  return (data as MatriculeAutorise) ?? null;
}

/** Profil existant pour un couple email + matricule (connexion terrain) */
export async function chercherProfilTerrain(email: string, matricule: string): Promise<Profil | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .ilike("email", email)
    .ilike("matricule", matricule)
    .eq("type_compte", "terrain")
    .maybeSingle();
  return (data as Profil) ?? null;
}

/** Profil déjà créé pour un matricule donné (détection inscription existante) */
export async function chercherProfilParMatricule(matricule: string): Promise<Profil | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .ilike("matricule", matricule)
    .maybeSingle();
  return (data as Profil) ?? null;
}

/** Inscription terrain : crée le profil lié au matricule pré-validé */
export async function creerProfilTerrain(
  p: Omit<Profil, "id" | "created_at" | "type_compte"> & { type_compte?: "terrain" }
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured) return { ok: true };
  const { error } = await supabase.from("profiles").insert({
    ...p,
    prenom: p.prenom ?? null,
    email: p.email ?? null,
    matricule: p.matricule ?? null,
    etablissement: p.etablissement ?? null,
    type_compte: p.type_compte ?? "terrain",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Gouvernement : crée (ou retrouve) le profil décideur lié à l'email officiel */
export async function chercherOuCreerProfilGouvernement(
  email: string
): Promise<{ ok: true; profil: Profil } | { ok: false; error: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: "Supabase non configuré" };
  const { data: existant } = await supabase
    .from("profiles")
    .select("*")
    .ilike("email", email)
    .eq("type_compte", "gouvernement")
    .maybeSingle();
  if (existant) return { ok: true, profil: existant as Profil };
  const { data, error } = await supabase
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
  if (error || !data) return { ok: false, error: error?.message ?? "Échec création profil" };
  return { ok: true, profil: data as Profil };
}
