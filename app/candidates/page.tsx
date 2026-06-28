"use client";

import { useCallback, useEffect, useState } from "react";
import type { Candidate } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";

interface ImportSummary { imported: number; updated: number; skipped: number; needsReview: number; cached: number }

export default function CandidatesPage() {
  const { lang } = useI18n(); const fr = lang === "fr";
  const { session } = useSession();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => { const response = await fetch("/api/candidates", { cache: "no-store" }); const body = await response.json(); setCandidates(body.candidates ?? []); }, []);
  useEffect(() => { load().catch(() => setError(fr ? "Chargement impossible." : "Unable to load.")); }, [fr, load]);

  async function upload(files: FileList | null) {
    if (!files?.length) return; setUploading(true); setError("");
    try {
      const form = new FormData(); Array.from(files).forEach(file => form.append("files", file));
      const response = await fetch("/api/candidates/import", { method: "POST", body: form });
      const body = await response.json(); if (!response.ok) throw new Error(body.error);
      setSummary(body); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Import failed"); } finally { setUploading(false); }
  }

  const profile = candidates[0];
  return <div className="mx-auto max-w-[980px]">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
      <div><p className="mono-label">{fr ? "Espace candidat" : "Candidate space"}</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em]">{fr ? `Bonjour, ${session?.name ?? ""}` : `Hello, ${session?.name ?? ""}`}</h1></div>
      <label className="btn-primary cursor-pointer">{uploading ? (fr ? "Analyse en cours…" : "Analysing…") : (fr ? "Importer mon CV" : "Upload my CV")}<input className="sr-only" type="file" accept=".pdf,.docx,.txt" disabled={uploading} onChange={e => upload(e.target.files)} /></label>
    </div>
    {summary && <div className="mt-5 rounded-xl border border-accent/20 bg-accent-tint p-4 text-sm text-accent">{fr ? "CV analysé et profil mis à jour." : "CV analysed and profile updated."} · {summary.imported + summary.updated} {fr ? "profil" : "profile"}</div>}
    {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_.85fr]">
      <section>
        <h2 className="mb-3 text-sm font-bold">{fr ? "Vos propositions" : "Your offers"}</h2>
        <div className="card border-accent/30">
          <div className="flex items-start justify-between gap-4"><div><span className="badge bg-accent-tint text-accent">{fr ? "Nouvelle proposition" : "New offer"}</span><h3 className="mt-3 text-lg font-bold">{fr ? "Lancement parfumerie Rivoli" : "Rivoli fragrance launch"}</h3><p className="mt-1 text-sm text-muted">14 July · Paris 1 · 18:00–23:00</p></div><p className="text-xl font-extrabold text-accent">135 €</p></div>
          <div className="mt-5 flex gap-3"><button className="btn-primary flex-1">{fr ? "Accepter" : "Accept"}</button><button className="btn-ghost flex-1">{fr ? "Refuser" : "Decline"}</button></div>
        </div>
        <div className="mt-4 rounded-2xl border border-line bg-white p-5 opacity-70"><div className="flex justify-between"><div><p className="font-bold">Salon VivaTech</p><p className="mt-1 text-sm text-muted">Paris 15 · 20 June</p></div><span className="badge bg-green-50 text-green-700">{fr ? "Acceptée" : "Accepted"}</span></div></div>
      </section>
      <aside>
        <h2 className="mb-3 text-sm font-bold">{fr ? "Mon profil public" : "My public profile"}</h2>
        <div className="card">
          <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full bg-accent-tint text-sm font-bold text-accent">{(session?.name ?? "IC").slice(0,2).toUpperCase()}</span><div><p className="font-bold">{session?.name}</p><p className="text-sm text-muted">{profile?.role_type ?? (fr ? "Hôte·sse · Paris" : "Host · Paris")}</p></div></div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><ProfileStat label={fr ? "Expérience" : "Experience"} value={`${profile?.years_experience ?? 5} ${fr ? "ans" : "years"}`} /><ProfileStat label={fr ? "Langues" : "Languages"} value={profile?.languages?.join(" · ") || "FR · EN"} /><ProfileStat label={fr ? "Tarif" : "Rate"} value={`${profile?.day_rate ?? 135} € / j`} /><ProfileStat label={fr ? "Note agent" : "Agent score"} value="96 / 100" /></div>
          <button className="btn-ghost mt-5 w-full">{fr ? "Modifier mon profil" : "Edit my profile"}</button>
        </div>
      </aside>
    </div>
  </div>;
}

function ProfileStat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-surface p-3"><p className="text-[10px] uppercase tracking-wide text-muted">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
