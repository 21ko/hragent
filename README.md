# Staffly — AI-powered interim staffing agency

An AI agent that handles interim event staffing end-to-end: it parses a job
brief, matches candidates from a database, computes fair pricing, and reaches
out to the best profiles over WhatsApp.

Built with **Next.js 14 (App Router)**, **Claude (`claude-sonnet-4-6`)**,
**Supabase**, **Twilio (voice + WhatsApp)**, and **Tailwind CSS**.

## What the agent does

1. **Parses** the job brief and **shortlists** the top 5 eligible candidates
   (or reports **"no eligible candidates"** with a reason — it never forces a
   weak match).
2. **Prices** each fairly: `base × experience × urgency`.
3. **Calls** the top candidates first, running a short gig-work HR screen
   (availability, relevant experience, hours, role-specific check). **If they
   don't pick up, it falls back to a WhatsApp message.**
4. Tracks call answers and WhatsApp OUI/NON replies live.

The UI is bilingual — toggle **FR / EN** in the top nav.

## Staffly as a tool for other agents (plugin layer)

Staffly exposes a stable, agent-facing API so another AI agent can use it as a
tool — see the in-app **Developers** page.

| Tool | Endpoint |
| --- | --- |
| `create_staffing_mission` | `POST /api/v1/missions` |
| `get_mission` (status + shortlist + **agent trace**) | `GET /api/v1/missions/{id}` |
| `list_candidates` | `GET /api/v1/candidates?role=` |
| self-discovery (OpenAI + MCP schemas) | `GET /api/v1/manifest` |

Auth: send `Authorization: Bearer $STAFFLY_API_KEY` (open in demo mode when the
env var is unset). Plug it into any MCP client (e.g. Claude Desktop) with the
bundled server:

```bash
STAFFLY_BASE_URL=http://localhost:3000 npm run mcp
```

Every mission records a step-by-step **agent activity trace** (brief parsed →
ranked → called → WhatsApp fallback → awaiting replies), shown live on the
results page and returned by `GET /api/v1/missions/{id}`.

## Runs with zero keys

The app has a mock-fallback layer, so the full **form → agent → results** loop
works immediately on `npm run dev` even without any API keys:

| Service   | With keys                       | Without keys (fallback)                          |
| --------- | ------------------------------- | ------------------------------------------------ |
| Anthropic | Claude ranks + prices + writes  | Deterministic local ranking via the same formula |
| Supabase  | Real Postgres tables            | In-memory store seeded from `lib/seed-data.ts`   |
| Twilio    | Real WhatsApp send (sandbox)    | Logs the message to the console                  |

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000
```

Fill the form → the agent shortlists + prices + "sends" WhatsApp → you land on
the results page. On the results page you can **Simuler OUI / NON** to drive the
WhatsApp status updates (which poll every 5s) without a real phone.

## Going live (optional)

1. `cp .env.local.example .env.local` and fill in the keys you have.
2. **Supabase:** run `supabase/schema.sql` in the SQL editor, then `npm run seed`.
3. **Twilio:** join the WhatsApp sandbox, set `TWILIO_WHATSAPP_NUMBER`
   (e.g. `whatsapp:+14155238886`), and point the sandbox "when a message comes
   in" webhook at `https://<your-host>/api/whatsapp`.
4. **Anthropic:** set `ANTHROPIC_API_KEY`.

Each integration activates independently — you can add Supabase without Twilio,
etc.

## Project layout

```
app/
  page.tsx                      # intake form
  results/[missionId]/page.tsx  # results: cards, pricing, polling, copy brief
  dashboard/page.tsx            # all missions
  api/agent/route.ts            # the core agent: rank -> price -> persist -> WhatsApp
  api/missions/[missionId]/route.ts  # polled by results page
  api/whatsapp/route.ts         # Twilio inbound webhook (OUI/NON)
lib/
  agent.ts        # Claude call (structured JSON) + deterministic mock
  pricing.ts      # base x exp_multiplier x urgency_multiplier
  db.ts           # Supabase-or-mock data access
  whatsapp.ts     # Twilio send (or console log)
  seed-data.ts    # 15 French candidate profiles
supabase/schema.sql
scripts/seed.ts
```
