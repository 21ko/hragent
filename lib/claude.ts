/**
 * Shared Claude API call utility — extracts the common pattern of:
 * 1. Creating an Anthropic client
 * 2. Calling with structured output (json_schema)
 * 3. Extracting the text block
 * 4. Parsing JSON
 *
 * Used by lib/agent.ts and lib/cv-parser.ts.
 */

import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
export const usingClaude = Boolean(ANTHROPIC_API_KEY);

const MODEL = "claude-sonnet-4-6";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  }
  return _client;
}

export interface ClaudeCallOptions {
  /** JSON schema for structured output. */
  schema: object;
  /** The user message content (string or content blocks array). */
  content: string | Anthropic.MessageCreateParamsNonStreaming["messages"][0]["content"];
  /** Max tokens for the response (default 4096). */
  maxTokens?: number;
}

/**
 * Call Claude with a structured JSON schema and return the parsed result.
 * Throws if no text block is returned or if the API call fails.
 */
export async function callClaude<T>(options: ClaudeCallOptions): Promise<T> {
  const { schema, content, maxTokens = 4096 } = options;
  const client = getClient();

  const params = {
    model: MODEL,
    max_tokens: maxTokens,
    output_config: {
      format: { type: "json_schema", schema },
    },
    messages: [{ role: "user", content }],
  };

  const response = await client.messages.create(
    params as unknown as Anthropic.MessageCreateParamsNonStreaming,
  );

  const block = response.content.find((item) => item.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("No text block in Claude response.");
  }
  return JSON.parse(block.text) as T;
}
