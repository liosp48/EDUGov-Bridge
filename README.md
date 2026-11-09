# EDUGov-Bridge — Faso Édu-Data

Plateforme civique et décisionnelle **bidirectionnelle** connectant le Ministère de la Transition
Digitale et de l'Éducation aux acteurs du terrain (Enseignants, Directeurs, Inspecteurs,
APE/COGES) — Data Challenge Burkina 2026 · Volet Éducation.

## 🚀 Lancement rapide

```bash
npm install
npm run dev          # http://localhost:3000
```

Sans configuration backend, l'app tourne en **mode démo** : données réalistes du Burkina Faso
(Ouagadougou, Bobo-Dioulasso, Dori, Fada N'Gourma, Gaoua/Pô, Kaya…) afin que le pitch devant le
jury fonctionne à 100 %.

### 1 · Supabase (production)

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, exécuter intégralement `supabase/init.sql` (tables + RLS + vue KPI).
3. Copier les clés : **Project Settings → API**.

### 2 · Variables d'environnement

Copier `.env.local.example` → `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
OPENAI_API_KEY=sk-...            # GPT-4o-mini (principal)
ANTHROPIC_API_KEY=sk-ant-...     # Claude 3.5 Haiku (fallback)
```

- Supabase absent → mode démo silencieux.
- Aucune clé IA → la **synthèse locale déterministe** prend le relais : le « Ministre Brief »
  est toujours généré devant le jury.

## 🗂️ Arborescence

```
app/
  layout.tsx                # Header institutionnel + ruban Burkina
  page.tsx                  # Landing page
  terrain/page.tsx          # Formulaire adaptatif par rôle + Consultations
  ministere/page.tsx        # Dashboard KPIs + Recharts + Heatmap + Brief IA
  api/synthese-ia/route.ts  # Prompt NLP GPT-4o-mini / Claude 3.5 Haiku
components/
  ui/index.tsx              # Design system léger (style shadcn)
  geo-selector.tsx          # Région → Province → Commune → Établissement
  kpi-card.tsx
lib/
  supabase.ts               # Client + helpers (mode démo intégré)
  geographie.ts             # Découpage administratif du Burkina (13 régions)
  demo-data.ts              # 12 signalements + 3 consultations réalistes
  utils.ts
types/
  database.ts               # Interfaces complètes (profils, signalements…)
supabase/
  init.sql                  # Tables + RLS + index + vue v_stats_regions
```

## 👥 Navigateur de démo (script jury)

1. **`/`** — concept, 4 acteurs, liveness des signalements.
2. **`/terrain`** — choisir « Directeur d'école », Dori → Séno, gravité 5, soumettre.
3. Onglet **Consultations** → répondre à « Plan Cantines URGENT ».
4. **`/ministere`** — cliquer la tuile « Sahel » de la carte thermique (le dashboard se filtre).
5. Onglet **Ministre Brief** → **Générer le Brief Stratégique** :
   a) Résumé exécutif · b) Triangulation · c) Top 3 innovations.
6. Onglet **Consultations** → cibler Séno/Dori, publier : boucle bouclée.

## 🆚 Prochaines étapes (post-MVP)

- Auth Supabase (mêmes tableaux, RLS par rôle `decideur_ministere`).
- Cartographie interactive **React-Leaflet** (contours provinciaux du Burkina Faso).
- Pièces jointes photo sur signalements (Supabase Storage).
- Déclinaisons locales (mooré, dioula, fulfuldé) via IA.
