/**
 * Staffly MCP server — lets any MCP client (Claude Desktop, an agent runtime,
 * etc.) use Staffly as a set of tools. It bridges MCP tool calls to the running
 * Staffly /v1 HTTP API.
 *
 * Run:  STAFFLY_BASE_URL=http://localhost:3000 npx tsx scripts/mcp-server.ts
 *
 * Claude Desktop config (claude_desktop_config.json):
 *   "mcpServers": {
 *     "staffly": {
 *       "command": "npx",
 *       "args": ["tsx", "scripts/mcp-server.ts"],
 *       "env": { "STAFFLY_BASE_URL": "http://localhost:3000" }
 *     }
 *   }
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { mcpTools } from "../lib/manifest";

const BASE = process.env.STAFFLY_BASE_URL || "http://localhost:3000";
const API_KEY = process.env.STAFFLY_API_KEY || "";

function headers() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) h["Authorization"] = `Bearer ${API_KEY}`;
  return h;
}

async function callTool(name: string, args: Record<string, unknown>) {
  if (name === "create_staffing_mission") {
    const res = await fetch(`${BASE}/api/v1/missions`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(args),
    });
    return res.json();
  }
  if (name === "get_mission") {
    const res = await fetch(`${BASE}/api/v1/missions/${args.mission_id}`, {
      headers: headers(),
    });
    return res.json();
  }
  if (name === "list_candidates") {
    const res = await fetch(
      `${BASE}/api/v1/candidates?role=${encodeURIComponent(String(args.role))}`,
      { headers: headers() },
    );
    return res.json();
  }
  throw new Error(`Unknown tool: ${name}`);
}

const server = new Server(
  { name: "staffly", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: mcpTools(),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const result = await callTool(name, (args ?? {}) as Record<string, unknown>);
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[staffly-mcp] connected, proxying to ${BASE}`);
}

main().catch((err) => {
  console.error("[staffly-mcp] fatal:", err);
  process.exit(1);
});
