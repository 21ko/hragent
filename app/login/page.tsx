"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { SessionRole, useSession } from "@/lib/session";

export default function LoginPage() {
  const { lang } = useI18n();
  const { session, login } = useSession();
  const router = useRouter();
  const [role, setRole] = useState<SessionRole>("company");
  const [name, setName] = useState("");
  const fr = lang === "fr";

  useEffect(() => {
    if (session) router.replace(session.role === "company" ? "/dashboard" : session.role === "internal" ? "/admin" : "/candidates");
  }, [router, session]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    login({ name: name.trim(), role });
    const next = new URLSearchParams(window.location.search).get("next");
    router.replace(next && next.startsWith("/") ? next : role === "company" ? "/dashboard" : role === "internal" ? "/admin" : "/candidates");
  }

  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-2">
      <div className="hidden bg-ink p-14 text-white lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-2.5 text-xl font-bold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-accent">S</span>Staffly</Link>
        <div className="my-auto max-w-lg">
          <p className="font-mono text-xs uppercase tracking-[.14em] text-accent">{fr ? "Staffing agentique" : "Agentic staffing"}</p>
          <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-[-.04em]">{fr ? "Votre équipe, orchestrée de bout en bout." : "Your workforce, orchestrated end to end."}</h1>
          <p className="mt-6 text-lg leading-7 text-white/60">{fr ? "Un agent sélectionne, tarifie, appelle et relance chaque profil. Vous gardez le contrôle." : "One agent selects, prices, calls and follows up with every profile. You stay in control."}</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-[430px] rounded-[20px] border border-line bg-white p-7 shadow-intake sm:p-9">
          <Link href="/" className="mb-10 flex items-center gap-2 text-lg font-bold lg:hidden"><span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-white">S</span>Staffly</Link>
          <p className="mono-label">{fr ? "Connexion démo" : "Demo login"}</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-.03em]">{fr ? "Bienvenue" : "Welcome"}</h2>
          <p className="mt-2 text-sm text-muted">{fr ? "Choisissez votre espace. Aucun mot de passe nécessaire." : "Choose your workspace. No password required."}</p>
          <div className="mt-7 grid grid-cols-3 gap-3">
            {(["company", "candidate", "internal"] as SessionRole[]).map(item => <button key={item} type="button" onClick={() => setRole(item)} className={`rounded-xl border p-3 text-left transition ${role === item ? "border-accent bg-accent-tint" : "border-line hover:border-accent/40"}`}><span className="block text-xl">{item === "company" ? "⌂" : item === "candidate" ? "◎" : "S"}</span><span className="mt-2 block text-xs font-bold">{item === "company" ? (fr ? "Entreprise" : "Company") : item === "candidate" ? (fr ? "Candidat" : "Candidate") : (fr ? "Équipe Staffly" : "Staffly team")}</span></button>)}
          </div>
          <label className="field-label mt-6">{fr ? "Votre nom" : "Your name"}</label>
          <input autoFocus className="field-input" value={name} onChange={event => setName(event.target.value)} placeholder={role === "company" ? "Atelier Événements" : role === "internal" ? "Alex · Staffly Ops" : "Inès Caron"} />
          <button className="btn-primary mt-5 w-full" disabled={!name.trim()}>{fr ? "Continuer" : "Continue"} <span>→</span></button>
          <p className="mt-5 text-center text-xs text-muted">{fr ? "Session locale uniquement · Démo sécurisée" : "Local session only · Safe demo"}</p>
        </form>
      </div>
    </div>
  );
}
