"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

function defaultDate() {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  return date.toISOString().slice(0, 10);
}

export default function NewMissionPage() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    role_type: "", people_needed: 5, mission_date: defaultDate(),
    start_time: "18:00", end_time: "23:00", city: "Paris",
    max_budget_per_person: 180, description: "",
  });
  const set = (key: keyof typeof form, value: string | number) => setForm(old => ({ ...old, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Agent failed");
      router.push(`/results/${body.missionId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[920px]">
      <div className="mb-8">
        <p className="mono-label">{lang === "fr" ? "Brief de mission" : "Mission brief"}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em]">{t.nav.new}</h1>
        <p className="mt-2 text-muted">{lang === "fr" ? "Décrivez le besoin. L’agent s’occupe du matching, du tarif et des entretiens." : "Describe the need. The agent handles matching, pricing and interviews."}</p>
      </div>
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="card space-y-5">
          <div><label className="field-label">{t.home.role}</label><input required className="field-input" value={form.role_type} onChange={e => set("role_type", e.target.value)} placeholder={lang === "fr" ? "Ex. Hôte·sse VIP, ingénieur IA…" : "E.g. VIP host, AI engineer…"} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="field-label">{t.home.people}</label><input type="number" min="1" required className="field-input" value={form.people_needed} onChange={e => set("people_needed", Number(e.target.value))} /></div>
            <div><label className="field-label">{t.home.date}</label><input type="date" required className="field-input" value={form.mission_date} onChange={e => set("mission_date", e.target.value)} /></div>
          </div>
          <div><label className="field-label">{t.home.city}</label><input required className="field-input" value={form.city} onChange={e => set("city", e.target.value)} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="field-label">{t.home.start}</label><input type="time" className="field-input" value={form.start_time} onChange={e => set("start_time", e.target.value)} /></div>
            <div><label className="field-label">{t.home.end}</label><input type="time" className="field-input" value={form.end_time} onChange={e => set("end_time", e.target.value)} /></div>
          </div>
          <div><label className="field-label">{t.home.description}</label><textarea required rows={5} className="field-input resize-none" value={form.description} onChange={e => set("description", e.target.value)} placeholder={lang === "fr" ? "Contexte, compétences, tenue, langues, contraintes…" : "Context, skills, dress code, languages, constraints…"} /></div>
        </div>
        <aside className="space-y-4">
          <div className="card">
            <label className="field-label">{t.home.budget}</label>
            <div className="relative"><input type="number" min="0" className="field-input pr-10" value={form.max_budget_per_person} onChange={e => set("max_budget_per_person", Number(e.target.value))} /><span className="absolute right-4 top-3 text-muted">€</span></div>
          </div>
          <div className="rounded-2xl bg-ink p-5 text-white">
            <p className="font-mono text-[10px] uppercase tracking-wider text-accent">{lang === "fr" ? "Ce que fait l’agent" : "What the agent does"}</p>
            <ol className="mt-4 space-y-3 text-sm text-white/70"><li>01 · {lang === "fr" ? "Classe les profils" : "Ranks profiles"}</li><li>02 · {lang === "fr" ? "Calcule un tarif juste" : "Computes fair rates"}</li><li>03 · {lang === "fr" ? "Appelle puis relance" : "Calls then follows up"}</li></ol>
          </div>
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button className="btn-primary w-full" disabled={submitting}>{submitting ? t.home.submitting : t.home.submit} <span>→</span></button>
        </aside>
      </form>
    </div>
  );
}
