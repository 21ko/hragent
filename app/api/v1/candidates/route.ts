import { NextResponse } from "next/server";
import type { RoleType } from "@/lib/types";
import { checkApiKey } from "@/lib/auth";
import { getCandidatesByRole } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/candidates?role=hostess
 * Agent-facing tool: read the available candidate pool for a role.
 */
export async function GET(req: Request) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const role = new URL(req.url).searchParams.get("role") as RoleType | null;
  if (!role?.trim()) {
    return NextResponse.json(
      { error: "Query param `role` required." },
      { status: 400 },
    );
  }
  try {
    const candidates = await getCandidatesByRole(role);
    return NextResponse.json({
      candidates: candidates.map((c) => ({
        id: c.id,
        name: c.name,
        role_type: c.role_type,
        years_experience: c.years_experience,
        base_day_rate: c.day_rate,
        city: c.city,
        languages: c.languages,
        availability_status: c.availability_status,
      })),
    });
  } catch (err) {
    console.error("[api/v1/candidates] failed:", err);
    return NextResponse.json(
      { error: "Internal error while listing candidates." },
      { status: 500 },
    );
  }
}
