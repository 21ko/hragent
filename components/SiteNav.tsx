"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n, type Lang } from "@/lib/i18n";
import { useSession } from "@/lib/session";

export default function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useI18n();
  const { session, logout } = useSession();
  if (!session) return null;

  const companyLinks = [
    ["/dashboard", t.nav.dashboard],
    ["/missions/new", t.nav.new],
    ["/transactions", lang === "fr" ? "Transactions" : "Transactions"],
    ["/developers", t.nav.developers],
  ];
  const internalLinks = [
    ["/admin", lang === "fr" ? "Pilotage Staffly" : "Staffly operations"],
    ["/transactions", "Transactions"],
    ["/candidates", lang === "fr" ? "Talents" : "Talent"],
    ["/developers", t.nav.developers],
  ];
  const candidateLinks = [["/candidates", lang === "fr" ? "Mon espace" : "My space"]];
  const links = session.role === "company" ? companyLinks : session.role === "internal" ? internalLinks : candidateLinks;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-[1280px] items-center gap-5 px-5 md:px-8">
        <Link href={session.role === "company" ? "/dashboard" : session.role === "internal" ? "/admin" : "/candidates"} className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-base font-extrabold text-white">S</span>
          <span className="text-[19px] font-bold tracking-tight">Staffly</span>
        </Link>
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {links.map(([href, label]) => {
            const active = pathname === href || (href === "/dashboard" && pathname.startsWith("/results"));
            return (
              <Link key={href} href={href} className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${active ? "bg-accent-tint text-ink" : "text-muted hover:bg-surface hover:text-ink"}`}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LangToggle lang={lang} setLang={setLang} />
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-tint text-xs text-accent">{session.name.slice(0, 2).toUpperCase()}</span>
              <span className="hidden max-w-32 truncate sm:block">{session.name}</span>
              <span className="text-muted">⌄</span>
            </summary>
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-line bg-white p-2 shadow-card">
              <p className="px-2 py-1 text-xs text-muted">{session.role === "company" ? (lang === "fr" ? "Compte entreprise" : "Company account") : session.role === "internal" ? (lang === "fr" ? "Équipe Staffly" : "Staffly team") : (lang === "fr" ? "Espace candidat" : "Candidate space")}</p>
              <button onClick={() => { logout(); router.replace("/login"); }} className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm font-medium hover:bg-surface">
                {lang === "fr" ? "Se déconnecter" : "Log out"}
              </button>
            </div>
          </details>
        </div>
      </div>
      <nav className="flex overflow-x-auto border-t border-line px-3 md:hidden">
        {links.map(([href, label]) => <Link key={href} href={href} className={`whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold ${pathname === href ? "border-accent text-accent" : "border-transparent text-muted"}`}>{label}</Link>)}
      </nav>
    </header>
  );
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (lang: Lang) => void }) {
  return <div className="flex overflow-hidden rounded-lg border border-line text-[10px]">{(["fr", "en"] as Lang[]).map(item => <button key={item} onClick={() => setLang(item)} className={`px-2 py-1.5 font-mono uppercase ${lang === item ? "bg-ink text-white" : "bg-white text-muted"}`}>{item}</button>)}</div>;
}
