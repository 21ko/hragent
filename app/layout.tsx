import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { LangProvider } from "@/lib/i18n";
import { SessionProvider } from "@/lib/session";
import AppShell from "@/components/AppShell";
import "./globals.css";

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Staffly — Agence d'intérim pilotée par IA",
  description:
    "Décrivez votre besoin, l'agent IA shortliste, tarifie, appelle puis relance les candidats par WhatsApp.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${sans.variable} ${mono.variable}`}>
      <body className="font-sans">
        <LangProvider>
          <SessionProvider>
            <AppShell>{children}</AppShell>
          </SessionProvider>
        </LangProvider>
      </body>
    </html>
  );
}
