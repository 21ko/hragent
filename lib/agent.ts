import Anthropic from "@anthropic-ai/sdk";
import type {
  AgentResult,
  Candidate,
  FitBreakdown,
  JobBrief,
} from "./types";
import { roleLabel } from "./types";
import {
  computeRate,
  expBand,
  hoursUntilMission,
  urgencyBand,
  urgencyMultiplier,
} from "./pricing";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
export const usingClaude = Boolean(ANTHROPIC_API_KEY);

const MODEL = "claude-sonnet-4-6";

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    shortlist: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          candidate_id: { type: "string" },
          name: { type: "string" },
          rank: { type: "integer" },
          rationale: { type: "string" },
          suggested_rate: { type: "integer" },
          confidence_score: { type: "number" },
          fit: {
            type: "object",
            additionalProperties: false,
            properties: {
              role_match: { type: "number" },
              experience: { type: "number" },
              location: { type: "number" },
              language: { type: "number" },
              availability: { type: "number" },
            },
            required: [
              "role_match",
              "experience",
              "location",
              "language",
              "availability",
            ],
          },
        },
        required: [
          "candidate_id",
          "name",
          "rank",
          "rationale",
          "suggested_rate",
          "confidence_score",
          "fit",
        ],
      },
    },
    pricing_summary: { type: "string" },
    mission_brief_fr: { type: "string" },
    no_candidates_reason: { type: "string" },
  },
  required: [
    "shortlist",
    "pricing_summary",
    "mission_brief_fr",
    "no_candidates_reason",
  ],
} as const;

function buildPrompt(brief: JobBrief, candidates: Candidate[]): string {
  const hours = hoursUntilMission(brief.mission_date, brief.start_time);
  const roster = candidates
    .map(
      (c) =>
        `- id:${c.id} | ${c.name} | ${c.years_experience} ans d'expérience | base ${c.day_rate}€/jour | ${c.city} | langues: ${c.languages.join(", ")} | dispo: ${c.availability_status} | ${c.notes}`,
    )
    .join("\n");

  return `Tu es un agent de recrutement intérimaire. Voici une demande de mission d'un client, et une liste de candidats disponibles pour ce type de poste.

# Demande de mission
- Poste: ${roleLabel(brief.role_type)} (${brief.role_type})
- Nombre de personnes: ${brief.people_needed}
- Date: ${brief.mission_date} de ${brief.start_time} à ${brief.end_time}
- Ville: ${brief.city}
- Budget max par personne par jour: ${brief.max_budget_per_person}€
- Délai avant la mission: ~${Math.round(hours)} heures (urgence: ${urgencyBand(hours)})
- Description: ${brief.description}

# Candidats disponibles
${roster}

# Ta mission
1. Évalue l'éligibilité. Un candidat n'est PAS éligible s'il est indisponible, ou si son tarif calculé dépasse nettement le budget (plus de 20%), ou s'il ne correspond pas du tout au besoin (mauvaise ville sans alternative, profil inadapté).
   - Si AUCUN candidat n'est éligible, renvoie "shortlist": [] (liste vide) et explique pourquoi dans "no_candidates_reason" (en français, ex: "Aucun candidat disponible à Paris dans le budget de 80€"). Ne force jamais un mauvais match.
   - Sinon, "no_candidates_reason" doit être une chaîne vide "".
2. Classe les 5 meilleurs candidats ÉLIGIBLES par adéquation (rank 1 = meilleur). Privilégie la même ville, l'expérience pertinente, les langues utiles, et la disponibilité.
3. Pour CHAQUE candidat retenu, calcule un tarif juste avec la formule:
   suggested_rate = base_rate × exp_multiplier × urgency_multiplier
   - exp_multiplier: 1.0 (<1 an), 1.15 (1-3 ans), 1.3 (3 ans et +)
   - urgency_multiplier: 1.3 (<24h), 1.15 (24-72h), 1.0 (>72h)
   Arrondis à l'euro le plus proche.
4. Rédige une "rationale" d'1-2 phrases en français expliquant pourquoi ce candidat convient.
5. Donne un objet "fit" entre 0 et 1 pour role_match, experience, location, language et availability. Donne aussi un "confidence_score", qui sera vérifié côté serveur.
6. Rédige "pricing_summary": un court paragraphe expliquant la logique tarifaire (multiplicateurs appliqués).
7. Rédige "mission_brief_fr": un résumé propre et professionnel de la mission, prêt à envoyer au client.

Utilise exactement les "id" fournis comme candidate_id.`;
}

export async function runAgent(
  brief: JobBrief,
  candidates: Candidate[],
): Promise<AgentResult> {
  if (usingClaude) {
    try {
      return await runClaudeAgent(brief, candidates);
    } catch (err) {
      console.error("[agent] Claude call failed, falling back to mock:", err);
      return mockAgent(brief, candidates);
    }
  }
  return mockAgent(brief, candidates);
}

async function runClaudeAgent(
  brief: JobBrief,
  candidates: Candidate[],
): Promise<AgentResult> {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  // `output_config` (structured outputs) isn't in this SDK version's types yet,
  // so build the params untyped and cast for the call.
  const params = {
    model: MODEL,
    max_tokens: 4096,
    output_config: {
      format: { type: "json_schema", schema: OUTPUT_SCHEMA as object },
    },
    messages: [{ role: "user", content: buildPrompt(brief, candidates) }],
  };

  const response = await client.messages.create(
    params as unknown as Anthropic.MessageCreateParamsNonStreaming,
  );

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new Error("No text block in Claude response");
  }
  const parsed = JSON.parse(text.text) as AgentResult;
  return sanitize(parsed, brief, candidates);
}

/**
 * Guard against the model returning unknown ids or skipped fields, and cap to 5.
 * Also re-derives suggested_rate from the canonical formula so the UI and the
 * "pricing explained" panel never disagree with what was sent.
 */
function sanitize(
  result: AgentResult,
  brief: JobBrief,
  candidates: Candidate[],
): AgentResult {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const hours = hoursUntilMission(brief.mission_date, brief.start_time);
  const shortlist = result.shortlist
    .filter((s) => byId.has(s.candidate_id))
    .slice(0, 5)
    .map((s, i) => {
      const c = byId.get(s.candidate_id)!;
      const fit = computeTrustedFit(c, brief);
      return {
        ...s,
        name: c.name,
        rank: i + 1,
        suggested_rate: computeRate(c, hours),
        fit,
        confidence_score: fitConfidence(fit, brief.role_type),
      };
    });
  const no_candidates_reason =
    shortlist.length === 0
      ? result.no_candidates_reason ||
        "Aucun candidat éligible n'a été trouvé pour cette mission."
      : "";
  return { ...result, shortlist, no_candidates_reason };
}

// ---------- Deterministic mock (no API key needed) ----------

function mockAgent(brief: JobBrief, candidates: Candidate[]): AgentResult {
  const hours = hoursUntilMission(brief.mission_date, brief.start_time);
  const urgency = urgencyBand(hours);

  // Eligibility gate: must be available and not blow far past the budget.
  const budgetCeiling = brief.max_budget_per_person * 1.2;
  const eligible = candidates.filter((c) => {
    if (c.availability_status !== "available") return false;
    if (computeRate(c, hours) > budgetCeiling) return false;
    return true;
  });

  if (eligible.length === 0) {
    return {
      shortlist: [],
      pricing_summary: "",
      mission_brief_fr: buildBrief(brief),
      no_candidates_reason: buildNoCandidatesReason(brief, candidates, hours),
    };
  }

  const scored = eligible
    .map((c) => {
      const fit = computeTrustedFit(c, brief);
      let score = fitConfidence(fit, brief.role_type);
      const rate = computeRate(c, hours);
      if (rate > brief.max_budget_per_person) score -= 0.1;
      return { c, score, rate, fit };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const shortlist = scored.map(({ c, score, rate, fit }, i) => {
    const cityMatch = c.city.toLowerCase() === brief.city.trim().toLowerCase();
    const withinBudget = rate <= brief.max_budget_per_person;
    const rationale =
      `${c.years_experience} ans d'expérience, basé à ${c.city}${cityMatch ? " (même ville que la mission)" : ""}. ` +
      `${c.notes.split(".")[0]}.` +
      (withinBudget ? "" : " Tarif au-dessus du budget cible.");
    return {
      candidate_id: c.id,
      name: c.name,
      rank: i + 1,
      rationale,
      suggested_rate: rate,
      fit,
      confidence_score: clamp01(score),
    };
  });

  const pricing_summary =
    `Tarifs calculés via base × multiplicateur d'expérience × multiplicateur d'urgence. ` +
    `Urgence de la mission: ${urgency} (×${urgencyMultiplier(hours)}). ` +
    `Les candidats expérimentés (${expBand(3)}) reçoivent ×1.3, les profils 1-3 ans ×1.15, et les débutants ×1.0.`;

  return {
    shortlist,
    pricing_summary,
    mission_brief_fr: buildBrief(brief),
    no_candidates_reason: "",
  };
}

const DEFAULT_FIT_WEIGHTS: FitBreakdown = {
  role_match: 0.3,
  experience: 0.2,
  location: 0.2,
  language: 0.1,
  availability: 0.2,
};

const ROLE_FIT_WEIGHTS: Record<string, FitBreakdown> = {
  security: {
    role_match: 0.35,
    experience: 0.2,
    location: 0.1,
    language: 0.05,
    availability: 0.3,
  },
  hostess: {
    role_match: 0.25,
    experience: 0.15,
    location: 0.15,
    language: 0.25,
    availability: 0.2,
  },
};

export function fitConfidence(fit: FitBreakdown, role: string): number {
  const weights = ROLE_FIT_WEIGHTS[normalize(role)] ?? DEFAULT_FIT_WEIGHTS;
  return round2(
    (Object.keys(weights) as Array<keyof FitBreakdown>).reduce(
      (sum, key) => sum + clamp01(fit[key]) * weights[key],
      0,
    ),
  );
}

/** Re-derive every fit dimension from trusted candidate and mission facts. */
export function computeTrustedFit(
  candidate: Candidate,
  brief: JobBrief,
): FitBreakdown {
  const candidateText = normalize(
    `${candidate.role_type} ${candidate.notes}`,
  );
  const roleTokens = meaningfulTokens(brief.role_type);
  const matchedRoleTokens = roleTokens.filter((token) =>
    candidateText.includes(token),
  ).length;
  const exactRole =
    normalize(candidate.role_type) === normalize(brief.role_type);
  const role_match = exactRole
    ? 1
    : roleTokens.length
      ? 0.2 + 0.8 * (matchedRoleTokens / roleTokens.length)
      : 0.5;

  const requiredYears = inferRequiredYears(
    `${brief.role_type} ${brief.description}`,
  );
  const experience =
    requiredYears <= 0
      ? 1
      : Math.min(1, Math.max(0.2, candidate.years_experience / requiredYears));

  const location =
    normalize(candidate.city) === normalize(brief.city) ? 1 : 0.35;

  const requiredLanguages = inferRequiredLanguages(brief.description);
  const candidateLanguages = (candidate.languages ?? []).map(normalize);
  const language =
    requiredLanguages.length === 0
      ? 1
      : requiredLanguages.filter((lang) => candidateLanguages.includes(lang))
          .length / requiredLanguages.length;

  const availability =
    candidate.availability_status === "available"
      ? 1
      : candidate.availability_status === "review"
        ? 0.5
        : 0;

  return {
    role_match: round2(role_match),
    experience: round2(experience),
    location: round2(location),
    language: round2(language),
    availability: round2(availability),
  };
}

function inferRequiredYears(text: string): number {
  const normalized = normalize(text);
  const explicit = normalized.match(/(\d+)\s*(?:ans|annees|years?)/);
  if (explicit) return Math.max(1, Number(explicit[1]));
  if (/\b(?:senior|lead|expert)\b/.test(normalized)) return 5;
  if (/\b(?:junior|debutant)\b/.test(normalized)) return 1;
  return 2;
}

function inferRequiredLanguages(text: string): string[] {
  const normalized = normalize(text);
  const supported = ["francais", "anglais", "espagnol", "allemand", "italien"];
  return supported.filter((language) => normalized.includes(language));
}

function meaningfulTokens(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function normalize(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function round2(value: number): number {
  return Math.round(clamp01(value) * 100) / 100;
}

function buildBrief(brief: JobBrief): string {
  return (
    `Mission ${roleLabel(brief.role_type)} — ${brief.people_needed} personne(s) recherchée(s) le ${brief.mission_date} ` +
    `de ${brief.start_time} à ${brief.end_time} à ${brief.city}. ` +
    `Budget cible: ${brief.max_budget_per_person}€/personne/jour. ${brief.description}`
  ).trim();
}

/** Explains, in French, why nobody was eligible — based on what filtered them out. */
function buildNoCandidatesReason(
  brief: JobBrief,
  candidates: Candidate[],
  hours: number,
): string {
  const available = candidates.filter((c) => c.availability_status === "available");
  if (available.length === 0) {
    return `Aucun profil pour ${roleLabel(brief.role_type).toLowerCase()} n'est disponible le ${brief.mission_date}.`;
  }
  const cheapest = Math.min(...available.map((c) => computeRate(c, hours)));
  if (cheapest > brief.max_budget_per_person * 1.2) {
    return `Aucun candidat disponible ne rentre dans le budget de ${brief.max_budget_per_person}€/jour à ${brief.city} (tarif minimum disponible: ${cheapest}€). Augmentez le budget ou la flexibilité.`;
  }
  return `Aucun candidat éligible pour ${roleLabel(brief.role_type)} à ${brief.city} le ${brief.mission_date}.`;
}
