import { NextResponse } from "next/server";
import { addMissionEvent, updateWhatsappStatusByPhone } from "@/lib/db";
import type { WhatsappStatus } from "@/lib/types";
import { reconcileMissionProgress } from "@/lib/mission-progress";
import { validateTwilioSignature } from "@/lib/twilio-verify";

export const dynamic = "force-dynamic";

/**
 * Twilio WhatsApp inbound webhook.
 * Twilio POSTs application/x-www-form-urlencoded with `From` (whatsapp:+33...)
 * and `Body` (the candidate's reply). We match the candidate by phone and
 * record OUI / NON in the missions_candidates join table.
 *
 * Configure this URL as the "When a message comes in" webhook on your Twilio
 * WhatsApp sandbox: https://<your-host>/api/whatsapp
 */
export async function POST(req: Request) {
  const form = await parseBody(req);

  if (!validateTwilioSignature(req, form)) {
    return NextResponse.json(
      { error: "Invalid Twilio signature." },
      { status: 403 },
    );
  }
  const from = (form.get("From") || form.get("from") || "").toString();
  const body = (form.get("Body") || form.get("body") || "").toString();

  const status = classifyReply(body);
  if (from && status) {
    try {
      const updated = await updateWhatsappStatusByPhone(from, status);
      if (updated) {
        await addMissionEvent(
          updated.mission_id,
          status,
          status === "replied_yes"
            ? "Disponibilité confirmée par WhatsApp."
            : "Mission déclinée par WhatsApp.",
        );
        await reconcileMissionProgress(updated.mission_id);
      }
    } catch (err) {
      console.error("[whatsapp webhook] update failed:", err);
    }
  }

  // Reply with empty TwiML so Twilio doesn't error.
  const reply =
    status === "replied_yes"
      ? "Merci ! Nous confirmons votre disponibilité. ✅"
      : status === "replied_no"
        ? "Compris, merci pour votre réponse."
        : "Merci. Répondez OUI ou NON pour confirmer votre disponibilité.";

  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } },
  );
}

function classifyReply(body: string): WhatsappStatus | null {
  const t = body.trim().toLowerCase();
  if (/\b(oui|yes|ok|dispo|disponible|ouais)\b/.test(t)) return "replied_yes";
  if (/\b(non|no|nope|indispo|indisponible)\b/.test(t)) return "replied_no";
  return null;
}

async function parseBody(req: Request): Promise<URLSearchParams> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = (await req.json().catch(() => ({}))) as Record<string, string>;
    return new URLSearchParams(json);
  }
  const text = await req.text();
  return new URLSearchParams(text);
}
