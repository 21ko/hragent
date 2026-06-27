"use client";

import Link from "next/link";
import { useI18n, type Lang } from "@/lib/i18n";

export default function SiteNav() {
  const { lang, setLang, t } = useI18n();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-sm font-bold text-white">
            S
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            Staffly
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted">
          <Link href="/" className="hover:text-ink">
            {t.nav.new}
          </Link>
          <Link href="/dashboard" className="hover:text-ink">
            {t.nav.dashboard}
          </Link>
          <LangToggle lang={lang} setLang={setLang} />
        </nav>
      </div>
    </header>
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
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 font-medium uppercase transition ${
            lang === l ? "bg-ink text-white" : "text-muted hover:text-ink"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
