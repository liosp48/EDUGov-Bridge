import { NextResponse } from "next/server";
import {
  INDICATEURS_DECROCHAGE,
  type RapportDecrochage,
  type Signalement,
} from "@/types/database";
import { calculerIRD, causesPrincipales, elevesEnDanger, zonesTouchees } from "@/lib/decrochage";

// ═══════════════════════════════════════════════════════════════════
// POST /api/rapport-ia  →  RAPPORT D'ÉTUDE IA « MINISTRE BRIEF — DÉCROCHAGE »
//
// Entrée : { signalements: Signalement[], cible?: { region, province, commune } }
// Sortie : RapportDecrochage structuré en 9 sections (lecture ministérielle),
//   avec priorité partielle aux DESCRIPTIONS LIBRES du terrain.
//
// La clé OpenAI est lue UNIQUEMENT côté serveur (process.env OPENAI_API_KEY) :
// elle n'est jamais exposée au navigateur. Sans clé → analyse locale
// déterministe (la démo ne casse jamais).
// ═══════════════════════════════════════════════════════════════════

export const maxDuration = 120;

interface BodyRapport {
  signalements: Signalement[];
  cible?: { region?: string; province?: string; commune?: string };
}

const CONTEXTE_NATIONAL = `Contexte : Burkina Faso, Défi n°1 — Anticipation et lutte contre le décrochage scolaire. Référentiel administratif 2025 : 17 régions à toponymes endogènes (Bankui/Dédougou, Djôrô/Gaoua, Goulmou/Fada N'Gourma, Guiriko/Bobo-Dioulasso, Kadiogo/Ouagadougou, Kuilsé/Kaya, Liptako/Dori, Nando/Koudougou, Nakambé/Tenkodogo, Nazinon/Manga, Oubri/Ziniaré, Sirba/Bogandé, Soum/Djibo, Tannounyan/Banfora, Tapoa/Diapaga, Sourou/Tougan, Yaadga/Ouahigouya). Situation de sécurité dégradée (Liptako, Soum, Goulmou, Sirba, Tapoa, Kuilsé, Yaadga) : fermetures d'écoles, déplacements de populations, abandon silencieux des registres. Orpaillage artisanal attirant les adolescents en saison sèche, transhumance, mariages et grossesses précoces en zone rurale, difficultés financières des familles (frais annexes, CQEB), chocs climatiques (inondations, sécheresse). Unité monétaire : franc CFA (FCFA). Langues locales : mooré, dioula, fulfuldé. Ministères concernés : MENAPLN × Transition Digitale.`;

const SECTION_VIDE =
  "Aucune donnée disponible dans le corpus pour cette section — ne rien inventer, indiquer explicitement le manque et le périmètre nécessaire avant prochaine campagne de remontées.";

/** Fenêtre d'analyse : remontées des 7 derniers jours (sinon tout le corpus) */
function fenetreSeptJours(signalements: Signalement[]): Signalement[] {
  const limite = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recents = signalements.filter((s) => +new Date(s.created_at) >= limite);
  return recents.length > 0 ? recents : signalements;
}

function roleFr(role: Signalement["role_emetteur"]): string {
  const map: Record<string, string> = {
    enseignant: "Enseignant",
    directeur_ecole: "Directeur d'école",
    inspecteur: "Inspecteur pédagogique",
    representant_parents: "Représentant APE/COGES",
  };
  return map[role] ?? role;
}

/** Corpus : la DESCRIPTION LIBRE est la source qualitative prioritaire (verbatim intégral) */
function constituerCorpus(data: Signalement[]): string {
  return data
    .map((s, i) => {
      const signaux =
        s.indicateurs.map((i) => INDICATEURS_DECROCHAGE[i]?.label ?? i).join(", ") ||
        "non précisé";
      return [
        `[${i + 1}] Zone : ${s.commune} (province de ${s.province}, région ${s.region})`,
        `Établissement : ${s.etablissement || "non précisé"} | Émetteur : ${s.emetteur} (${roleFr(s.role_emetteur)})`,
        `Date : ${s.created_at} | Gravité : ${s.gravite}/5 | Élèves en danger : ${s.nb_eleves_risque} | Signaux cochés : ${signaux}`,
        `DESCRIPTION LIBRE DU TERRAIN (source qualitative à exploiter en priorité, citation possible verbatim) : « ${s.description} »`,
      ].join("\n");
    })
    .join("\n\n");
}

function construirePrompt(n: number, eleves: number, gravMoy: number, cible?: BodyRapport["cible"]): string {
  const zone = cible?.commune
    ? `la commune de ${cible.commune} (province de ${cible.province}, région ${cible.region})`
    : cible?.province
      ? `la province de ${cible.province}`
      : cible?.region
        ? `la région de ${cible.region}`
        : "l'ensemble du territoire national (17 régions officielles 2025)";

  return `Tu es analyste principal au sein du Secrétariat Général du MENAPLN (Ministère de l'Éducation Nationale du Burkina Faso). Tu dois produire un VÉRITABLE RAPPORT D'ÉTUDE (« Rapport d'étude IA — Décrochage scolaire ») destiné au cabinet ministériel : plusieurs pages, ton institutionnel précis, sans langue de bois, en français.

PÉRIMÈTRE : ${zone}. Corpus : ${n} alertes précoces de décrochage collectées sur 7 jours par EDUGov-Bridge auprès du terrain (enseignants, directeurs, inspecteurs, représentants APE/COGES), soit environ ${eleves} élèves signalés en danger, gravité moyenne ${gravMoy.toFixed(1)}/5.

${CONTEXTE_NATIONAL}

MÉTHODE — LA DESCRIPTION LIBRE EST LA MATIÈRE PREMIÈRE DU RAPPORT :
- Les champs « DESCRIPTION LIBRE DU TERRAIN » (verbatim des enseignants et familles) sont la principale source qualitative : identifie les causes évoquées, difficultés économiques et sociales, insécurité et déplacements de populations, absences répétées et abandons, situations spécifiques des filles, témoignages et préoccupations des enseignants, facteurs locaux aggravants.
- Croise ces observations avec les données structurées : région, province, commune, établissement, nombre d'élèves, gravité, signaux cochés.
- DISTINGUE IMPÉRATIVEMENT : les FAITS rapportés (à citer entre guillemets, en exclusive attribution au terrain), les OBSERVATIONS récurrentes, et les HYPOTHÈSES d'analyse (signalées comme telles).
- N'INVENTE AUCUN chiffre absent du corpus ; n'utilise que les valeurs qui y figurent.
- Un chiffre n'est affirmé que si tu peux le calculer sur le corpus ; sinon écris « non quantifiable dans le corpus ».

STRUCTURE DE RÉPONSE OBLIGATOIRE (JSON strict, aucune balise markdown autour) :
{
  "resume_executif": "3 à 5 paragraphes denses : situation, principaux constats chiffrés du corpus, gravité, urgence.",
  "contexte_general": "2 à 3 paragraphes : zones (régions/provinces/communes) et établissements concernés, profil des émetteurs, période.",
  "analyse_terrain": "3 à 4 paragraphes approfondis exploitant les descriptions libres : cite les témoignages entre guillemets (« … »), regroupe les récurrences, distingue faits rapportés / observations / hypothèses d'analyse (marque les hypothèses par « hypothèse : »).",
  "facteurs_descolarisation": ["7 à 10 entrées classées par importance décroissante. Chaque entrée : 'Catégorie — cause précise (+ éléments d'appui du corpus, sans chiffrage inventé)'."],
  "analyse_geographique": "2 à 3 paragraphes : régions, provinces et communes les plus concernées SELON LES DONNÉES RÉELLEMENT PRÉSENTES dans le corpus ; mentionne les zones sans signal (couverture incomplète).",
  "populations_vulnerables": "2 à 3 paragraphes : catégories d'élèves les plus exposées (filles, adolescents en orpaillage/transhumance, déplacés internes, élèves de zones à conflit, niveaux de classe touchés…), appuyées uniquement sur le corpus.",
  "tendances_signaux_alerte": ["5 à 8 entrées : récurrences, convergences (ex : orpaillage + insécurité), situations nécessitant une intervention immédiate. Chaque entrée une phrase."],
  "recommandations_strategiques": ["6 à 8 entrées : actions concrètes, chiffrables quand le corpus le permet, adaptées au contexte burkinabè (kits scolaires, cantinage, bourses conditionnelles filles, écoles-relais, convois scolaires, soutien psychosocial, protection sociale, interface DRH/DREN/APLEN), avec zone cible et horizon (72 h / 7 jours / 30 jours / trimestre)."],
  "conclusion_perspectives": "2 paragraphes : priorités d'intervention immédiates et perspectives de suivi (prochaines campagnes de remontées, indicateurs à surveiller)."
}

Rappels : JSON valide ; pas de markdown ; sections sans données = ecris « Aucune donnée disponible dans le corpus pour cette section ».

CORPUS DES ALERTES (verbatim des signalements) :
«««
CORPUS_PLACEHOLDER
»»»`;
}

// ── Appel OpenAI (côté serveur uniquement, clé jamais exposée) ─────
async function rapportOpenAI(promptFinal: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Tu es un analyste principal des politiques éducatives du Burkina Faso (MENAPLN). Tu rédiges des rapports d'étude institutionnels rigoureux. Tu réponds UNIQUEMENT en objet JSON valide, sans texte autour.",
        },
        { role: "user", content: promptFinal },
      ],
      max_tokens: 4000,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

// ── Plan B : Anthropic (Claude 3.5 Haiku) ──────────────────────────
async function rapportAnthropic(promptFinal: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 4000,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: `${promptFinal}\n\n(Réponds UNIQUEMENT avec l'objet JSON, sans backticks ni explication.)`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

// ── Plan C : analyse locale déterministe (la démo ne casse jamais) ──
function rapportLocal(signalements: Signalement[], cible?: BodyRapport["cible"]): RapportDecrochage {
  const zones = zonesTouchees(signalements, "commune").slice(0, 6);
  const causes = causesPrincipales(signalements);
  const eleves = elevesEnDanger(signalements);
  const ird = calculerIRD(signalements);
  const gravMoy = signalements.length
    ? signalements.reduce((a, s) => a + s.gravite, 0) / signalements.length
    : 0;
  const ecoles = new Set(
    signalements.filter((s) => s.gravite >= 4).map((s) => s.etablissement)
  );

  const zonesTxt = zones
    .map((z) => `${z.nom} (${z.alertes} alerte(s), ${z.eleves} élèves, IRD ${z.ird}/100)`)
    .join(" ; ");

  return {
    resume_executif: `Le corpus comporte ${signalements.length} alerte(s) de décrochage${cible?.region ? ` sur ${cible.region}` : ''}, totalisant ${eleves} élèves signalés en danger, gravité moyenne ${gravMoy.toFixed(1)}/5 et IRD ${ird}/100. ${ecoles.size} établissement(s) sont en alerte de gravité critique (≥ 4/5). ${causes[0] ? `La cause la plus fréquente du terrain est « ${causes[0].label.toLowerCase()} » (${Math.round(causes[0].part * 100)} % des alertes).` : ""} Analyse générée en mode local (calcul déterministe) : configurer la clé IA pour un rapport narratif complet.`,
    contexte_general: SECTION_VIDE,
    analyse_terrain: SECTION_VIDE,
    facteurs_descolarisation: causes
      .slice(0, 7)
      .map((c) => `${c.label} — motifs présents dans ${c.n} alerte(s) (${Math.round(c.part * 100)} %) — ${c.n > 1 ? "récurrence notable" : "signal isolé à surveiller"}`),
    analyse_geographique: zones.length
      ? `Zones les plus touchées selon les alertes disponibles : ${zonesTxt}. Zones sans signal : couverture de remontée incomplète, à confirmer par prochaine campagne.`
      : SECTION_VIDE,
    populations_vulnerables: SECTION_VIDE,
    tendances_signaux_alerte: causes
      .filter((c) => c.n >= 2)
      .slice(0, 8)
      .map((c) => `Signal récurrent : ${c.label.toLowerCase()} (${c.n} alerte(s))`),
    recommandations_strategiques: [
      `Sous 72 h — mission d'évaluation sur ${zones[0]?.nom ?? "la zone la plus touchée"}${causes[0] ? ` où domine « ${causes[0].label.toLowerCase()} »` : ""}.`,
      "Sous 7 jours — kits scolaires et cantinage d'urgence dans les établissements de gravité ≥ 4/5.",
      "Sous 30 jours — dispositif de maintien ciblé : bourses conditionnelles filles, cours-relais orpaillage/transhumance, soutien psychosocial zones à choc sécuritaire.",
    ],
    conclusion_perspectives: `Priorité : traiter les ${ecoles.size} établissement(s) en alerte critique et couvrir les zones sans signal. Générer un nouveau rapport dès l'arrivée de nouvelles alertes pour maintenir l'analyse à jour.`,
    fondement_ia: false,
  };
}

// ── POST ───────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BodyRapport;
    const signalements = body?.signalements ?? [];

    if (!Array.isArray(signalements) || signalements.length === 0) {
      return NextResponse.json({ error: "Aucune alerte décrochage à analyser." }, { status: 400 });
    }

    const fenetre = fenetreSeptJours(signalements);
    const gravMoy =
      fenetre.reduce((a, s) => a + s.gravite, 0) / fenetre.length;

    const promptFinal = construirePrompt(
      fenetre.length,
      elevesEnDanger(fenetre),
      gravMoy,
      body.cible
    ).replace("CORPUS_PLACEHOLDER", constituerCorpus(fenetre).slice(0, 60000));

    // 1) OpenAI → 2) Anthropic → 3) analyse locale déterministe
    let brut: string | null = null;
    if (process.env.OPENAI_API_KEY) {
      try {
        brut = await rapportOpenAI(promptFinal);
      } catch (e) {
        console.error("rapport-ia OpenAI:", e instanceof Error ? e.message : e);
      }
    }
    if (!brut && process.env.ANTHROPIC_API_KEY) {
      try {
        brut = await rapportAnthropic(promptFinal);
      } catch (e) {
        console.error("rapport-ia Anthropic:", e instanceof Error ? e.message : e);
      }
    }

    if (!brut) {
      return NextResponse.json(rapportLocal(fenetre, body.cible));
    }

    // Certains modèles entourent le JSON de ```json … ```
    const jsonNettoye = brut.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
    const parse = JSON.parse(jsonNettoye) as Partial<RapportDecrochage>;
    const chaine = (v: unknown, def = "") =>
      typeof v === "string" && v.trim() ? v : def;
    const liste = (v: unknown) =>
      Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).slice(0, 10) : [];

    return NextResponse.json({
      resume_executif: chaine(parse.resume_executif, SECTION_VIDE),
      contexte_general: chaine(parse.contexte_general, SECTION_VIDE),
      analyse_terrain: chaine(parse.analyse_terrain, SECTION_VIDE),
      facteurs_descolarisation: liste(parse.facteurs_descolarisation),
      analyse_geographique: chaine(parse.analyse_geographique, SECTION_VIDE),
      populations_vulnerables: chaine(parse.populations_vulnerables, SECTION_VIDE),
      tendances_signaux_alerte: liste(parse.tendances_signaux_alerte),
      recommandations_strategiques: liste(parse.recommandations_strategiques),
      conclusion_perspectives: chaine(parse.conclusion_perspectives, SECTION_VIDE),
      fondement_ia: true,
    } satisfies RapportDecrochage);
  } catch (err) {
    console.error("rapport-ia:", err);
    return NextResponse.json(
      {
        resume_executif:
          "Analyse temporairement indisponible (service IA surchargé). Réessayez dans un instant ou relancez une nouvelle génération.",
        contexte_general: SECTION_VIDE,
        analyse_terrain: SECTION_VIDE,
        facteurs_descolarisation: [],
        analyse_geographique: SECTION_VIDE,
        populations_vulnerables: SECTION_VIDE,
        tendances_signaux_alerte: [],
        recommandations_strategiques: [],
        conclusion_perspectives: SECTION_VIDE,
        fondement_ia: false,
      } satisfies RapportDecrochage,
      { status: 200 }
    );
  }
}
