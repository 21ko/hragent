"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

type Tab = "openai" | "mcp" | "devin" | "voice";

const code: Record<Tab, string> = {
  openai: `{"type":"function","function":{"name":"staffly_create_mission","description":"Create and run a Staffly mission","parameters":{"type":"object","properties":{"role_type":{"type":"string"},"people_needed":{"type":"integer"},"city":{"type":"string"}},"required":["role_type","people_needed","city"]}}}`,
  mcp: `{"mcpServers":{"staffly":{"command":"npx","args":["tsx","scripts/mcp-server.ts"],"env":{"STAFFLY_BASE_URL":"http://localhost:3000"}}}}`,
  devin: `Use Staffly to interview five candidates.
1. POST the mission to /api/v1/missions.
2. Poll until all five interviews resolve.
3. Keep individual replies sealed during execution.
4. Return one ranked report when the cohort is complete.`,
  voice: `POST /api/voice/simulate
Content-Type: application/json

{
  "missionId": "<mission-id>",
  "candidateId": "<candidate-id>",
  "outcome": "answered"
}

# Use "no_answer" to test the automatic WhatsApp fallback.`,
};

export default function DevelopersPage() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const [tab, setTab] = useState<Tab>("devin");
  const [copied, setCopied] = useState(false);
  const endpoints = [
    ["POST", "/api/v1/missions", fr ? "Créer une mission" : "Create a mission"],
    ["GET", "/api/v1/missions/:id", fr ? "Statut et shortlist" : "Status and shortlist"],
    ["GET", "/api/v1/candidates?role=", fr ? "Lister les candidats" : "List candidates"],
    ["POST", "/api/voice/simulate", fr ? "Tester la couche vocale" : "Test the voice layer"],
    ["GET", "/api/v1/manifest", fr ? "Manifeste d’outils" : "Tool manifest"],
  ];

  async function copy() {
    await navigator.clipboard.writeText(code[tab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-[900px]">
      <span className="badge border border-accent/20 bg-accent-tint font-mono text-accent">API v1 · stable</span>
      <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-[-.04em]">
        {fr ? "Staffly comme outil pour vos agents" : "Staffly as a tool for your agents"}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-7 text-muted">
        {fr ? "Une couche d’orchestration pour les agents externes, reliée à un véritable agent vocal d’entretien." : "An orchestration layer for external agents, connected to a real voice interview agent."}
      </p>

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        <LayerCard
          eyebrow="DEVIN LAYER"
          title={fr ? "Orchestrateur externe" : "External orchestrator"}
          body={fr ? "Devin crée la mission, surveille les cinq entretiens, gère les états terminaux et ne restitue qu’un rapport final scellé." : "Devin creates the mission, monitors five interviews, handles terminal states and returns only one sealed final report."}
          steps={fr ? ["Créer via /v1", "Interroger le statut", "Récupérer le rapport"] : ["Create through /v1", "Poll mission status", "Retrieve final report"]}
        />
        <LayerCard
          eyebrow="VOICE LAYER"
          title={fr ? "Entretien vocal natif" : "Native voice screening"}
          body={fr ? "Staffly appelle d’abord, collecte la réponse parlée via Twilio, puis bascule automatiquement sur WhatsApp en cas de silence ou d’échec." : "Staffly calls first, captures spoken answers through Twilio, then automatically falls back to WhatsApp after silence or failure."}
          steps={fr ? ["Questions par rôle", "Transcription et statut", "Fallback WhatsApp"] : ["Role-aware questions", "Transcript and status", "WhatsApp fallback"]}
        />
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <Info label="Base URL" value="/api/v1" />
        <Info label={fr ? "Mode local" : "Local mode"} value={fr ? "Mock vocal déterministe · aucune clé" : "Deterministic voice mock · no keys"} />
      </div>

      <h2 className="mb-3 mt-9 font-mono text-xs font-bold uppercase tracking-wider text-muted">Endpoints</h2>
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {endpoints.map(([method, path, description]) => (
          <div key={path} className="grid gap-2 border-b border-line px-5 py-4 last:border-0 sm:grid-cols-[55px_250px_1fr]">
            <span className={`w-fit rounded-md px-2 py-1 font-mono text-[10px] font-bold ${method === "POST" ? "bg-accent-tint text-accent" : "bg-surface text-muted"}`}>{method}</span>
            <code className="text-sm font-semibold">{path}</code>
            <p className="text-sm text-muted">{description}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 mt-9 flex items-center justify-between">
        <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-muted">{fr ? "Intégrations agentiques" : "Agent integrations"}</h2>
        <button onClick={copy} className="btn-primary py-2">{copied ? (fr ? "Copié ✓" : "Copied ✓") : (fr ? "Copier" : "Copy")}</button>
      </div>
      <div className="flex w-fit overflow-hidden rounded-t-xl border border-b-0 border-line">
        {(["openai", "mcp", "devin", "voice"] as Tab[]).map(item => (
          <button key={item} onClick={() => setTab(item)} className={`px-4 py-2 text-xs font-bold uppercase ${tab === item ? "bg-ink text-white" : "bg-white text-muted"}`}>{item}</button>
        ))}
      </div>
      <pre className="overflow-x-auto rounded-b-2xl rounded-tr-2xl bg-ink p-6 font-mono text-xs leading-6 text-[#d8e6dd]"><code>{code[tab]}</code></pre>

      <div className="mt-5 rounded-2xl border border-accent/20 bg-accent-tint p-5">
        <p className="font-bold">{fr ? "Résultats scellés jusqu’à la fin" : "Results sealed until completion"}</p>
        <p className="mt-2 text-sm leading-6 text-muted">{fr ? "L’orchestrateur attend les cinq statuts terminaux. Le vocal gère les appels, puis WhatsApp récupère automatiquement les non-réponses." : "The orchestrator waits for five terminal states. Voice handles calls, then WhatsApp automatically recovers non-responses."}</p>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="card"><p className="font-mono text-[10px] uppercase tracking-wider text-muted">{label}</p><code className="mt-2 block break-all text-sm font-semibold">{value}</code></div>;
}

function LayerCard({ eyebrow, title, body, steps }: { eyebrow: string; title: string; body: string; steps: string[] }) {
  return (
    <article className="rounded-2xl border border-line bg-white p-5">
      <p className="font-mono text-[10px] font-bold tracking-[.12em] text-accent">{eyebrow}</p>
      <h2 className="mt-2 text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {steps.map((step, index) => <span key={step} className="rounded-lg bg-surface px-2.5 py-1.5 text-[11px] font-semibold"><span className="mr-1 text-accent">{index + 1}</span>{step}</span>)}
      </div>
    </article>
  );
}
