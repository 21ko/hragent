"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Mission, ShortlistEntry } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

interface Payload {
  mission: Mission;
  shortlist: ShortlistEntry[];
}

export default function ResultsPage({
  params,
}: {
  params: { missionId: string };
}) {
  const { t } = useI18n();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/missions/${params.missionId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Not found.");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error.");
    }
  }, [params.missionId]);

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
          ← {t.results.newMission}
        </Link>
      </div>
    );
  }

  if (!data) return <AgentWorking steps={t.results.working} />;

  const { mission, shortlist } = data;
  const top3 = shortlist.slice(0, 3);

  async function copyBrief() {
    await navigator.clipboard.writeText(buildCopyText(mission, shortlist));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function simulateCall(
    candidateId: string,
    outcome: "answered" | "no_answer",
  ) {
    await fetch("/api/voice/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ missionId: mission.id, candidateId, outcome }),
    });
    load();
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
          ← {t.results.back}
        </Link>
        <div className="card mt-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="badge bg-accent/10 text-accent">
                {t.roles[mission.role_type]}
              </span>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                {mission.people_needed} {t.results.people} · {mission.city}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {mission.mission_date}
                {mission.start_time && ` · ${mission.start_time}`}
                {mission.end_time && `–${mission.end_time}`} ·{" "}
                {t.results.budgetMax} {mission.max_budget_per_person}€
              </p>
            </div>
            <StatusPill status={mission.status} label={t.missionStatus[mission.status]} />
          </div>
          {mission.mission_brief_fr && (
            <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-ink">
              {mission.mission_brief_fr}
            </p>
          )}
        </div>
      </div>

      {/* No eligible candidates */}
      {mission.status === "no_candidates" && (
        <div className="card border-amber-200 bg-amber-50/40 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-amber-100 text-lg">
            ⚠️
          </div>
          <h2 className="mt-3 text-lg font-semibold">
            {t.results.noCandidatesTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            {mission.no_candidates_reason}
          </p>
          <Link href="/" className="btn-primary mt-5 inline-flex">
            {t.results.newMission}
          </Link>
        </div>
      )}

      {/* Candidate cards */}
      {top3.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {t.results.outreachTitle}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {top3.map((entry) => (
              <CandidateCard
                key={entry.id}
                entry={entry}
                onSimulateCall={simulateCall}
                onSimulateReply={simulateReply}
              />
            ))}
          </div>
          {shortlist.length > 3 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted hover:text-ink">
                {t.results.seeOthers(shortlist.length - 3)}
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
      )}

      {/* Pricing explained */}
      {mission.pricing_summary && (
        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {t.results.pricingTitle}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            {mission.pricing_summary}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FormulaBox
              title={t.results.expMult}
              rows={[
                ["< 1", "×1.0"],
                ["1–3", "×1.15"],
                ["3+", "×1.3"],
              ]}
            />
            <FormulaBox
              title={t.results.urgencyMult}
              rows={[
                ["< 24h", "×1.3"],
                ["24–72h", "×1.15"],
                ["> 72h", "×1.0"],
              ]}
            />
          </div>
          <p className="mt-3 text-xs text-muted">{t.results.formula}</p>
        </div>
      )}

      {/* Copy brief */}
      {top3.length > 0 && (
        <div className="flex justify-end">
          <button onClick={copyBrief} className="btn-primary">
            {copied ? t.results.copied : t.results.copy}
          </button>
        </div>
      )}
    </div>
  );
}

function CandidateCard({
  entry,
  onSimulateCall,
  onSimulateReply,
}: {
  entry: ShortlistEntry;
  onSimulateCall: (id: string, outcome: "answered" | "no_answer") => void;
  onSimulateReply: (phone: string, reply: "OUI" | "NON") => void;
}) {
  const { t } = useI18n();
  const { candidate } = entry;
  const reachedByPhone =
    entry.call_status === "answered" && entry.outreach_channel === "call";
  const whatsappLive = ["sent", "replied_yes", "replied_no", "failed"].includes(
    entry.whatsapp_status,
  );

  return (
    <div className="card flex flex-col">
      <div className="flex items-center justify-between">
        <span className="badge bg-surface text-muted">#{entry.rank}</span>
        <OutreachBadge entry={entry} />
      </div>
      <h3 className="mt-3 text-lg font-semibold">{candidate.name}</h3>
      <div className="mt-1 flex flex-wrap gap-1.5">
        <span className="badge bg-surface text-muted">
          {candidate.years_experience} {t.results.people === "person(s)" ? "yrs" : "ans"}
        </span>
        <span className="badge bg-surface text-muted">{candidate.city}</span>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink">
        {entry.rationale}
      </p>

      {reachedByPhone && (
        <div className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
          📞 {t.results.reachedByPhone}
          {entry.call_notes && (
            <span className="mt-1 block text-green-600/80">
              {t.results.callNotes}: {entry.call_notes}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
        <div>
          <div className="text-2xl font-semibold">{entry.suggested_rate}€</div>
          <div className="text-xs text-muted">{t.results.suggestedRate}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">
            {Math.round(entry.confidence_score * 100)}%
          </div>
          <div className="text-xs text-muted">{t.results.confidence}</div>
        </div>
      </div>

      {/* Demo controls */}
      {entry.call_status !== "answered" && entry.whatsapp_status !== "replied_yes" && (
        <div className="mt-3 flex gap-2">
          <SimBtn onClick={() => onSimulateCall(candidate.id, "answered")}>
            {t.results.simAnswer}
          </SimBtn>
          <SimBtn onClick={() => onSimulateCall(candidate.id, "no_answer")}>
            {t.results.simNoAnswer}
          </SimBtn>
        </div>
      )}
      {whatsappLive && entry.whatsapp_status === "sent" && (
        <div className="mt-2 flex gap-2">
          <SimBtn
            color="green"
            onClick={() => onSimulateReply(candidate.phone, "OUI")}
          >
            {t.results.simYes}
          </SimBtn>
          <SimBtn
            color="red"
            onClick={() => onSimulateReply(candidate.phone, "NON")}
          >
            {t.results.simNo}
          </SimBtn>
        </div>
      )}
    </div>
  );
}

function SimBtn({
  children,
  onClick,
  color = "neutral",
}: {
  children: React.ReactNode;
  onClick: () => void;
  color?: "neutral" | "green" | "red";
}) {
  const hover =
    color === "green"
      ? "hover:border-green-500 hover:text-green-600"
      : color === "red"
        ? "hover:border-red-500 hover:text-red-600"
        : "hover:border-ink/40 hover:text-ink";
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg border border-line py-1.5 text-xs text-muted transition ${hover}`}
    >
      {children}
    </button>
  );
}

/** Picks the most meaningful outreach status to show (call > whatsapp). */
function OutreachBadge({ entry }: { entry: ShortlistEntry }) {
  const { t } = useI18n();
  let label = "";
  let cls = "bg-surface text-muted";

  if (entry.call_status === "answered") {
    label = t.callStatus.answered;
    cls = "bg-green-50 text-green-600";
  } else if (entry.whatsapp_status === "replied_yes") {
    label = t.whatsappStatus.replied_yes;
    cls = "bg-green-50 text-green-600";
  } else if (entry.whatsapp_status === "replied_no") {
    label = t.whatsappStatus.replied_no;
    cls = "bg-red-50 text-red-600";
  } else if (entry.whatsapp_status === "sent") {
    label = t.whatsappStatus.sent;
    cls = "bg-blue-50 text-blue-600";
  } else if (entry.call_status === "no_answer") {
    label = t.callStatus.no_answer;
    cls = "bg-amber-50 text-amber-600";
  } else if (entry.call_status === "calling") {
    label = t.callStatus.calling;
    cls = "bg-blue-50 text-blue-600";
  } else {
    label = t.callStatus.pending;
  }
  return <span className={`badge ${cls}`}>{label}</span>;
}

function StatusPill({ status, label }: { status: string; label: string }) {
  const cls: Record<string, string> = {
    pending_outreach: "bg-surface text-muted",
    awaiting_replies: "bg-blue-50 text-blue-600",
    complete: "bg-green-50 text-green-600",
    no_candidates: "bg-amber-50 text-amber-600",
  };
  return (
    <span className={`badge ${cls[status] ?? cls.pending_outreach}`}>
      {label}
    </span>
  );
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

function AgentWorking({ steps }: { steps: string[] }) {
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
  return [
    `MISSION — ${mission.role_type}`,
    `${mission.people_needed} · ${mission.city} · ${mission.mission_date} ${mission.start_time ?? ""}-${mission.end_time ?? ""}`,
    `Budget max: ${mission.max_budget_per_person}€`,
    "",
    mission.mission_brief_fr ?? "",
    "",
    "SHORTLIST:",
    ...shortlist.map(
      (e) =>
        `#${e.rank} ${e.candidate.name} — ${e.suggested_rate}€ — ${Math.round(
          e.confidence_score * 100,
        )}% — ${e.rationale}`,
    ),
  ].join("\n");
}
