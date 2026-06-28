# CV Import — handoff spec

Goal: recruiter drops CV files (PDF / .docx) → structured `Candidate` rows appear
in the candidate space. Built to be **token-cheap**: extract text locally, send
only text to Claude. Modeled on `interviewstreet/hiring-agent` (PyMuPDF → text →
LLM → Pydantic), mapped to our TS stack.

## Why text, not PDF blocks
Sending a PDF as a Claude vision `document` block ≈ 3–6k tokens/CV. Local text
extraction ≈ 400–800 tokens/CV (~6–8× cheaper) and cacheable. Only fall back to
a vision block for the rare scanned/image PDF (`looksScanned()` in
[lib/cv-extract.ts](../lib/cv-extract.ts)).

## Pipeline
```
upload → extractCvText() → cache check → Claude structured output → validate → dedupe → insert
         (lib/cv-extract)   (hash→json)   (lib/cv-parser, TODO)      (lib/cv-parser)   (lib/db)
```

## Status
- [x] `lib/cv-extract.ts` — local PDF/DOCX→text (deps: `unpdf`, `mammoth`).
- [ ] `lib/cv-parser.ts` — text→Candidate via Claude structured output + cache + validation.
- [ ] `app/api/candidates/import/route.ts` — multipart upload endpoint.
- [ ] `insertCandidates()` in `lib/db.ts` — bulk insert/update (mirror `insertMissionCandidates`).
- [ ] Candidate space UI (the deferred worker page) lists imported candidates.

## Next steps for the implementing agent

### 1. Install deps
```
npm i unpdf mammoth
```

### 2. `lib/cv-parser.ts`
Reuse the EXACT structured-output pattern from [lib/agent.ts](../lib/agent.ts)
(`output_config.format`, model `claude-sonnet-4-6`, cast
`params as unknown as Anthropic.MessageCreateParamsNonStreaming`). Keep a mock
fallback when `ANTHROPIC_API_KEY` is unset, like the rest of the app.

Schema (matches `Candidate` in [lib/types.ts](../lib/types.ts)):
```ts
const CV_SCHEMA = {
  type: "object",
  properties: {
    name:             { type: "string" },
    phone:            { type: "string", description: "E.164, e.g. +33612345678" },
    role_type:        { type: "string", description: "free text; map to hostess|security|event_staff when obvious" },
    years_experience: { type: "number" },
    city:             { type: "string" },
    languages:        { type: "array", items: { type: "string" } },
    day_rate:         { type: ["integer", "null"], description: "null if absent" },
    notes:            { type: "string", description: "1-line relevant-experience summary" },
    confidence:       { type: "number", description: "0-1 extraction confidence" },
  },
  required: ["name", "role_type", "years_experience", "city", "languages"],
};
```

Validation layer (deterministic — this is the algorithm, do NOT trust the model blindly):
- `phone` → run `normalizePhone()` ([lib/db.ts](../lib/db.ts)) + E.164 regex `^\+\d{8,15}$`; drop if invalid.
- `day_rate` null/absurd → default from role base rate in [lib/pricing.ts](../lib/pricing.ts).
- `confidence < 0.6` → mark `availability_status: "review"` instead of auto-publishing.
- Dedupe → `getCandidateByPhone()`; update existing vs. insert new.

### 3. Cache (token saver)
Key on `sha256(text)`; store JSON under `.staffly/cv-cache/<hash>.json` (mirror
the local-db pattern in [lib/store.ts](../lib/store.ts)). Identical re-upload =
zero LLM tokens.

### 4. `app/api/candidates/import/route.ts`
```
POST multipart (files[]) → for each: detectKind → extractCvText → looksScanned?
  → parseCv (cached) → validate → insertCandidates
Return { imported, skipped, needsReview } summary.
```
Process per-CV (clean error isolation) with a small concurrency cap. Surface
`needsReview` rows in the UI rather than silently dropping — judges like an agent
that flags its own uncertainty.

## Constraints to preserve
- Mock fallback everywhere (runs keyless).
- Don't regress free-text `role_type`.
- Candidate/worker UI was intentionally deferred — this unblocks it.

---

# Native integration of `interviewstreet/hiring-agent` (NO third party)

Decision: the repo is Python (PyMuPDF + Ollama/Gemini). We do **not** run it as a
service or add a Python dependency. We **re-implement its concepts in our TS
`lib/`**, one stack, one deploy. It touches two surfaces.

## Concept → our code mapping
| hiring-agent (Python) | Port to (TS, in-repo) | Notes |
|---|---|---|
| `pymupdf_rag.py` (PDF→markdown) | `lib/cv-extract.ts` (`unpdf`) | done — text, not vision blocks |
| Jinja section templates (basics/work/education/skills/projects) | section prompts inside `lib/cv-parser.ts` | one structured-output call, sectioned schema |
| `models.py` `JSONResume` (Pydantic) | `CandidateProfile` type in `lib/types.ts` | superset of `Candidate` (adds work/skills/education) |
| GitHub enrichment + cache | optional `lib/enrich.ts` (skip for demo) | only if a CV has a GitHub/portfolio URL |
| candidate scoring/ranking | **fold into `lib/agent.ts`** (see Surface 2) | this is the agent improvement |

## Surface 1 — Candidate intake (the deferred worker side)
Pipeline from the CV Import section above. The hiring-agent contribution here is
**section-based extraction**: parse not just `Candidate` fields but a richer
`CandidateProfile` (work history, skills, education) so the agent has more signal
to rank on. Store the extra fields in `candidates.notes` (JSON) or new columns.

## Surface 2 — Improve OUR staffing agent (the important one)
Today `lib/agent.ts` shortlists with heuristics (city / experience / languages) +
Claude. Adopt hiring-agent's **structured fit-scoring** so ranking is explainable:

1. Extend `OUTPUT_SCHEMA` shortlist items with a `fit` breakdown instead of a
   single opaque score:
   ```ts
   fit: {
     role_match:   number,  // 0-1  role/title alignment
     experience:   number,  // 0-1  years vs. mission seniority
     location:     number,  // 0-1  same city / commutable
     language:     number,  // 0-1  required languages covered
     availability: number,  // 0-1  free on mission_date
   }
   // confidence_score := weighted mean (weights configurable per role)
   ```
2. In `sanitize()`, **recompute** `confidence_score` from the breakdown (don't
   trust the model's single number) — same defensive pattern we already use to
   re-derive rates.
3. Surface the breakdown on the results card (`app/results/[missionId]`) as small
   bars — turns "why this candidate" into a visible, defensible answer. Strong
   Agentic-Depth signal for judges.
4. `mockAgent` must produce the same `fit` shape so it runs keyless.

This is the integration that "improves the agent": same scoring rigor the
hiring-agent applies to engineering candidates, applied to gig-staffing fit.

## Build order (cheapest first, for a token-light follow-up agent)
1. Surface 2 step 1–2 (schema + `sanitize` recompute) — pure logic, no new deps, big demo payoff.
2. Surface 2 step 3 (results bars) — UI only.
3. Surface 1 (`cv-parser.ts` + import route) — needs `npm i unpdf mammoth`.
4. `CandidateProfile` richer fields + enrichment — last, optional.
