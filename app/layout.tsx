import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Staffly — Agence d'intérim pilotée par IA",
  description:
    "Décrivez votre besoin, l'agent IA shortliste, tarifie et contacte les candidats par WhatsApp.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="font-sans">
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
                Nouvelle mission
              </Link>
              <Link href="/dashboard" className="hover:text-ink">
                Tableau de bord
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        <footer className="mx-auto max-w-5xl px-6 py-10 text-xs text-muted">
          Staffly — démo hackathon. Agent IA + Supabase + WhatsApp.
        </footer>
      </body>
    </html>
  );
}
