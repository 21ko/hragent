"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}

export default function HomePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    role_type: "Hôte / Hôtesse événementiel",
    people_needed: 3,
    mission_date: defaultDate(),
    start_time: "18:00",
    end_time: "23:00",
    city: "Paris",
    max_budget_per_person: 180,
    description: "Soirée de lancement de marque, accueil VIP, dress code élégant.",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Agent failed.");
      }
      const { missionId } = await res.json();
      router.push(`/results/${missionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_minmax(420px,460px)]">
      {/* Pitch column */}
      <div className="pt-2">
        <span className="badge bg-surface text-muted">{t.home.badge}</span>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight">
          {t.home.title}
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
          {t.home.subtitle}
        </p>
        <ul className="mt-6 space-y-3 text-sm">
          {t.home.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-ink">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                ✓
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Form column */}
      <form onSubmit={onSubmit} className="card space-y-5">
        <div>
          <label className="field-label">{t.home.role}</label>
          <input
            type="text"
            required
            maxLength={100}
            className="field-input"
            placeholder="Ex. Hôte événementiel, développeur, chef de projet…"
            value={form.role_type}
            onChange={(e) => set("role_type", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">{t.home.people}</label>
            <input
              type="number"
              min={1}
              className="field-input"
              value={form.people_needed}
              onChange={(e) => set("people_needed", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="field-label">{t.home.city}</label>
            <input
              className="field-input"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="field-label">{t.home.date}</label>
          <input
            type="date"
            className="field-input"
            value={form.mission_date}
            onChange={(e) => set("mission_date", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">{t.home.start}</label>
            <input
              type="time"
              className="field-input"
              value={form.start_time}
              onChange={(e) => set("start_time", e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">{t.home.end}</label>
            <input
              type="time"
              className="field-input"
              value={form.end_time}
              onChange={(e) => set("end_time", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="field-label">{t.home.budget}</label>
          <input
            type="number"
            min={0}
            className="field-input"
            value={form.max_budget_per_person}
            onChange={(e) =>
              set("max_budget_per_person", Number(e.target.value))
            }
          />
        </div>

        <div>
          <label className="field-label">{t.home.description}</label>
          <textarea
            rows={3}
            className="field-input resize-none"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? t.home.submitting : t.home.submit}
        </button>
        <p className="text-center text-xs text-muted">{t.home.formHint}</p>
      </form>
    </div>
  );
}
