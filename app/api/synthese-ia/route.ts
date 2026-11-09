import { NextResponse } from "next/server";
import {
  INDICATEURS_DECROCHAGE,
  type BriefDecrochage,
  type Signalement,
} from "@/types/database";
import { calculerIRD, causesPrincipales, elevesEnDanger, zonesTouchees } from "@/lib/decrochage";

// ═══════════════════════════════════════════════════════════════════
// POST /api/synthese-ia  →  « MINISTRE BRIEF IA » — DÉFI 1 DÉCROCHAGE
//
// Entrée : { signalements: Signalement[], cible?: { region, province, commune } }
// Sortie : BriefDecrochage structuré :
//   a) zones_menacees     — zones géographiques les plus menacées (7 jours)
//   b) causes_principales — causes profondes identifiées par le terrain (%)
//   c) plan_action        — plan d'action d'urgence recommandé
//
// Fournisseurs : OpenAI (GPT-4o-mini) en priorité, sinon Anthropic
// (Claude 3.5 Haiku). SANS clé API → analyse algorithmique locale
// (le jury voit toujours un résultat, la démo ne casse jamais).
// ═══════════════════════════════════════════════════════════════════

export const maxDuration = 60;

interface BodyBrief {
  signalements: Signalement[];
  cible?: { region?: string; province?: string; commune?: string };
}

/** Contexte éducatif burkinabè injecté au modèle pour ancrer l'analyse */
const CONTEXTE_NATIONAL = `Contexte : Burkina Faso, Défi n°1 — Anticipation et lutte contre le décrochage scolaire. Situation de sécurité dégradée (Sahel, Est, Centre-Nord) avec fermetures d'écoles et déplacements de populations, orpaillage artisanal qui attire les adolescents en saison sèche, transhumance, mariages et grossesses précoces en zone rurale, difficultés financières des familles (frais annexes), chocs climatiques (inondations, sécheresse). Unité monétaire : franc CFA (FCFA). Langues locales : mooré, dioula, fulfuldé. Ministères concernés : Éducation Nationale (MENAPLN) × Transition Digitale.`;

/** Fenêtre d'analyse : remontées des 7 derniers jours (sinon tout le corpus) */
function fenetreSeptJours(signalements: Signalement[]): Signalement[] {
  const limite = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recents = signalements.filter((s) => +new Date(s.created_at) >= limite);
  return recents.length > 0 ? recents : signalements;
}

function roleFr(role: Signalement["role_emetteur"]): string {
  const map: Record<string, string> = {
    enseignant: "ENSEIGNANT",
    directeur_ecole: "DIRECTEUR D'ÉCOLE",
    inspecteur: "INSPECTEUR PÉDAGOGIQUE",
    representant_parents: "REPRÉSENTANT APE/COGES",
  };
  return map[role] ?? role;
}

function constituerCorpus(data: Signalement[]): string {
  return data
    .map(
      (s, i) =>
        `[${i + 1}] Zone=${s.commune} (${s.province}/${s.region}) | Établissement=${s.etablissement} | Émetteur=${roleFr(s.role_emetteur)} | Gravité=${s.gravite}/5 | Élèves en danger=${s.nb_eleves_risque} | Signaux=${s.indicateurs.map((i) => INDICATEURS_DECROCHAGE[i]?.label ?? i).join(", ") || "non précisé"}\n   Constat : ${s.description}`
    )
    .join("\n\n");
}

function construirePrompt(n: number, eleves: number, cible?: BodyBrief["cible"]): string {
  const zone = cible?.commune
    ? `la commune de ${cible.commune} (province de ${cible.province})`
    : cible?.province
      ? `la province de ${cible.province}`
      : cible?.region
        ? `la région de ${cible.region}`
        : "tout le territoire national";

  return `Tu es le conseiller analytique du Secrétaire Général du MENAPLN (Ministère de l'Éducation Nationale du Burkina Faso). Tu reçois ${n} alertes précoces de décrochage scolaire collectées sur les 7 derniers jours par la plateforme EDUGov-Bridge auprès du terrain (enseignants, directeurs, inspecteurs, APE/COGES), concernant ${zone}. Environ ${eleves} élèves sont signalés en danger de déscolarisation dans ce corpus.

${CONTEXTE_NATIONAL}

Ta mission — rédiger un « Ministre Brief IA » de riposte au décrochage, en français, ton institutionnel sobre, précis, sans langue de bois. Les chiffres du corpus sont des données cruciales : cite-les précisément.

Structure de réponse OBLIGATOIRE (JSON strict, aucune balise markdown autour) :
{
  "zones_menacees": ["3 à 5 entrées, triées par criticité. Chaque entrée : 'Commune/Province (Région) — X élèves en danger, motif dominant : …'."],
  "causes_principales": ["3 à 5 entrées. Chaque entrée : 'Cauche — part estimée en % des alertes (ex : 60%) — zones concernées'. Base-toi STRICTEMENT sur la fréquence des signaux du corpus, n'invente aucun pourcentage."],
  "plan_action": "1 à 2 paragraphes : plan d'urgence en 3 mesures concrètes et chiffrables, adaptées au contexte burkinabè (kits scolaires, cantinage, soutien psychosocial, bourses conditionnelles, écoles-relais, convois scolaires…). Précise quelles zones cibler en premier et sous quel délai."
}

Règles :
- N'invente aucun chiffre absent du corpus.
- Trie par gravité (5 = urgence vitale, 1 = mineur).
- Style : phrases courtes, verbes d'action, vocabulaire ministériel burkinabè.

Corpus des alertes :
<<<
CORPUS_PLACEHOLDER
>>>`;
}

// ── Appel OpenAI (GPT-4o-mini) ─────────────────────────────────────
async function briefOpenAI(promptFinal: string): Promise<string> {
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
            "Tu es un analyste des politiques éducatives du Burkina Faso. Tu réponds UNIQUEMENT en JSON valide strict, sans texte autour.",
        },
        { role: "user", content: promptFinal },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

// ── Appel Anthropic (Claude 3.5 Haiku) ─────────────────────────────
async function briefAnthropic(promptFinal: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 2000,
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

// ── Plan B : analyse locale déterministe (la démo ne casse jamais) ──
function briefLocal(signalements: Signalement[]): BriefDecrochage {
  const zones = zonesTouchees(signalements, "commune").slice(0, 5);
  const causes = causesPrincipales(signalements).slice(0, 4);

  const zones_menacees = zones.map(
    (z) =>
      `${z.nom} — ${z.eleves} élève(s) en danger, ${z.alertes} alerte(s), IRD local ${z.ird}/100`
  );

  const causes_principales = causes.map(
    (c) =>
      `${c.label} — ${Math.round(c.part * 100)}% des alertes (${c.n} signalement(s))`
  );

  const top = zones[0];
  const causeDominante = causes[0];
  const gravMoy =
    signalements.length > 0
      ? signalements.reduce((a, s) => a + s.gravite, 0) / signalements.length
      : 0;
  const nbEcolesCritiques = new Set(
    signalements.filter((s) => s.gravite >= 4).map((s) => s.etablissement)
  ).size;

  const plan_action = `PLAN D'URGENCE DÉCROCHAGE — ${signalements.length} alertes analysées, ${elevesEnDanger(signalements)} élèves en danger, ${nbEcolesCritiques} école(s) en alerte critique, IRD national ${calculerIRD(signalements)}/100.
1) Sous 72 h : mission d'évaluation interministérielle sur ${top ? top.nom : "la zone la plus touchée"}${causeDominante ? `, où la cause dominante est « ${causeDominante.label.toLowerCase()} » (${Math.round(causeDominante.part * 100)}% des alertes)` : ""}.
2) Sous 7 jours : distribution ciblée de kits scolaires et activation du cantinage d'urgence dans les écoles de gravité ≥ 4/5 (gravité moyenne constatée : ${gravMoy.toFixed(1)}/5).
3) Sous 30 jours : dispositif de maintien à l'école — bourses conditionnelles pour les filles exposées aux mariages précoces, cours-relais pour les zones d'orpaillage/transhumance, soutien psychosocial dans les zones à choc sécuritaire.
Synthèse générée en mode local (calcul déterministe) : configurer une clé IA pour un brief narratif complet.`;

  return { zones_menacees, causes_principales, plan_action, fondement_ia: false };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BodyBrief;
    const signalements = body?.signalements ?? [];

    if (!Array.isArray(signalements) || signalements.length === 0) {
      return NextResponse.json({ error: "Aucune alerte décrochage à analyser." }, { status: 400 });
    }

    const fenetre = fenetreSeptJours(signalements);
    const corpus = constituerCorpus(fenetre);
    const promptFinal = construirePrompt(
      fenetre.length,
      elevesEnDanger(fenetre),
      body.cible
    ).replace("CORPUS_PLACEHOLDER", corpus.slice(0, 24000));

    // 1) OpenAI → 2) Anthropic → 3) analyse locale déterministe
    let brut: string | null = null;
    if (process.env.OPENAI_API_KEY) {
      try {
        brut = await briefOpenAI(promptFinal);
      } catch (e) {
        console.error("OpenAI:", e instanceof Error ? e.message : e);
      }
    }
    if (!brut && process.env.ANTHROPIC_API_KEY) {
      try {
        brut = await briefAnthropic(promptFinal);
      } catch (e) {
        console.error("Anthropic:", e instanceof Error ? e.message : e);
      }
    }

    if (!brut) {
      return NextResponse.json(briefLocal(fenetre));
    }

    // Nettoyage : certains modèles entourent le JSON de ```json ... ```
    const jsonNettoye = brut.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
    const parse = JSON.parse(jsonNettoye) as BriefDecrochage;

    return NextResponse.json({
      zones_menacees: Array.isArray(parse.zones_menacees) ? parse.zones_menacees.slice(0, 5) : [],
      causes_principales: Array.isArray(parse.causes_principales)
        ? parse.causes_principales.slice(0, 5)
        : [],
      plan_action: parse.plan_action ?? "",
      fondement_ia: true,
    });
  } catch (err) {
    console.error("synthese-ia (brief décrochage):", err);
    return NextResponse.json(
      {
        zones_menacees: [],
        causes_principales: [],
        plan_action: "Analyse indisponible temporairement — réessayez dans un instant.",
        fondement_ia: false,
      },
      { status: 200 }
    );
  }
}
