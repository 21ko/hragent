"use client";

import { useState } from "react";

const ENDPOINTS = [
  {
    method: "POST",
    path: "/api/v1/missions",
    tool: "create_staffing_mission",
    desc: "Run the agent on a brief: shortlist, price, call, WhatsApp fallback.",
  },
  {
    method: "GET",
    path: "/api/v1/missions/{id}",
    tool: "get_mission",
    desc: "Status + priced shortlist + per-candidate outreach + agent trace.",
  },
  {
    method: "GET",
    path: "/api/v1/candidates?role=",
    tool: "list_candidates",
    desc: "Available candidate pool for a role.",
  },
  {
    method: "GET",
    path: "/api/v1/manifest",
    tool: "—",
    desc: "Self-discovery: OpenAI/Anthropic tool schemas + MCP tool list.",
  },
];

const CURL = `curl -X POST http://localhost:3000/api/v1/missions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $STAFFLY_API_KEY" \\
  -d '{
    "role_type": "hostess",
    "people_needed": 3,
    "mission_date": "2026-07-02",
    "start_time": "18:00",
    "end_time": "23:00",
    "city": "Paris",
    "max_budget_per_person": 200,
    "description": "Brand launch, VIP welcome"
  }'`;

const MCP_CONFIG = `{
  "mcpServers": {
    "staffly": {
      "command": "npx",
      "args": ["tsx", "scripts/mcp-server.ts"],
      "env": { "STAFFLY_BASE_URL": "http://localhost:3000" }
    }
  }
}`;

export default function DevelopersPage() {
  return (
    <div className="space-y-8">
      <div>
        <span className="badge bg-accent/10 text-accent">Software for agents</span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Staffly as a tool for your agent
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          Staffly isn&apos;t just an app — it&apos;s an autonomous staffing agent
          other agents can call. Hand it a brief and it shortlists, prices, phones
          candidates, and falls back to WhatsApp, then reports back a structured
          result with a full activity trace. Use the REST tools directly, or plug
          in the MCP server.
        </p>
      </div>

      {/* Endpoints */}
      <div className="card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Tools / endpoints
        </h2>
        <div className="mt-4 divide-y divide-line">
          {ENDPOINTS.map((e) => (
            <div key={e.path} className="flex flex-wrap items-baseline gap-3 py-3">
              <span
                className={`badge font-mono ${
                  e.method === "POST"
                    ? "bg-green-50 text-green-600"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                {e.method}
              </span>
              <code className="text-sm text-ink">{e.path}</code>
              <span className="font-mono text-xs text-accent">{e.tool}</span>
              <span className="w-full text-sm text-muted sm:w-auto sm:flex-1">
                {e.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      <CodeBlock title="Create a mission (REST)" code={CURL} />
      <CodeBlock
        title="Plug into an MCP client (e.g. Claude Desktop)"
        code={MCP_CONFIG}
      />

      <div className="card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Self-discovery
        </h2>
        <p className="mt-3 text-sm text-muted">
          Point your agent at the manifest to load the tools automatically — it
          returns both OpenAI/Anthropic function schemas and an MCP tool list.
        </p>
        <a
          href="/api/v1/manifest"
          target="_blank"
          rel="noreferrer"
          className="btn-primary mt-4 inline-flex"
        >
          View /api/v1/manifest →
        </a>
      </div>
    </div>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {title}
        </h2>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded-lg border border-line px-3 py-1 text-xs text-muted hover:text-ink"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-ink p-4 text-xs leading-relaxed text-white/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}
