import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { resolveOrganizationIdForRequest } from "../../../../lib/organizations";
import { getIncidentsWithFilters, type IncidentFilters } from "../../../../lib/incidents-analytics";
import { logError } from "../../../../lib/logger";

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

  // Parse query parameters
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
    page: url.searchParams.get("page") ? parseInt(url.searchParams.get("page")!) : undefined,
    limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : undefined,
    sortBy: (url.searchParams.get("sortBy") as "timestamp" | "studentName" | "level" | "category") ?? undefined,
    sortOrder: (url.searchParams.get("sortOrder") as "asc" | "desc") ?? undefined,
  };

  try {
    const result = await getIncidentsWithFilters(filters);

    const response = NextResponse.json({
      ok: true,
      data: result.incidents,
      pagination: result.pagination,
    });

    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }

    return response;
  } catch (err: any) {
    logError(err, "Failed to fetch incidents", { targetOrgId, filters });
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to fetch incidents." },
      { status: 500 }
    );
  }
}
