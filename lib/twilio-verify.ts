import { createHmac } from "crypto";

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

/**
 * Validates that an inbound request actually came from Twilio by checking the
 * `X-Twilio-Signature` header against the request URL + body params.
 *
 * When TWILIO_AUTH_TOKEN is not set (demo/mock mode), validation is skipped so
 * the local dev flow still works.
 *
 * @see https://www.twilio.com/docs/usage/security#validating-requests
 */
export function validateTwilioSignature(
  req: Request,
  params: URLSearchParams,
): boolean {
  if (!TWILIO_AUTH_TOKEN) return true;

  const signature = req.headers.get("x-twilio-signature") || "";
  if (!signature) return false;

  const url = buildCanonicalUrl(req);
  const sorted = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}${v}`)
    .join("");

  const expected = createHmac("sha1", TWILIO_AUTH_TOKEN)
    .update(url + sorted)
    .digest("base64");

  return timingSafeEqual(signature, expected);
}

/**
 * For body-less GET/POST requests authenticated via query params (e.g. TwiML
 * URLs), Twilio signs the full URL including query string with no body params.
 */
export function validateTwilioSignatureUrl(req: Request): boolean {
  if (!TWILIO_AUTH_TOKEN) return true;

  const signature = req.headers.get("x-twilio-signature") || "";
  if (!signature) return false;

  const url = buildCanonicalUrl(req);
  const expected = createHmac("sha1", TWILIO_AUTH_TOKEN)
    .update(url)
    .digest("base64");

  return timingSafeEqual(signature, expected);
}

function buildCanonicalUrl(req: Request): string {
  const url = new URL(req.url);
  const forwarded = req.headers.get("x-forwarded-proto");
  const proto = forwarded || url.protocol.replace(":", "");
  const host = req.headers.get("host") || url.host;
  return `${proto}://${host}${url.pathname}${url.search}`;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to avoid leaking length via timing.
    const buf = Buffer.from(a);
    Buffer.from(b.padEnd(a.length, "\0")).copy(buf);
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}
