/**
 * Shared Twilio client — lazy-imported so the `twilio` package is only loaded
 * when credentials are present. Both voice.ts and whatsapp.ts use this.
 */

import type TwilioSDK from "twilio/lib/rest/Twilio";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

export const hasTwilioCredentials = Boolean(
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN,
);

let _client: TwilioSDK | null = null;

/**
 * Returns a configured Twilio client instance, creating it on first use.
 * Throws if credentials are missing — callers should check `hasTwilioCredentials` first.
 */
export async function getTwilioClient(): Promise<TwilioSDK> {
  if (!_client) {
    const twilio = (await import("twilio")).default;
    _client = twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!) as unknown as TwilioSDK;
  }
  return _client;
}
