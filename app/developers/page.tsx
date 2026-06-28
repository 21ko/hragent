"use client";

import Link from "next/link";
import { useState } from "react";

type Tab = "openai" | "mcp" | "devin";

const endpoints = [
  ["POST", "/api/v1/missions", "Créer une mission depuis un brief", "post"],
  ["GET", "/api/v1/missions/:id", "Statut + shortlist de la mission", "get"],
  ["GET", "/api/v1/candidates?role=", "Lister les candidats par rôle", "get"],
  ["POST", "/api/voice/simulate", "Simuler un entretien téléphonique", "post"],
  ["GET", "/api/v1/manifest", "Manifeste outils (OpenAI + MCP)", "get"],
] as const;

const snippets: Record<Tab, string> = {
  openai: `{
  "type": "function",
  "function": {
    "name": "staffly_create_mission",
    "description": "Crée une mission et lance l’agent.",
    "parameters": {
      "type": "object",
      "properties": {
        "role_type": { "type": "string" },
        "people_needed": { "type": "integer", "const": 5 },
        "city": { "type": "string" },
        "description": { "type": "string" }
      },
      "required": ["role_type", "people_needed", "city"]
    }
  }
}`,
  mcp: `{
  "mcpServers": {
    "staffly": {
      "command": "npx",
      "args": ["tsx", "scripts/mcp-server.ts"],
      "env": {
        "STAFFLY_BASE_URL": "http://localhost:3000"
      }
    }
  }
}`,
  devin: `Use Staffly to interview five candidates for this brief.

1. Create the mission with people_needed: 5.
2. Validate availability, rate and role fit.
3. Poll the mission until all five interviews resolve.
4. Do not show individual candidate messages while the run is active.
5. Return one ranked report only when the cohort is complete.`,
};

const curl = `curl -X POST http://localhost:3000/api/v1/missions \\
  -H "Authorization: Bearer $STAFFLY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "role_type": "event_staff",
    "people_needed": 5,
    "mission_date": "2026-07-02",
    "city": "Paris",
    "description": "Interview five people; reveal one final report"
  }'`;

export default function DevelopersPage() {
  const [tab, setTab] = useState<Tab>("openai");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(snippets[tab]);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="fixed inset-0 z-20 flex overflow-hidden bg-[#FAFAF7] font-['Hanken_Grotesk',ui-sans-serif,system-ui] text-[#14201A]">
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-[#E6E6DF] bg-white px-4 py-5 md:flex">
        <Link href="/" className="flex items-center gap-3 px-2 pb-6 pt-1">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#0E8F57] text-base font-extrabold text-white">S</span>
          <span className="text-[19px] font-bold tracking-tight">Staffly</span>
        </Link>
        <nav className="space-y-1 text-[14.5px] font-medium text-[#65726B]">
          <Nav href="/dashboard" label="Tableau de bord" />
          <Nav href="/" label="Missions" />
          <Nav href="/dashboard" label="Candidats" />
          <Nav href="/dashboard" label="Transactions" />
          <Nav href="/developers" label="Développeurs" active />
        </nav>
        <div className="mt-auto rounded-xl bg-[#E9F4EE] p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#0E8F57]">Agent-ready</p>
          <p className="mt-2 text-sm leading-5 text-[#65726B]">REST, function calling et MCP dans une seule surface.</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto w-full max-w-[860px] px-5 py-8 sm:px-10 sm:py-11">
          <div className="mb-7 flex items-center justify-between md:hidden">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#0E8F57] text-white">S</span>
              Staffly
            </Link>
            <span className="rounded-full bg-[#E9F4EE] px-3 py-1 text-xs font-semibold text-[#0E8F57]">Developers</span>
          </div>

          <span className="inline-flex rounded-full border border-[#D6EBDE] bg-[#E9F4EE] px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[.1em] text-[#0E8F57]">
            API v1 · stable
          </span>
          <h1 className="mt-[18px] max-w-2xl text-[36px] font-extrabold leading-[1.05] tracking-[-.03em] sm:text-[38px]">
            Staffly comme outil pour vos agents
          </h1>
          <p className="mt-3 max-w-[650px] text-[17px] leading-[1.55] text-[#65726B] sm:text-lg">
            Une surface REST versionnée et un manifeste lisible par machine : laissez un agent externe créer une mission, valider cinq profils et piloter les entretiens jusqu’au rapport final.
          </p>

          <div className="mb-8 mt-7 grid gap-3 sm:grid-cols-2">
            <Info label="Base URL" value="http://localhost:3000/api/v1" />
            <Info label="Authentification" value="Authorization: Bearer ••••" />
          </div>

          <SectionTitle>Endpoints</SectionTitle>
          <div className="mb-8 overflow-hidden rounded-[14px] border border-[#E6E6DF] bg-white">
            {endpoints.map(([method, path, description, kind]) => (
              <div key={path} className="grid gap-2 border-b border-[#F0F0EA] px-[18px] py-3.5 last:border-0 hover:bg-[#FBFBF9] sm:grid-cols-[48px_230px_1fr] sm:items-center sm:gap-3.5">
                <span className={`w-12 rounded-md py-1 text-center font-mono text-[11px] font-semibold ${kind === "post" ? "bg-[#E9F4EE] text-[#0E8F57]" : "bg-[#F0F0EA] text-[#65726B]"}`}>
                  {method}
                </span>
                <code className="overflow-x-auto text-[13px] font-semibold sm:text-[13.5px]">{path}</code>
                <span className="text-[13.5px] text-[#65726B]">{description}</span>
              </div>
            ))}
          </div>

          <SectionTitle>Exemple — créer une mission</SectionTitle>
          <CodePanel code={curl} className="mb-8" />

          <div className="mb-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle className="mb-0">Manifeste outils</SectionTitle>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex overflow-hidden rounded-lg border border-[#E6E6DF] bg-white">
                {(["openai", "mcp", "devin"] as Tab[]).map((item) => (
                  <button key={item} onClick={() => { setTab(item); setCopied(false); }} className={`px-3 py-2 text-xs font-semibold capitalize transition ${tab === item ? "bg-[#14201A] text-white" : "text-[#65726B] hover:text-[#14201A]"}`}>
                    {item === "openai" ? "OpenAI" : item === "mcp" ? "MCP" : "Devin"}
                  </button>
                ))}
              </div>
              <button onClick={copy} className="h-[34px] rounded-lg bg-[#0E8F57] px-3.5 text-xs font-semibold text-white transition hover:bg-[#0B7A4A]">
                {copied ? "Copié ✓" : "Copier"}
              </button>
            </div>
          </div>
          <CodePanel code={snippets[tab]} />

          <div className="mt-5 rounded-[14px] border border-[#D6EBDE] bg-[#E9F4EE] p-[18px]">
            <p className="text-sm font-bold">Résultats scellés jusqu’à la fin</p>
            <p className="mt-1.5 text-[13.5px] leading-5 text-[#65726B]">
              Configurez l’orchestrateur pour attendre les cinq statuts terminaux. Les réponses individuelles restent masquées pendant l’exécution, puis un seul rapport validé est révélé.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function Nav({ href, label, active = false }: { href: string; label: string; active?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 ${active ? "bg-[#E9F4EE] font-semibold text-[#14201A]" : "hover:bg-[#F3F3EE] hover:text-[#14201A]"}`}>
      <span className={`h-2 w-2 rounded-[3px] ${active ? "bg-[#0E8F57]" : "border-[1.5px] border-[#C3C3BA]"}`} />
      {label}
    </Link>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[13px] border border-[#E6E6DF] bg-white px-[18px] py-4">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[.06em] text-[#65726B]">{label}</p>
      <code className="break-all text-[13px] font-semibold sm:text-sm">{value}</code>
    </div>
  );
}

function SectionTitle({ children, className = "mb-3.5" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`${className} font-mono text-[13px] font-bold uppercase tracking-[.06em] text-[#65726B] sm:text-[15px]`}>{children}</h2>;
}

function CodePanel({ code, className = "" }: { code: string; className?: string }) {
  return (
    <pre className={`${className} overflow-x-auto rounded-[14px] bg-[#14201A] px-[22px] py-5 font-mono text-[12px] leading-[1.7] text-[#D8E6DD] sm:text-[13px]`}>
      <code>{code}</code>
    </pre>
  );
}
