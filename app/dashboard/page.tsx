"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Mission } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

const STATUS_CLS: Record<string, string> = {
  pending_outreach: "bg-surface text-muted",
  awaiting_replies: "bg-blue-50 text-blue-600",
  complete: "bg-green-50 text-green-600",
  no_candidates: "bg-amber-50 text-amber-600",
};

export default function DashboardPage() {
  const { t } = useI18n();
  const [missions, setMissions] = useState<Mission[] | null>(null);

  useEffect(() => {
    fetch("/api/missions", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMissions(d.missions))
      .catch(() => setMissions([]));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.dashboard.title}
        </h1>
        <Link href="/" className="btn-primary">
          {t.dashboard.newMission}
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {missions === null && (
          <div className="card text-sm text-muted">{t.dashboard.loading}</div>
        )}
        {missions?.length === 0 && (
          <div className="card text-center text-sm text-muted">
            {t.dashboard.empty}{" "}
            <Link href="/" className="text-accent">
              {t.dashboard.emptyCta}
            </Link>
          </div>
        )}
        {missions?.map((m) => (
          <Link
            key={m.id}
            href={`/results/${m.id}`}
            className="card flex items-center justify-between transition hover:border-ink/20"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{t.roles[m.role_type]}</span>
                <span className="text-muted">·</span>
                <span className="text-sm text-muted">
                  {m.people_needed} · {m.city}
                </span>
              </div>
              <div className="mt-1 text-sm text-muted">
                {m.mission_date}
                {m.start_time && ` · ${m.start_time}`}
                {m.end_time && `–${m.end_time}`}
              </div>
            </div>
            <span
              className={`badge ${STATUS_CLS[m.status] ?? STATUS_CLS.pending_outreach}`}
            >
              {t.missionStatus[m.status] ?? m.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
