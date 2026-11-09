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
  gravite               int not null check (gravite between 1 and 5),
  description           text not null,
  proposition_innovation text,
  statut                text not null default 'nouveau' check (statut in (
                          'nouveau','en_analyse','verifie','transmis_bureau','clos')),
  created_at            timestamptz not null default now()
);

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
  count(*)                                                as total_signalements,
  avg(case when categorie = 'decrochage' then gravite end) as gravite_moy_decrochage,
  count(*) filter (where categorie = 'decrochage')         as nb_decrochage,
  count(*) filter (where categorie = 'infrastructure')     as nb_infrastructure,
  count(*) filter (where categorie = 'securite')           as nb_securite
from public.signalements
group by region
order by total_signalements desc;

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
   'Plan Cantines URGENT — Sahel & Centre-Nord',
   'Comment votre établissement pourrait-il contribuer (jardin scolaire, tontine parents, partenariat local) à sécuriser au moins un repas chaud par jour pour 50 élèves supplémentaires d''ici la reprise ?',
   'Sahel', 'Séno', null, '2026-11-02T08:00:00Z', '2026-11-30T23:59:00Z', 'ouverte'),
  ('c1000000-0000-0000-0000-000000000002',
   'Inventaire éclair toitures / latrines',
   'Directeurs : indiquez le nombre exact de salles à toiture endommagée et de cases de latrines fonctionnelles dans votre établissement, avec photos.',
   'Hauts-Bassins', 'Houet', null, '2026-11-04T10:00:00Z', '2026-11-25T23:59:00Z', 'ouverte'),
  ('c1000000-0000-0000-0000-000000000003',
   'Maintien des filles à l''école',
   'Quelles mesures locales concrètes (sanitaires, bourses, calendriers adaptés) peuvent faire reculer le mariage précoce dans NOS communes d''ici 2027 ?',
   'Sud-Ouest', 'Nahouri', 'Pô', '2026-10-28T09:00:00Z', '2026-12-05T23:59:00Z', 'ouverte')
on conflict (id) do nothing;

-- ───────────────────────────────────────────────────────────────────
-- 9c. SEED — SIGNALEMENTS TERRAIN (miroir exact de lib/demo-data.ts)
--     ⇒ les dashboards sont vivants dès le premier lancement.
-- ───────────────────────────────────────────────────────────────────
insert into public.signalements
  (id, profil_id, emetteur, role_emetteur, region, province, commune,
   village_secteur, etablissement, categorie, gravite, description,
   proposition_innovation, statut, created_at)
values
  ('a1000000-0000-0000-0000-000000000001', null, 'Aïcha Ouédraogo', 'enseignant',
   'Sahel', 'Séno', 'Dori', 'Falagountou', 'CEG Falagountou', 'decrochage', 5,
   'On constate depuis novembre un abandon massif des filles en 6e et 5e : sur 52 filles inscrites, 19 ne reviennent plus. Les parents préfèrent envoyer les enfants garder le bétail pendant la période de transhumance. Les cours du soir ne fonctionnent plus faute de lampes solaires.',
   'Clubs de parrainage scolaire : chaque chef de famille notable parraine 3 filles (kit solaire + cantine) et un suivi trimestriel par l''APE.',
   'nouveau', '2026-11-04T09:12:00Z'),
  ('a1000000-0000-0000-0000-000000000002', null, 'Boureima Sawadogo', 'directeur_ecole',
   'Hauts-Bassins', 'Houet', 'Bobo-Dioulasso', 'Sarfalao', 'CES Sarfalao', 'infrastructure', 4,
   'Inventaire d''urgence : sur 32 salles utilisables, 9 ont la toiture endommagée depuis la saison des pluies. 720 élèves assis sur des tables-bancs pour 400 places réelles. Le bloc de latrines (6 cases pour 960 élèves) est saturé, les filles quittent l''école pour rentrer chez elles.',
   'Convention communale réhabilitation : mobiliser les artisans locaux (maçons-ferblantiers formés) avec un chèque-kit matériaux, dossiers prêts à l''emploi.',
   'en_analyse', '2026-11-05T14:30:00Z'),
  ('a1000000-0000-0000-0000-000000000003', null, 'Rasmané Kaboré', 'enseignant',
   'Centre', 'Kadiogo', 'Ouagadougou', 'Gounghin', 'CES Gounghin', 'pedagogie', 3,
   '36 élèves par classe sur les langues, tests de positionnement montrant 60% d''élèves fonctionnellement illettrés en français en 4e. Les manuels du programme bilingue sont épuisés depuis deux ans et rien pour compenser.',
   'Bibliothèque de classe numérique open-source sur tablettes rechargeables (100 livres copyright-free français/fulfuldé/mooré), kit cédé par la coopérative des enseignants',
   'nouveau', '2026-11-05T21:45:00Z'),
  ('a1000000-0000-0000-0000-000000000004', null, 'Fadima Sanogo', 'representant_parents',
   'Sahel', 'Séno', 'Gorom-Gorom', 'Anderka-Bouyam', 'ÉPP Anderka-Bouyam', 'securite', 5,
   'Depuis les incidents de l''école primaire d''Anderka-Bouyam, les enfants marchent 12 km pour se rendre à l''école, certains passent la nuit dehors. Point d''eau non sécurisé. Trois familles ont retiré tous leurs enfants (9 élèves) de l''école.',
   'Convois scolaires communautaires organisés par l''APE avec accompagnateurs tournants, abris-vigie aux points critiques financés par la tontine du village.',
   'verifie', '2026-11-06T06:05:00Z'),
  ('a1000000-0000-0000-0000-000000000005', null, 'Dr. Salif Nikièma', 'inspecteur',
   'Est', 'Gourma', 'Fada N''Gourma', 'Zanlougou', 'CES Zanlougou', 'pedagogie', 3,
   'Diagnostic qualité : sur les 8 enseignants suivis, 5 sont contractuels non formés à la didactique des mathématiques. Taux moyen de réussite au BEPC de la commune : 24% contre 52% il y a 4 ans. Aucun stage de renforcement depuis 2023.',
   'Pair-à-pédagogie : jumeler les contractuels avec des enseignants titulaires expérimentés contre des crédits de formation validés par l''inspection.',
   'nouveau', '2026-11-06T11:20:00Z'),
  ('a1000000-0000-0000-0000-000000000006', null, 'Nafissata Zongo', 'enseignant',
   'Sud-Ouest', 'Nahouri', 'Pô', 'Bicouré', 'ÉPP Bicouré', 'genre_rural', 4,
   '12 filles mariées en CM1-CM2 cette année sur une seule classe. L''école n''a aucun bloc sanitaire privé pour les adolescentes ni kit d''hygiène. Les redoublements répétés masculinisent la classe.',
   'Bourse conditionnelle gérée par l''APE : versement mensuel aux filles si présence ≥85% + sanction sociale positive (tableau d''honneur des mères)',
   'nouveau', '2026-11-03T17:10:00Z'),
  ('a1000000-0000-0000-0000-000000000007', null, 'Issouf Traoré', 'directeur_ecole',
   'Centre-Nord', 'Sanmatenga', 'Kaya', 'Manéssè', 'CEG Manéssè', 'infrastructure', 4,
   'Effectifs réels confirmés : 1 240 élèves contre 910 déclarés au recensement officiel. Doubles places dans les salles d''admission. 4 des 10 salles de classe accueillent 54 élèves à 3 par table-banc double. Pas de cantine : les élèves affamés perdent la concentration l''après-midi.',
   'Jardin maraîcher scolaire d''autosuffisance pour la cantine, piloté par l''enseignant d''agriculture et l''Association Villageoise de Développement, avec revenus réinvestis dans les repas.',
   'nouveau', '2026-11-06T08:00:00Z'),
  ('a1000000-0000-0000-0000-000000000008', null, 'Adama Ouattara', 'representant_parents',
   'Centre-Ouest', 'Boulkiemdé', 'Koudougou', 'Zondoma', 'CES Zondoma', 'decrochage', 4,
   'Les adolescents vont travailler dans les sites d''orpaillage artisanal de Zondoma pendant la saison sèche. Sur les 40 élèves marqués absents ce trimestre, 23 sont partis aux sites miniers. Les familles plient sous les frais annexes de l''école.',
   'Cours-relais hors site : capsules de cours partagées par WhatsApp audio depuis les sites d''orpaillage, suivi signé par l''encadreur communal et l''APE.',
   'en_analyse', '2026-11-02T19:55:00Z'),
  ('a1000000-0000-0000-0000-000000000009', null, 'Awa Tapsoba', 'enseignant',
   'Centre-Est', 'Kouritenga', 'Koupéla', 'Tankoussou', 'ÉPP Tankoussou', 'infrastructure', 3,
   'L''école fonctionne avec 12 tables-bancs pour une classe de 68 en CI. Les enfants s''assoient par terre depuis février. L''APE a sollicité 3 fois la CVD. Le bureau n''a plus de marqueurs, les ardoises sont consommées.',
   'Banc fabriqué par les forgerons locaux à base d''acier de recyclage à 12 500 FCFA/unité sous plan de charge communal',
   'transmis_bureau', '2026-11-01T10:20:00Z'),
  ('a1000000-0000-0000-0000-000000000010', null, 'Yacouba Compaoré', 'directeur_ecole',
   'Sahel', 'Oudalan', 'Tin-Akoff', 'Tin-Akoff', 'École Primaire Tin-Akoff', 'securite', 5,
   'École proche de la frontière malienne : fermetures intermittente liée aux déplacements transfrontaliers. Enseignants non résidents absents 3 jours sur 5. Aucun service de sécurité autour de l''école. Situation critique depuis octobre.',
   'École-relais polyvalente résidente : logements des maîtres + panneau solaire + stocks de cantine pour 3 mois, école ouverte même en période d''alerte (protocole ministériel).',
   'verifie', '2026-11-05T05:40:00Z'),
  ('a1000000-0000-0000-0000-000000000011', null, 'Hakim Diarra', 'enseignant',
   'Boucle du Mouhoun', 'Mouhoun', 'Dédougou', 'Abalama', 'CEG Abalama', 'pedagogie', 2,
   'Absence d''outils d''évaluation diagnostique dès la 6e. Les nouveaux arrivants des écoles franco-arabes et des écoles communautaires n''ont pas le même niveau. 45% des élèves redoublent.',
   'Banque d''évaluations diagnostiques partagées par commune sur EDUGov-Bridge avec données animées par IA pour orienter classement auprès des enseignants',
   'nouveau', '2026-11-04T13:00:00Z'),
  ('a1000000-0000-0000-0000-000000000012', null, 'Marie Ouédraogo', 'inspecteur',
   'Plateau-Central', 'Ganzourgou', 'Zorgho', 'Gongzoungou', 'ÉPP Gongzoungou', 'decrochage', 3,
   'Les travaux du barrage agricole ont attiré les familles : classes surchargées. Certains enfants vivent avec un seul parent, abandon croissant en CM2 et au CQE pendant la saison maraîchère. Pas de dispositif d''encadrement.',
   'Carte scolaire dynamique par IA recalculée chaque trimestre selon les flux migratoires découverts via les signalements EDUGov-Bridge',
   'nouveau', '2026-11-06T16:30:00Z')
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
