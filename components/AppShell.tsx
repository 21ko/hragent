"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import { useSession } from "@/lib/session";

const PUBLIC_ROUTES = new Set(["/", "/login"]);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, ready } = useSession();
  const isPublic = PUBLIC_ROUTES.has(pathname);

  useEffect(() => {
    if (!ready || isPublic) return;
    if (!session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (pathname.startsWith("/admin") && session.role !== "internal") {
      router.replace(session.role === "candidate" ? "/candidates" : "/dashboard");
    } else if (pathname.startsWith("/dashboard") && session.role === "internal") {
      router.replace("/admin");
    } else if (pathname.startsWith("/missions") && session.role === "candidate") {
      router.replace("/candidates");
    }
  }, [isPublic, pathname, ready, router, session]);

  if (isPublic) return <>{children}</>;
  if (!ready || !session) return <div className="grid min-h-screen place-items-center text-sm text-muted">Staffly…</div>;

  return (
    <div className="min-h-screen bg-paper">
      <SiteNav />
      <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">{children}</main>
      <footer className="mx-auto max-w-[1180px] border-t border-line px-5 py-8 text-xs text-muted md:px-8">Staffly · AI staffing infrastructure</footer>
    </div>
  );
}
