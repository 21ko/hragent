import type { Metadata } from "next";
import { LangProvider } from "@/lib/i18n";
import SiteNav from "@/components/SiteNav";
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
        <LangProvider>
          <SiteNav />
          <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
          <footer className="mx-auto max-w-5xl px-6 py-10 text-xs text-muted">
            Staffly — hackathon demo. AI agent · phone + WhatsApp outreach.
          </footer>
        </LangProvider>
      </body>
    </html>
  );
}
