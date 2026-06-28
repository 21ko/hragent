/**
 * Machine-readable tool manifest for the Staffly agent plugin layer.
 * An external agent can self-discover these tools and call the /v1 API.
 * Exposed at GET /api/v1/manifest and reused by the MCP server.
 */

const briefSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    role_type: {
      type: "string",
      enum: ["hostess", "security", "event_staff"],
      description: "The kind of staff needed.",
    },
    people_needed: { type: "integer", description: "How many people." },
    mission_date: { type: "string", description: "Mission date, YYYY-MM-DD." },
    start_time: { type: "string", description: "Start time, HH:MM." },
    end_time: { type: "string", description: "End time, HH:MM." },
    city: { type: "string", description: "City of the mission." },
    max_budget_per_person: {
      type: "integer",
      description: "Max budget per person per day, in EUR.",
    },
    description: { type: "string", description: "Free-text event description." },
  },
  required: ["role_type", "mission_date", "city", "max_budget_per_person"],
} as const;

export interface ToolDef {
  name: string;
  description: string;
  input_schema: object;
  http: { method: string; path: string };
}

export const TOOLS: ToolDef[] = [
  {
    name: "create_staffing_mission",
    description:
      "Run the Staffly agent on a job brief: it shortlists and prices candidates, then calls them (HR screen) and falls back to WhatsApp. Returns a mission_id, status, and how many candidates were shortlisted. If nobody is eligible, status is 'no_candidates' with a reason.",
    input_schema: briefSchema,
    http: { method: "POST", path: "/api/v1/missions" },
  },
  {
    name: "get_mission",
    description:
      "Read mission progress and the agent trace. Candidate identities, rates, and ranking remain sealed until all interviews reach a terminal outcome.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        mission_id: { type: "string", description: "The mission id." },
      },
      required: ["mission_id"],
    },
    http: { method: "GET", path: "/api/v1/missions/{mission_id}" },
  },
  {
    name: "list_candidates",
    description: "List the available candidate pool for a given role.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        role: {
          type: "string",
          enum: ["hostess", "security", "event_staff"],
        },
      },
      required: ["role"],
    },
    http: { method: "GET", path: "/api/v1/candidates?role={role}" },
  },
];

/** OpenAI / Anthropic tool-calling format. */
export function openaiTools() {
  return TOOLS.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

/** MCP tool-list format. */
export function mcpTools() {
  return TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.input_schema,
  }));
}

export function manifest(baseUrl: string) {
  return {
    name: "staffly",
    description:
      "Autonomous interim event-staffing agent. Tools to create a staffing mission, read its result + agent trace, and list candidates.",
    version: "1.0.0",
    base_url: baseUrl,
    auth: {
      type: "bearer",
      note: "Send the key via Authorization: Bearer <key> or x-api-key. Open in demo mode when STAFFLY_API_KEY is unset.",
    },
    endpoints: TOOLS.map((t) => ({ ...t.http, name: t.name })),
    openai_tools: openaiTools(),
    mcp_tools: mcpTools(),
  };
}
