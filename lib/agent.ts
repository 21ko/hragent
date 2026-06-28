import Anthropic from "@anthropic-ai/sdk";
import type { AgentResult, Candidate, JobBrief } from "./types";
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
        },
        required: [
          "candidate_id",
          "name",
          "rank",
          "rationale",
          "suggested_rate",
          "confidence_score",
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
5. Donne un "confidence_score" entre 0 et 1.
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
      return {
        ...s,
        name: c.name,
        rank: i + 1,
        suggested_rate: computeRate(c, hours),
        confidence_score: clamp01(s.confidence_score),
      };
    });
  const no_candidates_reason =
    shortlist.length === 0
      ? result.no_candidates_reason ||
        "Aucun candidat éligible n'a été trouvé pour cette mission."
      : "";
  return { ...result, shortlist, no_candidates_reason };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.7;
  return Math.max(0, Math.min(1, n));
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
      let score = 0;
      if (c.city.toLowerCase() === brief.city.trim().toLowerCase()) score += 3;
      score += 2; // available (guaranteed by the eligibility gate)
      score += Math.min(c.years_experience, 6) * 0.4;
      const rate = computeRate(c, hours);
      if (rate <= brief.max_budget_per_person) score += 2;
      else score -= 1.5;
      if (c.languages.length >= 2) score += 0.5;
      return { c, score, rate };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const shortlist = scored.map(({ c, score, rate }, i) => {
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
      confidence_score: Math.max(0.4, Math.min(0.97, 0.55 + score * 0.05)),
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
