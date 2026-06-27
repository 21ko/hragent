"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Mission, RoleType } from "@/lib/types";

const ROLE_LABELS: Record<RoleType, string> = {
  hostess: "Hôtesse",
  security: "Agent de sécurité",
  event_staff: "Staff événementiel",
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending_outreach: { label: "Préparation", cls: "bg-surface text-muted" },
  awaiting_replies: {
    label: "En attente de réponses",
    cls: "bg-blue-50 text-blue-600",
  },
  complete: { label: "Complète", cls: "bg-green-50 text-green-600" },
};

export default function DashboardPage() {
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
          Tableau de bord
        </h1>
        <Link href="/" className="btn-primary">
          + Nouvelle mission
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {missions === null && (
          <div className="card text-sm text-muted">Chargement…</div>
        )}
        {missions?.length === 0 && (
          <div className="card text-center text-sm text-muted">
            Aucune mission pour l&apos;instant.{" "}
            <Link href="/" className="text-accent">
              Créez-en une.
            </Link>
          </div>
        )}
        {missions?.map((m) => {
          const s = STATUS_LABELS[m.status] ?? STATUS_LABELS.pending_outreach;
          return (
            <Link
              key={m.id}
              href={`/results/${m.id}`}
              className="card flex items-center justify-between transition hover:border-ink/20"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{ROLE_LABELS[m.role_type]}</span>
                  <span className="text-muted">·</span>
                  <span className="text-sm text-muted">
                    {m.people_needed} pers. · {m.city}
                  </span>
                </div>
                <div className="mt-1 text-sm text-muted">
                  {m.mission_date}
                  {m.start_time && ` · ${m.start_time}`}
                  {m.end_time && `–${m.end_time}`}
                </div>
              </div>
              <span className={`badge ${s.cls}`}>{s.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
