"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n, type Lang } from "@/lib/i18n";

function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}

export default function HomePage() {
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const L = t.landing;

  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    role_type: "Hôte / Hôtesse événementiel",
    people_needed: 8,
    mission_date: defaultDate(),
    start_time: "18:00",
    end_time: "23:00",
    city: "Paris 8e — Salon des Champs",
    max_budget_per_person: 180,
    description:
      "Soirée de lancement de marque, accueil VIP, dress code élégant.",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit() {
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
    <div className="min-h-screen bg-paper text-ink">
      {/* NAV */}
      <header className="sticky top-0 z-10 flex w-full items-center justify-between border-b border-line bg-paper/85 px-6 py-4 backdrop-blur md:px-11">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-base font-extrabold text-white">
            S
          </span>
          <span className="text-[19px] font-bold tracking-tight">Staffly</span>
        </Link>
        <nav className="hidden items-center gap-8 text-[14.5px] font-medium text-muted md:flex">
          {L.navLinks.map((label, i) => (
            <a
              key={label}
              href={["#how", "#how", "#how", "/dashboard"][i]}
              className="transition hover:text-ink"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <LangToggle lang={lang} setLang={setLang} />
          <Link href="/login" className="btn-primary h-[42px] px-[18px] text-[14.5px]">
            {L.navCta}
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-[1280px] px-6 py-16 md:px-11 md:py-[88px]">
        <div className="max-w-[760px]">
          <h1 className="text-[clamp(38px,5vw,60px)] font-extrabold leading-[1.02] tracking-[-0.035em] text-balance">
            {L.heroTitle}
          </h1>
          <p className="mt-6 max-w-[520px] text-[19.5px] leading-[1.55] text-muted text-pretty">
            {L.heroLead}
            <strong className="font-semibold text-ink">
              {L.heroLeadStrong}
            </strong>
            {L.heroLeadTail}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link
              href="/login"
              className="inline-flex h-[52px] items-center gap-2.5 rounded-[11px] bg-accent px-[26px] text-base font-semibold text-white shadow-[0_2px_8px_rgba(14,143,87,0.25)] transition hover:bg-accent-hover"
            >
              {L.ctaCompany}
              <span className="font-mono">→</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex h-[52px] items-center gap-2.5 rounded-[11px] border border-line bg-white px-6 text-base font-semibold text-ink transition hover:border-[#c9c9c0]"
            >
              {L.ctaWorker}
            </Link>
          </div>
          <div className="mt-7 flex items-center gap-3.5 text-sm text-muted">
            <div className="flex">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-[30px] w-[30px] rounded-full border-2 border-white"
                  style={{
                    marginLeft: i ? -10 : 0,
                    background:
                      "repeating-linear-gradient(135deg,#e7e7e0,#e7e7e0 4px,#f1f1ec 4px,#f1f1ec 8px)",
                  }}
                />
              ))}
            </div>
            <span>{L.audience}</span>
          </div>
        </div>

        {/* INTAKE CARD */}
        {false && (
        <div
          id="intake"
          className="hidden"
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="text-base font-bold">{L.intakeTitle}</div>
            <div className="font-mono text-[11px] text-muted">
              {L.stepOf(step)}
            </div>
          </div>

          {step === 1 ? (
            <div className="flex flex-col gap-4">
              <div>
                <label className="field-label">{L.fProfile}</label>
                <input
                  type="text"
                  list="profile-options"
                  className="field-input"
                  value={form.role_type}
                  onChange={(e) => set("role_type", e.target.value)}
                />
                <datalist id="profile-options">
                  {L.fProfileOptions.map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">{L.fCount}</label>
                  <input
                    type="number"
                    min={1}
                    className="field-input"
                    value={form.people_needed}
                    onChange={(e) =>
                      set("people_needed", Number(e.target.value))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">{L.fDate}</label>
                  <input
                    type="date"
                    className="field-input"
                    value={form.mission_date}
                    onChange={(e) => set("mission_date", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="field-label">{L.fLocation}</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="mt-1 h-[50px] rounded-[11px] bg-accent text-[15.5px] font-semibold text-white transition hover:bg-accent-hover"
              >
                {L.fContinue}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                {L.step2Title}
              </div>
              <div>
                <label className="field-label">{L.fBudget}</label>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">{L.fStart}</label>
                  <input
                    type="time"
                    className="field-input"
                    value={form.start_time}
                    onChange={(e) => set("start_time", e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">{L.fEnd}</label>
                  <input
                    type="time"
                    className="field-input"
                    value={form.end_time}
                    onChange={(e) => set("end_time", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="field-label">{L.fDescription}</label>
                <textarea
                  rows={2}
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
              <div className="mt-1 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-[50px] rounded-[11px] border border-line bg-white px-[18px] text-[15px] font-semibold text-ink transition hover:border-[#c9c9c0]"
                >
                  {L.fBack}
                </button>
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={submitting}
                  className="flex h-[50px] flex-1 items-center justify-center gap-2.5 rounded-[11px] bg-accent text-[15.5px] font-semibold text-white transition hover:bg-accent-hover disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      {L.fLaunching}
                    </>
                  ) : (
                    L.fLaunch
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="mt-[18px] flex items-center gap-2 border-t border-line pt-4 text-[12.5px] text-muted">
            <span className="inline-block h-[7px] w-[7px] animate-pulse rounded-full bg-accent" />
            {L.intakeFootnote}
          </div>
        </div>
        )}
      </section>

      {/* TRUST STRIP */}
      {false && (
      <section className="hidden">
        <div className="mb-6 text-center font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted">
          {L.trust}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex h-[42px] items-center justify-center rounded-lg font-mono text-[10px] text-[#9a9a90]"
              style={{
                background:
                  "repeating-linear-gradient(135deg,#eeeee8,#eeeee8 6px,#f5f5f0 6px,#f5f5f0 12px)",
              }}
            >
              logo client
            </div>
          ))}
        </div>
      </section>
      )}

      {/* STATS */}
      <section className="mx-auto max-w-[1280px] px-6 pb-16 md:px-11">
        <div className="grid grid-cols-1 overflow-hidden rounded-[18px] border border-line bg-white sm:grid-cols-3">
          {L.stats.map((s, i) => (
            <div
              key={s.label}
              className={`px-8 py-[34px] ${
                i < 2 ? "border-line sm:border-r" : ""
              } ${i < L.stats.length - 1 ? "border-b sm:border-b-0" : ""}`}
            >
              <div
                className={`font-mono text-[42px] font-semibold tracking-[-0.02em] ${
                  i === 2 ? "text-accent" : ""
                }`}
              >
                {s.value}
              </div>
              <div className="mt-1.5 text-[15px] text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-[1280px] scroll-mt-20 px-6 pb-[72px] md:px-11">
        <div className="mb-11 text-center">
          <div className="mb-3.5 font-mono text-xs uppercase tracking-[0.12em] text-accent">
            {L.stepsEyebrow}
          </div>
          <h2 className="text-[clamp(28px,4vw,40px)] font-extrabold tracking-[-0.03em]">
            {L.stepsTitle}
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {L.steps.map((s) => (
            <div
              key={s.n}
              className="rounded-[18px] border border-line bg-white p-7"
            >
              <div className="mb-5 grid h-[42px] w-[42px] place-items-center rounded-[11px] bg-accent-tint font-mono text-base font-semibold text-accent">
                {s.n}
              </div>
              <div className="mb-2 text-[19px] font-bold">{s.title}</div>
              <p className="text-[15px] leading-[1.55] text-muted text-pretty">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BAND */}
      <section className="mx-auto max-w-[1280px] px-6 pb-[72px] md:px-11">
        <div className="flex flex-col items-start justify-between gap-8 rounded-[22px] bg-ink p-10 md:flex-row md:items-center md:p-14">
          <div>
            <h2 className="text-[clamp(26px,3vw,34px)] font-extrabold tracking-[-0.03em] text-white">
              {L.ctaBandTitle}
            </h2>
            <p className="mt-2.5 text-[17px] text-white/60">
              {L.ctaBandSubtitle}
            </p>
          </div>
          <a
            href="/login"
            className="inline-flex h-[54px] flex-none items-center gap-2.5 rounded-xl bg-accent px-7 text-[16.5px] font-semibold text-white transition hover:bg-accent-hover"
          >
            {L.ctaBandButton}
            <span className="font-mono">→</span>
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-4 border-t border-line px-6 py-10 text-[13.5px] text-muted md:flex-row md:items-center md:px-11">
        <div className="flex items-center gap-2.5">
          <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-accent text-xs font-extrabold text-white">
            S
          </span>
          <span className="text-[15px] font-bold text-ink">Staffly</span>
          <span className="ml-2">{L.footerTagline}</span>
        </div>
        <div className="flex gap-6">
          {L.footerLinks.map((l) => (
            <a key={l} href="#" className="transition hover:text-ink">
              {l}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}

function LangToggle({
  lang,
  setLang,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-line text-xs">
      {(["fr", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 font-mono font-medium uppercase transition ${
            lang === l ? "bg-accent text-white" : "text-muted hover:text-ink"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
