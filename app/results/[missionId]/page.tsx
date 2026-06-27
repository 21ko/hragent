"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Mission, ShortlistEntry, RoleType } from "@/lib/types";

const ROLE_LABELS: Record<RoleType, string> = {
  hostess: "Hôtesse",
  security: "Agent de sécurité",
  event_staff: "Staff événementiel",
};

interface Payload {
  mission: Mission;
  shortlist: ShortlistEntry[];
}

export default function ResultsPage({
  params,
}: {
  params: { missionId: string };
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/missions/${params.missionId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Mission introuvable.");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    }
  }, [params.missionId]);

  // Initial load + poll every 5s for WhatsApp status changes.
  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  if (error) {
    return (
      <div className="card text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/" className="mt-4 inline-block text-sm text-accent">
          ← Nouvelle mission
        </Link>
      </div>
    );
  }

  if (!data) {
    return <AgentWorking />;
  }

  const { mission, shortlist } = data;
  const top3 = shortlist.slice(0, 3);

  async function copyBrief() {
    const text = buildCopyText(mission, shortlist);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function simulateReply(phone: string, reply: "OUI" | "NON") {
    await fetch("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ From: phone, Body: reply }),
    });
    load();
  }

  return (
    <div className="space-y-8">
      {/* Mission summary */}
      <div>
        <Link href="/dashboard" className="text-sm text-muted hover:text-ink">
          ← Tableau de bord
        </Link>
        <div className="card mt-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="badge bg-accent/10 text-accent">
                {ROLE_LABELS[mission.role_type]}
              </span>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                {mission.people_needed} personne(s) · {mission.city}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {mission.mission_date}
                {mission.start_time && ` · ${mission.start_time}`}
                {mission.end_time && `–${mission.end_time}`} · budget max{" "}
                {mission.max_budget_per_person}€/pers.
              </p>
            </div>
            <StatusPill status={mission.status} />
          </div>
          {mission.mission_brief_fr && (
            <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-ink">
              {mission.mission_brief_fr}
            </p>
          )}
        </div>
      </div>

      {/* Candidate cards */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Top 3 contactés par WhatsApp
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {top3.map((entry) => (
            <CandidateCard
              key={entry.id}
              entry={entry}
              onSimulate={simulateReply}
            />
          ))}
        </div>
        {shortlist.length > 3 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted hover:text-ink">
              Voir les {shortlist.length - 3} autres candidats shortlistés
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {shortlist.slice(3).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm"
                >
                  <span>
                    <span className="font-medium">#{e.rank}</span>{" "}
                    {e.candidate.name}
                  </span>
                  <span className="font-semibold">{e.suggested_rate}€</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Pricing explained */}
      <div className="card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Tarification expliquée
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink">
          {mission.pricing_summary}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <FormulaBox
            title="Multiplicateur d'expérience"
            rows={[
              ["< 1 an", "×1.0"],
              ["1–3 ans", "×1.15"],
              ["3 ans et +", "×1.3"],
            ]}
          />
          <FormulaBox
            title="Multiplicateur d'urgence"
            rows={[
              ["< 24h", "×1.3"],
              ["24–72h", "×1.15"],
              ["> 72h", "×1.0"],
            ]}
          />
        </div>
        <p className="mt-3 text-xs text-muted">
          tarif = tarif de base × multiplicateur d&apos;expérience ×
          multiplicateur d&apos;urgence
        </p>
      </div>

      {/* Copy brief */}
      <div className="flex justify-end">
        <button onClick={copyBrief} className="btn-primary">
          {copied ? "Copié ✓" : "Copier le récapitulatif"}
        </button>
      </div>
    </div>
  );
}

function CandidateCard({
  entry,
  onSimulate,
}: {
  entry: ShortlistEntry;
  onSimulate: (phone: string, reply: "OUI" | "NON") => void;
}) {
  const { candidate } = entry;
  return (
    <div className="card flex flex-col">
      <div className="flex items-center justify-between">
        <span className="badge bg-surface text-muted">#{entry.rank}</span>
        <WhatsappBadge status={entry.whatsapp_status} />
      </div>
      <h3 className="mt-3 text-lg font-semibold">{candidate.name}</h3>
      <div className="mt-1 flex flex-wrap gap-1.5">
        <span className="badge bg-surface text-muted">
          {candidate.years_experience} ans
        </span>
        <span className="badge bg-surface text-muted">{candidate.city}</span>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink">
        {entry.rationale}
      </p>
      <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
        <div>
          <div className="text-2xl font-semibold">{entry.suggested_rate}€</div>
          <div className="text-xs text-muted">tarif suggéré / jour</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">
            {Math.round(entry.confidence_score * 100)}%
          </div>
          <div className="text-xs text-muted">confiance</div>
        </div>
      </div>
      {entry.whatsapp_status === "sent" && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onSimulate(candidate.phone, "OUI")}
            className="flex-1 rounded-lg border border-line py-1.5 text-xs text-muted hover:border-green-500 hover:text-green-600"
          >
            Simuler OUI
          </button>
          <button
            onClick={() => onSimulate(candidate.phone, "NON")}
            className="flex-1 rounded-lg border border-line py-1.5 text-xs text-muted hover:border-red-500 hover:text-red-600"
          >
            Simuler NON
          </button>
        </div>
      )}
    </div>
  );
}

function WhatsappBadge({ status }: { status: ShortlistEntry["whatsapp_status"] }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "En attente", cls: "bg-surface text-muted" },
    sent: { label: "WhatsApp envoyé", cls: "bg-blue-50 text-blue-600" },
    replied_yes: { label: "A répondu OUI", cls: "bg-green-50 text-green-600" },
    replied_no: { label: "A répondu NON", cls: "bg-red-50 text-red-600" },
    failed: { label: "Échec d'envoi", cls: "bg-amber-50 text-amber-600" },
  };
  const s = map[status] ?? map.pending;
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

function StatusPill({ status }: { status: Mission["status"] }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending_outreach: { label: "Préparation", cls: "bg-surface text-muted" },
    awaiting_replies: {
      label: "En attente de réponses",
      cls: "bg-blue-50 text-blue-600",
    },
    complete: { label: "Complète", cls: "bg-green-50 text-green-600" },
  };
  const s = map[status] ?? map.pending_outreach;
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

function FormulaBox({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="text-xs font-medium text-muted">{title}</div>
      <div className="mt-2 space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm">
            <span className="text-ink">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentWorking() {
  const steps = [
    "Analyse du brief de mission…",
    "Recherche des candidats dans la base…",
    "Classement par adéquation…",
    "Calcul des tarifs justes…",
    "Envoi des messages WhatsApp…",
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % steps.length), 700);
    return () => clearInterval(id);
  }, [steps.length]);
  return (
    <div className="card text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
      <p className="mt-4 text-sm text-muted">{steps[i]}</p>
    </div>
  );
}

function buildCopyText(mission: Mission, shortlist: ShortlistEntry[]): string {
  const lines = [
    `MISSION — ${ROLE_LABELS[mission.role_type]}`,
    `${mission.people_needed} personne(s) · ${mission.city} · ${mission.mission_date} ${mission.start_time ?? ""}-${mission.end_time ?? ""}`,
    `Budget max: ${mission.max_budget_per_person}€/pers./jour`,
    "",
    mission.mission_brief_fr ?? "",
    "",
    "SHORTLIST:",
    ...shortlist.map(
      (e) =>
        `#${e.rank} ${e.candidate.name} — ${e.suggested_rate}€/jour — ${Math.round(
          e.confidence_score * 100,
        )}% — ${e.rationale}`,
    ),
  ];
  return lines.join("\n");
}
