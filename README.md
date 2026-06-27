# Staffly — AI-powered interim staffing agency

An AI agent that handles interim event staffing end-to-end: it parses a job
brief, matches candidates from a database, computes fair pricing, and reaches
out to the best profiles over WhatsApp.

Built with **Next.js 14 (App Router)**, **Claude (`claude-sonnet-4-6`)**,
**Supabase**, **Twilio WhatsApp**, and **Tailwind CSS**.

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
