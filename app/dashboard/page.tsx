"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Mission } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

const STATUS: Record<string, string> = {
  pending_outreach: "bg-surface text-muted",
  awaiting_replies: "bg-blue-50 text-blue-700",
  complete: "bg-green-50 text-green-700",
  no_candidates: "bg-amber-50 text-amber-700",
};

export default function CompanyDashboardPage() {
  const { t, lang } = useI18n();
  const fr = lang === "fr";
  const [missions, setMissions] = useState<Mission[] | null>(null);
  useEffect(() => {
    fetch("/api/missions", { cache: "no-store" }).then(response => response.json()).then(data => setMissions(data.missions ?? [])).catch(() => setMissions([]));
  }, []);

  const active = missions?.filter(mission => mission.status !== "complete" && mission.status !== "no_candidates").length ?? 0;
  const completed = missions?.filter(mission => mission.status === "complete").length ?? 0;
  const people = missions?.reduce((sum, mission) => sum + mission.people_needed, 0) ?? 0;
  const budget = missions?.reduce((sum, mission) => sum + mission.people_needed * mission.max_budget_per_person, 0) ?? 0;

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><p className="mono-label">{fr ? "Espace entreprise" : "Company workspace"}</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em]">{fr ? "Mes recrutements" : "My hiring"}</h1><p className="mt-2 text-sm text-muted">{fr ? "Créez une mission et suivez vos équipes jusqu’à la réservation." : "Post a mission and track your teams through booking."}</p></div>
        <Link href="/missions/new" className="btn-primary">{t.dashboard.newMission}</Link>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label={fr ? "Missions en cours" : "Active missions"} value={String(active)} />
        <Metric label={fr ? "Missions terminées" : "Completed missions"} value={String(completed)} />
        <Metric label={fr ? "Personnes recherchées" : "People requested"} value={String(people)} />
        <Metric label={fr ? "Budget engagé" : "Committed budget"} value={`${budget.toLocaleString(lang === "fr" ? "fr-FR" : "en-GB")} €`} accent />
      </div>
      <section className="mt-8 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="font-bold">{fr ? "Mes missions" : "My missions"}</h2><p className="mt-1 text-xs text-muted">{fr ? "Cliquez pour suivre l’agent en direct" : "Open one to watch the agent live"}</p></div><span className="text-xs text-muted">{missions?.length ?? 0} total</span></div>
        {missions === null ? <p className="p-6 text-sm text-muted">{t.dashboard.loading}</p> : missions.length === 0 ? <p className="p-8 text-center text-sm text-muted">{t.dashboard.empty}</p> : (
          <div className="divide-y divide-line">{missions.map(mission => <Link key={mission.id} href={`/results/${mission.id}`} className="grid gap-3 px-5 py-4 transition hover:bg-surface/60 md:grid-cols-[1.5fr_.8fr_.7fr_.8fr] md:items-center"><div><p className="font-semibold">{cleanRole(mission.role_type)}</p><p className="mt-1 text-xs text-muted">{mission.city} · {mission.people_needed} {fr ? "profils" : "profiles"}</p></div><p className="text-sm text-muted">{mission.mission_date}<br />{mission.start_time}{mission.end_time ? `–${mission.end_time}` : ""}</p><p className="text-sm font-semibold">{mission.max_budget_per_person} € / pers.</p><span className={`badge w-fit ${STATUS[mission.status]}`}>{t.missionStatus[mission.status]}</span></Link>)}</div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className="card"><p className="text-xs font-medium text-muted">{label}</p><p className={`mt-3 text-3xl font-extrabold tracking-tight ${accent ? "text-accent" : ""}`}>{value}</p></div>;
}

function cleanRole(role: string) {
  return role.includes("�") || role.toLowerCase().includes("hã") ? "Hôte / Hôtesse événementiel" : role;
}
