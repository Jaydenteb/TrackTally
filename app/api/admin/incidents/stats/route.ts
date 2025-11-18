import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/admin-auth";
import { resolveOrganizationIdForRequest } from "../../../../../lib/organizations";
import { getIncidentStats, type IncidentFilters } from "../../../../../lib/incidents-analytics";
import { logError } from "../../../../../lib/logger";

async function getOrgIdFromRequest(request: Request, session: Session, baseOrgId: string | null) {
  const url = new URL(request.url);
  const requestedDomain = url.searchParams.get("domain");
  return resolveOrganizationIdForRequest({
    session,
    baseOrganizationId: baseOrgId,
    requestedDomain: requestedDomain ?? undefined,
  });
}

export async function GET(request: Request) {
  const { error, rateHeaders, session, organizationId } = await requireAdmin(request);
  if (error) return error;

  let targetOrgId: string;
  try {
    targetOrgId = await getOrgIdFromRequest(request, session!, organizationId ?? null);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Invalid organization." }, { status: 400 });
  }

  // Parse query parameters (same filters as main endpoint)
  const url = new URL(request.url);
  const filters: IncidentFilters = {
    organizationId: targetOrgId,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    studentId: url.searchParams.get("studentId") ?? undefined,
    teacherEmail: url.searchParams.get("teacherEmail") ?? undefined,
    classroomId: url.searchParams.get("classroomId") ?? undefined,
    level: url.searchParams.get("level") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    type: (url.searchParams.get("type") as "incident" | "commendation" | undefined) ?? undefined,
  };

  try {
    const stats = await getIncidentStats(filters);

    const response = NextResponse.json({
      ok: true,
      data: stats,
    });

    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }

    return response;
  } catch (err: any) {
    logError(err, "Failed to fetch incident stats", { targetOrgId, filters });
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to fetch statistics." },
      { status: 500 }
    );
  }
}
