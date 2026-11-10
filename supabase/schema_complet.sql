-- ╔════════════════════════════════════════════════════════════════╗
-- ║  EDUGov-Bridge (Faso Édu-Data) — SCHEMA COMPLET SUPABASE        ║
-- ║  Script unique, IDEMPOTENT (ré-exécutable sans erreur)         ║
-- ║                                                                ║
-- ║  Utilisation : Supabase Dashboard > SQL Editor > New query     ║
-- ║  → coller TOUT le fichier → Run.                               ║
-- ║                                                                ║
-- ║  Crée : extensions, 5 tables (profiles, matricules_autorises,  ║
-- ║  signalements, consultations, reponses_consultations), index,  ║
-- ║  RLS + policies, vue KPI v_stats_regions, données de démo.     ║
-- ╚════════════════════════════════════════════════════════════════╝

-- ───────────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ───────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ───────────────────────────────────────────────────────────────────
-- 1. TABLE PROFILES (acteurs terrain + décideurs gouvernementaux)
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
  prenom        text,
  email         text,
  matricule     text,
  etablissement text,
  type_compte   text not null default 'terrain'
                  check (type_compte in ('terrain','gouvernement')),
  created_at    timestamptz not null default now()
);

-- Colonnes d'auth si la table existait déjà dans une version antérieure
alter table public.profiles
  add column if not exists prenom        text,
  add column if not exists email         text,
  add column if not exists matricule      text,
  add column if not exists etablissement  text;

-- type_compte : ajout conditionnel (l'ancienne table ne le possède pas)
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

-- ───────────────────────────────────────────────────────────────────
-- 2. TABLE MATRICULES_AUTORISES (référentiel DRH MENAPLN pré-validé)
--     Une inscription terrain est REFUSÉE si le matricule absent d'ici.
-- ───────────────────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────────────────
-- 3. TABLE SIGNALEMENTS (signaux faibles du terrain)
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.signalements (
  id                    uuid primary key default uuid_generate_v4(),
  profil_id             uuid references public.profiles(id) on delete set null,
  emetteur              text not null,
  role_emetteur         text not null check (role_emetteur in (
                          'enseignant','directeur_ecole','inspecteur',
                          'representant_parents')),
  region                text not null,
  province              text not null,
  commune               text not null,
  village_secteur       text,
  etablissement         text not null,
  categorie             text not null check (categorie in (
                          'decrochage','infrastructure','genre_rural',
                          'pedagogie','securite')),
  -- DÉFI 1 (Décrochage) : signaux faibles observés + élèves en danger
  indicateurs           text[] not null default '{}',
  nb_eleves_risque      int not null default 0
                          check (nb_eleves_risque between 0 and 10000),
  gravite               int not null check (gravite between 1 and 5),
  description           text not null,
  statut                text not null default 'nouveau' check (statut in (
                          'nouveau','en_analyse','verifie','transmis_bureau','clos')),
  created_at            timestamptz not null default now()
);

-- ── Migration Douce (bases existantes) : colonnes Défi 1 ──────────
alter table public.signalements add column if not exists indicateurs      text[] not null default '{}';
alter table public.signalements add column if not exists nb_eleves_risque int    not null default 0;

create index if not exists idx_signalements_geo       on public.signalements (region, province, commune);
create index if not exists idx_signalements_categorie on public.signalements (categorie);
create index if not exists idx_signalements_created   on public.signalements (created_at desc);

-- ───────────────────────────────────────────────────────────────────
-- 4. TABLE CONSULTATIONS (questions ciblées lancées par l'autorité)
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
-- 5. TABLE REPONSES_CONSULTATIONS (voix du terrain)
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
-- 6. CONTRAINTES D'UNICITÉ (anti double-compte)
--     Un matricule = un profil ; un email = un profil.
-- ───────────────────────────────────────────────────────────────────
create unique index if not exists idx_profiles_matricule
  on public.profiles (matricule) where matricule is not null;
create unique index if not exists idx_profiles_email
  on public.profiles (lower(email)) where email is not null;

-- ───────────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY + POLICIES
--     MVP : lecture publique des données agrégées / consultations,
--     écriture ouverte sur les remontées terrain.
--     Production : restreindre via auth.uid() / rôles JWT.
-- ───────────────────────────────────────────────────────────────────
alter table public.profiles               enable row level security;
alter table public.matricules_autorises   enable row level security;
alter table public.signalements           enable row level security;
alter table public.consultations          enable row level security;
alter table public.reponses_consultations enable row level security;

-- Lectures (dashboard décisionnel, accueil public, véfication matricule)
drop policy if exists lecture_profiles            on public.profiles;
drop policy if exists lecture_matricules_autorises on public.matricules_autorises;
drop policy if exists lecture_signalements        on public.signalements;
drop policy if exists lecture_consultations       on public.consultations;
drop policy if exists lecture_reponses            on public.reponses_consultations;

create policy "lecture_profiles"             on public.profiles               for select using (true);
create policy "lecture_matricules_autorises" on public.matricules_autorises   for select using (true);
create policy "lecture_signalements"         on public.signalements           for select using (true);
create policy "lecture_consultations"        on public.consultations          for select using (true);
create policy "lecture_reponses"             on public.reponses_consultations for select using (true);

-- Écritures terrain
drop policy if exists insert_signalements on public.signalements;
drop policy if exists insert_reponses     on public.reponses_consultations;
drop policy if exists insert_profiles     on public.profiles;
drop policy if exists insert_consultations on public.consultations;

create policy "insert_signalements" on public.signalements           for insert with check (true);
create policy "insert_reponses"     on public.reponses_consultations for insert with check (true);
create policy "insert_profiles"     on public.profiles               for insert with check (true);

-- L'autorité peut lancer / clôturer des consultations
drop policy if exists update_consultations on public.consultations;

create policy "update_consultations" on public.consultations for update using (true);

-- ───────────────────────────────────────────────────────────────────
-- 8. VUE AGRÉGÉE POUR LES KPIs DÉCISIONNELS (compatible plan gratuit)
-- ───────────────────────────────────────────────────────────────────
create or replace view public.v_stats_regions as
select
  region,
  count(*)                                                as total_alertes_decrochage,
  avg(gravite)                                             as gravite_moy_decrochage,
  sum(nb_eleves_risque)                                    as total_eleves_risque,
  count(*) filter (where gravite >= 4)                     as alertes_critiques
from public.signalements
where categorie = 'decrochage'
group by region
order by total_eleves_risque desc;

-- ───────────────────────────────────────────────────────────────────
-- 9. SEED 9A — RÉFÉRENTIEL DRH (matricules de démonstration)
--     Comptes terrain utilisables sur /auth : MEN-2026-0031, -0457,
--     -1284, -2210.
-- ───────────────────────────────────────────────────────────────────
insert into public.matricules_autorises (matricule, nom, prenom, email) values
  ('MEN-2026-0031', 'OUEDRAOGO', 'Aïcha Marie', 'aicha.ouedraogo@menapln.bf'),
  ('MEN-2026-0457', 'SAWADOGO',  'Ibrahim',     'ibrahim.sawadogo@menapln.bf'),
  ('MEN-2026-1284', 'KABORE',    'Fatimata',    'fatimata.kabore@menapln.bf'),
  ('MEN-2026-2210', 'YAMEOGO',   'Boureima',    'boureima.yameogo@menapln.bf')
on conflict (matricule) do nothing;

-- ───────────────────────────────────────────────────────────────────
-- 9b. SEED — CONSULTATIONS DE DÉMONSTRATION (missions en cours)
-- ───────────────────────────────────────────────────────────────────
insert into public.consultations
  (id, titre, question, region_cible, province_cible, commune_cible,
   date_publication, date_cloture, statut)
values
  ('c1000000-0000-0000-0000-000000000001',
   'Plan Cantines URGENT — Liptako & Kuilsé',
   'Comment votre établissement pourrait-il contribuer (jardin scolaire, tontine parents, partenariat local) à sécuriser au moins un repas chaud par jour pour 50 élèves supplémentaires d''ici la reprise ?',
   'Liptako', 'Séno', null, '2026-11-02T08:00:00Z', '2026-11-30T23:59:00Z', 'ouverte'),
  ('c1000000-0000-0000-0000-000000000002',
   'Inventaire éclair toitures / latrines',
   'Directeurs : indiquez le nombre exact de salles à toiture endommagée et de cases de latrines fonctionnelles dans votre établissement, avec photos.',
   'Guiriko', 'Houet', null, '2026-11-04T10:00:00Z', '2026-11-25T23:59:00Z', 'ouverte'),
  ('c1000000-0000-0000-0000-000000000003',
   'Maintien des filles à l''école',
   'Quelles mesures locales concrètes (sanitaires, bourses, calendriers adaptés) peuvent faire reculer le mariage précoce dans NOS communes d''ici 2027 ?',
   'Nazinon', 'Nahouri', 'Pô', '2026-10-28T09:00:00Z', '2026-12-05T23:59:00Z', 'ouverte')
on conflict (id) do nothing;

-- ───────────────────────────────────────────────────────────────────
-- 9c. SEED — SIGNALEMENTS TERRAIN (miroir exact de lib/demo-data.ts)
--     ⇒ les dashboards sont vivants dès le premier lancement.
-- ───────────────────────────────────────────────────────────────────
insert into public.signalements
  (id, profil_id, emetteur, role_emetteur, region, province, commune,
   village_secteur, etablissement, categorie, indicateurs, nb_eleves_risque,
   gravite, description, statut, created_at)
values
  ('a1000000-0000-0000-0000-000000000001', null, 'Aïcha Ouédraogo', 'enseignant',
   'Liptako', 'Séno', 'Dori', 'Falagountou', 'CEG Falagountou', 'decrochage',
   ARRAY['absenteisme_repete','difficultes_financieres','orpaillage_transhumance'], 19, 5,
   'Depuis novembre, sur 52 filles inscrites en 6e, 19 ne reviennent plus. Les parents envoient les enfants garder le bétail pendant la transhumance. Trois familles n''ont plus de quoi payer les frais annexes.',
   'nouveau', '2026-11-04T09:12:00Z'),
  ('a1000000-0000-0000-0000-000000000002', null, 'Boureima Sawadogo', 'directeur_ecole',
   'Kuilsé', 'Sandbondtenga', 'Barsalogho', 'Namissiguima', 'ÉPP Namissiguima', 'decrochage',
   ARRAY['choc_securitaire','abandon_silencieux'], 34, 5,
   'Zone attaquée le mois dernier : 2 familles déplacées ont quitté le village avec leurs enfants sans transfert de dossier. 34 élèves n''ont pas remis les pieds en classe depuis 3 semaines, sans nouvelle des familles.',
   'verifie', '2026-11-06T07:40:00Z'),
  ('a1000000-0000-0000-0000-000000000003', null, 'Fadima Sanogo', 'representant_parents',
   'Liptako', 'Séno', 'Gorom-Gorom', 'Anderka-Bouyam', 'ÉPP Anderka-Bouyam', 'decrochage',
   ARRAY['choc_securitaire','difficultes_financieres','absenteisme_repete'], 9, 5,
   'Depuis les incidents, les enfants marchent 12 km pour l''école, certains passent la nuit dehors. Trois familles ont retiré tous leurs enfants (9 élèves). Les autres s''absentent dès qu''il y a une rumeur.',
   'verifie', '2026-11-06T06:05:00Z'),
  ('a1000000-0000-0000-0000-000000000004', null, 'Nafissata Zongo', 'enseignant',
   'Nazinon', 'Nahouri', 'Pô', 'Bicouré', 'ÉPP Bicouré', 'decrochage',
   ARRAY['mariage_grossesse_precoce'], 12, 4,
   '12 filles mariées en CM1-CM2 cette année sur une seule classe. Deux autres présentent des signes de grossesse. Les familles refusent d''évoquer le retour en classe, la belle-famille a déjà payé la dot.',
   'nouveau', '2026-11-03T17:10:00Z'),
  ('a1000000-0000-0000-0000-000000000005', null, 'Adama Ouattara', 'representant_parents',
   'Centre-Ouest', 'Boulkiemdé', 'Koudougou', 'Zondoma', 'CES Zondoma', 'decrochage',
   ARRAY['orpaillage_transhumance','difficultes_financieres'], 23, 4,
   'Les adolescents partent sur les sites d''orpaillage de Zondoma pour la saison sèche. Sur les 40 élèves marqués absents ce trimestre, 23 sont partis aux sites miniers. Les familles plient sous les frais annexes.',
   'en_analyse', '2026-11-02T19:55:00Z'),
  ('a1000000-0000-0000-0000-000000000006', null, 'Issouf Traoré', 'directeur_ecole',
   'Kuilsé', 'Sandbondtenga', 'Kaya', 'Manéssè', 'CEG Manéssè', 'decrochage',
   ARRAY['difficultes_financieres','absenteisme_repete'], 41, 4,
   'Pas de cantine : les élèves affamés désertent l''après-midi. 41 élèves dépassent les 2 semaines d''absence consécutives ce trimestre. Six familles ont signalé qu''elles n''envoient plus les grands enfants car ils préparent la saison des champs.',
   'nouveau', '2026-11-06T08:00:00Z'),
  ('a1000000-0000-0000-0000-000000000007', null, 'Yacouba Compaoré', 'directeur_ecole',
   'Liptako', 'Oudalan', 'Tin-Akoff', 'Tin-Akoff', 'École Primaire Tin-Akoff', 'decrochage',
   ARRAY['choc_securitaire','abandon_silencieux','absenteisme_repete'], 27, 5,
   'École proche de la frontière malienne : fermetures intermittentes, enseignants non résidents absents 3 jours sur 5. 27 enfants n''ont plus été vus depuis octobre, les familles ont probablement rejoint les camps de déplacés.',
   'verifie', '2026-11-05T05:40:00Z'),
  ('a1000000-0000-0000-0000-000000000008', null, 'Marie Ouédraogo', 'inspecteur',
   'Oubri', 'Ganzourgou', 'Zorgho', 'Gongzoungou', 'ÉPP Gongzoungou', 'decrochage',
   ARRAY['choc_climatique','absenteisme_repete'], 15, 3,
   'Les inondations du barrage ont détruit 14 cases du village. Les enfants affectés travaillent dans les champs de reconstitution. Abandon croissant en CM2 pendant la saison maraîchère, aucun dispositif d''encadrement.',
   'nouveau', '2026-11-06T16:30:00Z'),
  ('a1000000-0000-0000-0000-000000000009', null, 'Hakim Diarra', 'enseignant',
   'Bankui', 'Mouhoun', 'Dédougou', 'Abalama', 'CEG Abalama', 'decrochage',
   ARRAY['difficultes_financieres','mariage_grossesse_precoce'], 8, 3,
   'Huit élèves filles de 4e signalées par leurs camarades comme promises en mariage avant la fin de l''année. Deux ont déjà arrêté de venir. Les frais d''inscription du CQEB sont pointés par les familles comme élément déclencheur.',
   'nouveau', '2026-11-04T13:00:00Z'),
  ('a1000000-0000-0000-0000-000000000010', null, 'Awa Tapsoba', 'enseignant',
   'Goulmou', 'Gourma', 'Matiacoali', 'Nignan', 'CEG Matiacoali', 'decrochage',
   ARRAY['choc_securitaire','orpaillage_transhumance','absenteisme_repete'], 30, 4,
   'Convergence orpailleurs + insécurité routière : les convois d''élèves du secteur de Nignan ont totalement cessé depuis l''embuscade de la RN-19. 30 élèves concernés, les aînés emmenés aux sites miniers du kebbi.',
   'en_analyse', '2026-11-01T10:20:00Z'),
  ('a1000000-0000-0000-0000-000000000011', null, 'Dr. Salif Nikièma', 'inspecteur',
   'Goulmou', 'Gourma', 'Fada N''Gourma', 'Zanlougou', 'CES Zanlougou', 'decrochage',
   ARRAY['absenteisme_repete','difficultes_financieres'], 11, 3,
   'Suivi de cohortes : 11 élèves de 3e ont manqué plus de 15 jours depuis la rentrée, tous issus de familles d''éleveurs touchées par la maisonnée partie en transhumance précoce.',
   'nouveau', '2026-11-06T11:20:00Z'),
  ('a1000000-0000-0000-0000-000000000012', null, 'Rasmané Kaboré', 'enseignant',
   'Kadiogo', 'Kadiogo', 'Ouagadougou', 'Gounghin', 'CES Gounghin', 'decrochage',
   ARRAY['difficultes_financieres','absenteisme_repete'], 17, 4,
   'Zone d''accueil des déplacés internes : 17 élèves du secteur Gounghin viennent de familles expulsées de leur logement, absents par roulement faute de transport. Deux filles vendent au marché le matin au lieu d''aller en cours.',
   'nouveau', '2026-11-05T21:45:00Z')
on conflict (id) do nothing;

-- ╔════════════════════════════════════════════════════════════════╗
-- ║  VÉRIFICATION POST-EXÉCUTION — à coller séparément si besoin :  ║
-- ║                                                                ║
-- ║  select 'profiles' t, count(*) from public.profiles            ║
-- ║  union all select 'matricules_autorises', count(*) from public.matricules_autorises
-- ║  union all select 'signalements',        count(*) from public.signalements
-- ║  union all select 'consultations',       count(*) from public.consultations
-- ║  union all select 'reponses_consultations', count(*) from public.reponses_consultations;
-- ║                                                                ║
-- ║  Attendu : matricules_autorises = 4 · signalements = 12 ·       ║
-- ║  consultations = 3 · profiles = 0 · reponses_consultations = 0  ║
-- ╚════════════════════════════════════════════════════════════════╝
