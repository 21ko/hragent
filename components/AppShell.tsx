"use client";

import { usePathname } from "next/navigation";
import SiteNav from "@/components/SiteNav";

/**
 * The landing page ("/") ships its own full-bleed marketing chrome (header,
 * sections, footer) straight from the Staffly Landing design. Every other route
 * gets the shared app shell: sticky nav, centered container, minimal footer.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      <footer className="mx-auto max-w-5xl px-6 py-10 text-xs text-muted">
        Staffly — hackathon demo. AI agent · phone + WhatsApp outreach.
      </footer>
    </>
  );
}
