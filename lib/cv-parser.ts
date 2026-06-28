import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import type { Candidate, CandidateProfile } from "./types";
import { normalizePhone } from "./db";
import { baseRateForRole } from "./pricing";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-6";
const CACHE_ROOT = join(process.cwd(), ".staffly", "cv-cache");

const CV_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    phone: {
      type: "string",
      description: "E.164, e.g. +33612345678",
    },
    role_type: {
      type: "string",
      description:
        "free text; map to hostess|security|event_staff when obvious",
    },
    years_experience: { type: "number" },
    city: { type: "string" },
    languages: { type: "array", items: { type: "string" } },
    day_rate: {
      type: ["integer", "null"],
      description: "null if absent",
    },
    notes: {
      type: "string",
      description: "1-line relevant-experience summary",
    },
    confidence: {
      type: "number",
      description: "0-1 extraction confidence",
    },
  },
  required: [
    "name",
    "role_type",
    "years_experience",
    "city",
    "languages",
  ],
} as const;

export interface ValidatedCv {
  candidate: Omit<Candidate, "id" | "created_at"> | null;
  needsReview: boolean;
  reason?: string;
  fromCache: boolean;
}

export async function parseAndValidateCv(text: string): Promise<ValidatedCv> {
  const normalizedText = text.trim();
  if (normalizedText.length < 20) {
    return {
      candidate: null,
      needsReview: true,
      reason: "CV text is too short to parse reliably.",
      fromCache: false,
    };
  }

  const hash = createHash("sha256").update(normalizedText).digest("hex");
  const cachePath = join(CACHE_ROOT, `${hash}.json`);
  let profile: CandidateProfile;
  let fromCache = false;

  if (existsSync(cachePath)) {
    profile = JSON.parse(readFileSync(cachePath, "utf8")) as CandidateProfile;
    fromCache = true;
  } else {
    profile = ANTHROPIC_API_KEY
      ? await parseWithClaude(normalizedText)
      : mockParseCv(normalizedText);
    mkdirSync(dirname(cachePath), { recursive: true });
    writeFileSync(cachePath, JSON.stringify(profile, null, 2), "utf8");
  }

  return validateProfile(profile, fromCache);
}

export async function parseScannedPdf(buffer: Buffer): Promise<ValidatedCv> {
  if (!ANTHROPIC_API_KEY) {
    return {
      candidate: null,
      needsReview: true,
      reason: "Scanned PDF requires review when Claude is not configured.",
      fromCache: false,
    };
  }
  const hash = createHash("sha256").update(buffer).digest("hex");
  const cachePath = join(CACHE_ROOT, `${hash}.json`);
  let profile: CandidateProfile;
  let fromCache = false;
  if (existsSync(cachePath)) {
    profile = JSON.parse(readFileSync(cachePath, "utf8")) as CandidateProfile;
    fromCache = true;
  } else {
    profile = await parseScannedWithClaude(buffer);
    mkdirSync(dirname(cachePath), { recursive: true });
    writeFileSync(cachePath, JSON.stringify(profile, null, 2), "utf8");
  }
  return validateProfile(profile, fromCache);
}

async function parseWithClaude(text: string): Promise<CandidateProfile> {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const params = {
    model: MODEL,
    max_tokens: 2048,
    output_config: {
      format: { type: "json_schema", schema: CV_SCHEMA as object },
    },
    messages: [
      {
        role: "user",
        content: `Extract one staffing candidate from this CV.

Read the CV by sections: basics/contact, work experience, education, skills,
languages and projects. Return only the schema. Keep role_type as useful free
text, except map obvious event roles to hostess, security or event_staff.
Never invent a phone number, city, rate or experience.

CV TEXT:
${text.slice(0, 20_000)}`,
      },
    ],
  };
  const response = await client.messages.create(
    params as unknown as Anthropic.MessageCreateParamsNonStreaming,
  );
  const block = response.content.find((item) => item.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("No text block in CV parser response.");
  }
  return JSON.parse(block.text) as CandidateProfile;
}

async function parseScannedWithClaude(
  buffer: Buffer,
): Promise<CandidateProfile> {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const params = {
    model: MODEL,
    max_tokens: 2048,
    output_config: {
      format: { type: "json_schema", schema: CV_SCHEMA as object },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: buffer.toString("base64"),
            },
          },
          {
            type: "text",
            text: "Extract the candidate using the requested schema. Never invent missing contact details.",
          },
        ],
      },
    ],
  };
  const response = await client.messages.create(
    params as unknown as Anthropic.MessageCreateParamsNonStreaming,
  );
  const block = response.content.find((item) => item.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("No text block in scanned CV parser response.");
  }
  return JSON.parse(block.text) as CandidateProfile;
}

function validateProfile(
  raw: CandidateProfile,
  fromCache: boolean,
): ValidatedCv {
  const phone = normalizePhone(String(raw.phone ?? ""));
  if (!/^\+\d{8,15}$/.test(phone)) {
    return {
      candidate: null,
      needsReview: true,
      reason: "Missing or invalid E.164 phone number.",
      fromCache,
    };
  }

  const role = clean(raw.role_type) || "Profil polyvalent";
  const confidence = clamp01(Number(raw.confidence ?? 0.5));
  const parsedRate = Number(raw.day_rate);
  const dayRate =
    Number.isInteger(parsedRate) && parsedRate >= 50 && parsedRate <= 2000
      ? parsedRate
      : baseRateForRole(role);

  const candidate: Omit<Candidate, "id" | "created_at"> = {
    name: clean(raw.name) || "Candidat à vérifier",
    phone,
    role_type: role,
    years_experience: clamp(Number(raw.years_experience), 0, 60),
    day_rate: dayRate,
    city: clean(raw.city) || "À vérifier",
    languages: Array.isArray(raw.languages)
      ? [...new Set(raw.languages.map(clean).filter(Boolean))].slice(0, 12)
      : [],
    availability_status: confidence < 0.6 ? "review" : "available",
    notes: clean(raw.notes) || "Profil importé depuis un CV.",
  };
  return {
    candidate,
    needsReview: confidence < 0.6,
    fromCache,
  };
}

function mockParseCv(text: string): CandidateProfile {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const phone =
    text.match(/(?:\+\d[\d ()-]{7,18}\d)/)?.[0] ??
    text.match(/0[1-9](?:[\s.-]?\d{2}){4}/)?.[0] ??
    "";
  const years = Number(
    text.match(/(\d+(?:[.,]\d+)?)\s*(?:ans|années|years?)/i)?.[1]?.replace(
      ",",
      ".",
    ) ?? 0,
  );
  const role = inferRole(text);
  const city =
    text.match(
      /\b(Paris|Lyon|Marseille|Bordeaux|Lille|Toulouse|Nantes|Nice|Strasbourg)\b/i,
    )?.[1] ?? "";
  const languageMap: Array<[RegExp, string]> = [
    [/\bfran[cç]ais\b/i, "Français"],
    [/\b(?:anglais|english)\b/i, "Anglais"],
    [/\b(?:espagnol|spanish)\b/i, "Espagnol"],
    [/\b(?:allemand|german)\b/i, "Allemand"],
    [/\b(?:italien|italian)\b/i, "Italien"],
  ];
  const languages = languageMap
    .filter(([pattern]) => pattern.test(text))
    .map(([, language]) => language);
  const dayRate = text.match(/(\d{2,4})\s*(?:€|eur).{0,12}(?:jour|day|tj)/i);
  const evidence = [phone, city, role, years > 0 ? String(years) : ""].filter(
    Boolean,
  ).length;

  return {
    name: lines[0]?.slice(0, 100) || "Candidat à vérifier",
    phone,
    role_type: role,
    years_experience: years,
    city,
    languages,
    day_rate: dayRate ? Number(dayRate[1]) : null,
    notes: `Expérience détectée: ${role}, ${years || 0} an(s).`,
    confidence: Math.min(0.9, 0.45 + evidence * 0.12),
  };
}

function inferRole(text: string): string {
  if (/s[ée]curit[ée]|security|ssiapp/i.test(text)) return "security";
  if (/h[oô]te(?:sse)?|accueil|hostess/i.test(text)) return "hostess";
  if (/[ée]v[ée]nement|event staff|manutention/i.test(text))
    return "event_staff";
  const title = text.match(
    /(?:poste|m[ée]tier|profession|title)\s*[:\-]\s*([^\n]{3,100})/i,
  )?.[1];
  return clean(title) || "Profil polyvalent";
}

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}
