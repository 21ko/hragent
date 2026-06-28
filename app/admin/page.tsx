"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Candidate, Mission } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";

export default function AdminDashboardPage() {
  const { lang } = useI18n();
  const { session } = useSession();
  const fr = lang === "fr";
  const [missions, setMissions] = useState<Mission[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/missions", { cache: "no-store" }).then(response => response.json()),
      fetch("/api/candidates", { cache: "no-store" }).then(response => response.json()),
    ]).then(([missionData, candidateData]) => {
      setMissions(missionData.missions ?? []);
      setCandidates(candidateData.candidates ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const gross = missions.reduce((sum, mission) => sum + mission.people_needed * mission.max_budget_per_person, 0);
    const complete = missions.filter(mission => mission.status === "complete").length;
    const live = missions.filter(mission => ["pending_outreach", "awaiting_replies"].includes(mission.status)).length;
    const exceptions = missions.filter(mission => mission.status === "no_candidates" || mission.status === "awaiting_replies");
    const available = candidates.filter(candidate => candidate.availability_status === "available").length;
    return { gross, revenue: Math.round(gross * 0.12), complete, live, exceptions, available };
  }, [candidates, missions]);

  const roles = useMemo(() => {
    const counts = new Map<string, number>();
    missions.forEach(mission => counts.set(cleanRole(mission.role_type), (counts.get(cleanRole(mission.role_type)) ?? 0) + mission.people_needed));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [missions]);
  const maxRole = Math.max(...roles.map(([, count]) => count), 1);

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[.13em] text-muted">{fr ? "Console interne · données en direct" : "Internal console · live data"}</p>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-.035em]">{fr ? `Bonjour ${session?.name?.split(" ")[0] ?? "Staffly"}` : `Hello ${session?.name?.split(" ")[0] ?? "Staffly"}`}</h1>
          <p className="mt-1.5 text-sm text-muted">{fr ? "Voici ce qui mérite votre attention aujourd’hui." : "Here is what needs your attention today."}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/developers" className="btn-ghost py-2.5">{fr ? "Santé des agents" : "Agent health"}</Link>
          <Link href="/missions/new" className="btn-primary py-2.5">{fr ? "Créer une mission test" : "Create test mission"}</Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={fr ? "Volume brut" : "Gross volume"} value={`${metrics.gross.toLocaleString(lang === "fr" ? "fr-FR" : "en-GB")} €`} detail={fr ? "Toutes les missions" : "All missions"} />
        <Kpi label={fr ? "Revenu Staffly" : "Staffly revenue"} value={`${metrics.revenue.toLocaleString(lang === "fr" ? "fr-FR" : "en-GB")} €`} detail={fr ? "Commission plateforme · 12%" : "Platform fee · 12%"} accent />
        <Kpi label={fr ? "Missions actives" : "Live missions"} value={String(metrics.live)} detail={`${metrics.complete} ${fr ? "terminées" : "completed"}`} />
        <Kpi label={fr ? "Réseau de talents" : "Talent network"} value={String(candidates.length)} detail={`${metrics.available} ${fr ? "disponibles maintenant" : "available now"}`} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-2xl border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div><h2 className="font-bold">{fr ? "Pipeline des missions" : "Mission pipeline"}</h2><p className="mt-1 text-xs text-muted">{fr ? "Vue réelle des statuts de la marketplace" : "Live marketplace status"}</p></div>
            <span className="badge bg-surface text-muted">{missions.length} total</span>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-4">
            <Funnel value={missions.length} label={fr ? "Créées" : "Created"} tone="bg-ink" />
            <Funnel value={missions.filter(m => m.status === "pending_outreach").length} label={fr ? "Agent lancé" : "Agent running"} tone="bg-blue-500" />
            <Funnel value={missions.filter(m => m.status === "awaiting_replies").length} label={fr ? "En attente" : "Waiting"} tone="bg-amber-400" />
            <Funnel value={metrics.complete} label={fr ? "Terminées" : "Completed"} tone="bg-accent" />
          </div>
          <div className="border-t border-line p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">{fr ? "Demande par métier" : "Demand by role"}</p>
            <div className="space-y-3">
              {roles.map(([role, count]) => <div key={role} className="grid grid-cols-[150px_1fr_32px] items-center gap-3 text-sm"><span className="truncate font-medium">{role}</span><div className="h-2 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-accent" style={{ width: `${(count / maxRole) * 100}%` }} /></div><span className="text-right font-mono text-xs text-muted">{count}</span></div>)}
              {!roles.length && <p className="text-sm text-muted">{fr ? "Aucune demande." : "No demand yet."}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="font-bold">{fr ? "À traiter" : "Needs attention"}</h2><p className="mt-1 text-xs text-muted">{fr ? "Exceptions opérationnelles" : "Operational exceptions"}</p></div><span className={`badge ${metrics.exceptions.length ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>{metrics.exceptions.length}</span></div>
          <div className="divide-y divide-line">
            {metrics.exceptions.slice(0, 5).map(mission => <Link key={mission.id} href={`/results/${mission.id}`} className="block p-4 transition hover:bg-surface/60"><div className="flex items-start gap-3"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${mission.status === "no_candidates" ? "bg-red-500" : "bg-amber-400"}`} /><div><p className="text-sm font-semibold">{cleanRole(mission.role_type)} · {mission.city}</p><p className="mt-1 text-xs leading-5 text-muted">{mission.status === "no_candidates" ? (fr ? "Aucun profil trouvé — élargir la recherche" : "No profiles found — widen search") : (fr ? "Réponses candidats encore attendues" : "Candidate responses still pending")}</p></div></div></Link>)}
            {!metrics.exceptions.length && <div className="p-8 text-center"><span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-green-50 text-green-700">✓</span><p className="mt-3 text-sm font-semibold">{fr ? "Tout est sous contrôle" : "Everything is under control"}</p></div>}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <AdminList title={fr ? "Dernières missions" : "Recent missions"} action={fr ? "Toutes les missions" : "All missions"} href="/dashboard">
          {missions.slice(0, 5).map(mission => <Link key={mission.id} href={`/results/${mission.id}`} className="grid grid-cols-[1fr_auto] gap-4 border-b border-line px-5 py-3.5 last:border-0 hover:bg-surface/50"><div><p className="text-sm font-semibold">{cleanRole(mission.role_type)}</p><p className="mt-1 text-xs text-muted">{mission.city} · {mission.people_needed} profils</p></div><div className="text-right"><p className="text-sm font-semibold">{(mission.people_needed * mission.max_budget_per_person).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB")} €</p><p className="mt-1 text-[10px] text-muted">{mission.mission_date}</p></div></Link>)}
        </AdminList>
        <AdminList title={fr ? "Talents récents" : "Recent talent"} action={fr ? "Gérer les talents" : "Manage talent"} href="/candidates">
          {candidates.slice(0, 5).map(candidate => <div key={candidate.id} className="flex items-center gap-3 border-b border-line px-5 py-3.5 last:border-0"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent-tint text-xs font-bold text-accent">{candidate.name.slice(0, 2).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{candidate.name}</p><p className="truncate text-xs text-muted">{cleanRole(candidate.role_type)} · {candidate.city}</p></div><span className={`badge ${candidate.availability_status === "available" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{candidate.availability_status === "available" ? (fr ? "Dispo" : "Available") : (fr ? "À vérifier" : "Review")}</span></div>)}
        </AdminList>
      </section>

      {loading && <p className="text-center text-xs text-muted">{fr ? "Synchronisation…" : "Syncing…"}</p>}
    </div>
  );
}

function Kpi({ label, value, detail, accent = false }: { label: string; value: string; detail: string; accent?: boolean }) {
  return <div className="rounded-2xl border border-line bg-white p-5"><p className="text-xs font-medium text-muted">{label}</p><p className={`mt-3 text-3xl font-extrabold tracking-[-.03em] ${accent ? "text-accent" : ""}`}>{value}</p><p className="mt-2 text-xs text-muted">{detail}</p></div>;
}

function Funnel({ value, label, tone }: { value: number; label: string; tone: string }) {
  return <div><div className="flex items-end justify-between"><span className="text-2xl font-extrabold">{value}</span><span className={`h-2 w-2 rounded-full ${tone}`} /></div><p className="mt-2 text-xs text-muted">{label}</p></div>;
}

function AdminList({ title, action, href, children }: { title: string; action: string; href: string; children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-2xl border border-line bg-white"><div className="flex items-center justify-between border-b border-line px-5 py-4"><h2 className="font-bold">{title}</h2><Link href={href} className="text-xs font-semibold text-accent">{action} →</Link></div>{children}</div>;
}

function cleanRole(role: string) {
  const lower = role.toLowerCase();
  return role.includes("�") || lower.includes("hã") || lower.includes("hostess") ? "Hôte / Hôtesse événementiel" : role;
}
