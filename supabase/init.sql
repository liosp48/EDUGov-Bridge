-- ═══════════════════════════════════════════════════════════════════
-- EDUGov-Bridge (Faso Édu-Data) — Script d'initialisation Supabase
-- À exécuter dans : Supabase Dashboard > SQL Editor > New query
-- ═══════════════════════════════════════════════════════════════════

-- Extensions utiles
create extension if not exists "uuid-ossp";

-- ───────────────────────────────────────────────────────────────────
-- 1. TABLE PROFILES
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key default uuid_generate_v4(),
  nom_complet   text not null,
  role          text not null check (role in (
                  'enseignant','directeur_ecole','inspecteur',
                  'representant_parents','decideur_ministere')),
  region        text not null,
  province      text not null,
  commune       text not null,
  telephone     text,
  created_at    timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────
-- 2. TABLE SIGNALEMENTS (signaux faibles du terrain)
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.signalements (
  id                    uuid primary key default uuid_generate_v4(),
  profil_id             uuid references public.profiles(id) on delete set null,
  emetteur              text not null,
  role_emetteur         text not null check (role_emetteur in (
                          'enseignant','directeur_ecole','inspecteur',
                          'representant_parents')),
  -- Découpage géographique Région → Province → Commune → Village → Établissement
  region                text not null,
  province              text not null,
  commune               text not null,
  village_secteur       text,
  etablissement         text not null,
  categorie             text not null check (categorie in (
                          'decrochage','infrastructure','genre_rural',
                          'pedagogie','securite')),
  gravite               int not null check (gravite between 1 and 5),
  description           text not null,
  proposition_innovation text,
  statut                text not null default 'nouveau' check (statut in (
                          'nouveau','en_analyse','verifie','transmis_bureau','clos')),
  created_at            timestamptz not null default now()
);

create index if not exists idx_signalements_geo on public.signalements (region, province, commune);
create index if not exists idx_signalements_categorie on public.signalements (categorie);
create index if not exists idx_signalements_created on public.signalements (created_at desc);

-- ───────────────────────────────────────────────────────────────────
-- 3. TABLE CONSULTATIONS (questions ciblées du Ministère)
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.consultations (
  id                uuid primary key default uuid_generate_v4(),
  titre             text not null,
  question          text not null,
  region_cible      text,
  province_cible    text,
  commune_cible     text,
  date_publication  timestamptz not null default now(),
  date_cloture      timestamptz,
  statut            text not null default 'ouverte' check (statut in ('ouverte','clos'))
);

-- ───────────────────────────────────────────────────────────────────
-- 4. TABLE REPONSES_CONSULTATIONS (voix du terrain sur les questions)
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.reponses_consultations (
  id               uuid primary key default uuid_generate_v4(),
  consultation_id  uuid not null references public.consultations(id) on delete cascade,
  role_emetteur    text not null check (role_emetteur in (
                     'enseignant','directeur_ecole','inspecteur',
                     'representant_parents')),
  emetteur         text not null,
  region           text not null,
  province         text not null,
  commune          text not null,
  etablissement    text,
  contenu          text not null,
  created_at       timestamptz not null default now()
);

create index if not exists idx_reponses_consult on public.reponses_consultations (consultation_id);

-- ───────────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY (RLS)
--    MVP hackathon : lecture ouverte, écriture ouverte sur les
--    remontées terrain. Production : restreindre via auth.uid().
-- ───────────────────────────────────────────────────────────────────
alter table public.profiles               enable row level security;
alter table public.signalements           enable row level security;
alter table public.consultations          enable row level security;
alter table public.reponses_consultations enable row level security;

-- Lecture publique (dashboard décisionnel + onglet consultations)
create policy "lecture_signalements"   on public.signalements           for select using (true);
create policy "lecture_consultations"  on public.consultations          for select using (true);
create policy "lecture_reponses"       on public.reponses_consultations for select using (true);

-- Les acteurs du terrain peuvent soumettre
create policy "insert_signalements" on public.signalements for insert with check (true);
create policy "insert_reponses"     on public.reponses_consultations for insert with check (true);
create policy "insert_profiles"     on public.profiles for insert with check (true);

-- Seuls les décideurs peuvent lancer / clôturer des consultations
-- (production : filtrer sur profile role = 'decideur_ministere' lié à auth.users)
create policy "insert_consultations" on public.consultations for insert with check (true);
create policy "update_consultations"  on public.consultations for update using (true);

-- ───────────────────────────────────────────────────────────────────
-- 7. AUTHENTIFICATION MVP
--    · profiles étendu (email, matricule, type de compte)
--    · table matricules_autorises = référentiel DRH MENAPLN
-- ───────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists prenom        text,
  add column if not exists email         text,
  add column if not exists matricule      text,
  add column if not exists etablissement  text;

-- Type de compte (doit être ajouté en statement séparé pour éviter les erreurs si
-- la colonne existe déjà — l'ancien profiles ne la possède pas)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'type_compte'
  ) then
    alter table public.profiles
      add column type_compte text not null default 'terrain'
        check (type_compte in ('terrain','gouvernement'));
  end if;
end $$;

-- Unicité : un matricule / un email = un seul profil actif
create unique index if not exists idx_profiles_matricule
  on public.profiles (matricule) where matricule is not null;
create unique index if not exists idx_profiles_email
  on public.profiles (lower(email)) where email is not null;

-- ── 7b. TABLE MATRICULES_AUTORISES (référentiel DRH pré-validé) ──
create table if not exists public.matricules_autorises (
  id          uuid primary key default uuid_generate_v4(),
  matricule   text not null,
  nom         text not null,
  prenom      text,
  email       text,
  actif       boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint matricule_unique unique (matricule)
);

alter table public.matricules_autorises enable row level security;

-- Lecture nécessaire à la vérification d'inscription (anonyme)
-- Production : passer par un RPC SECURITY DEFINER côté service-role.
create policy "lecture_matricules_autorises"
  on public.matricules_autorises for select using (true);

-- ── 7c. Lecture des profils (flux de connexion terrain / gouvernement) ──
create policy "lecture_profiles" on public.profiles for select using (true);

-- ── 7d. Jeu de démonstration (mode sans backend) ──
insert into public.matricules_autorises (matricule, nom, prenom, email) values
  ('MEN-2026-0031', 'OUEDRAOGO', 'Aïcha Marie',   'aicha.ouedraogo@menapln.bf'),
  ('MEN-2026-0457', 'SAWADOGO',  'Ibrahim',       'ibrahim.sawadogo@menapln.bf'),
  ('MEN-2026-1284', 'KABORE',    'Fatimata',      'fatimata.kabore@menapln.bf'),
  ('MEN-2026-2210', 'YAMEOGO',   'Boureima',      'boureima.yameogo@menapln.bf')
on conflict (matricule) do nothing;

-- ───────────────────────────────────────────────────────────────────
-- 6. VUE AGRÉGÉE pour les KPIs décisionnels (bonus — plan gratuit OK)
-- ───────────────────────────────────────────────────────────────────
create or replace view public.v_stats_regions as
select
  region,
  count(*)                                                as total_signalements,
  avg(case when categorie = 'decrochage' then gravite end) as gravite_moy_decrochage,
  count(*) filter (where categorie = 'decrochage')         as nb_decrochage,
  count(*) filter (where categorie = 'infrastructure')     as nb_infrastructure,
  count(*) filter (where categorie = 'securite')           as nb_securite
from public.signalements
group by region
order by total_signalements desc;
