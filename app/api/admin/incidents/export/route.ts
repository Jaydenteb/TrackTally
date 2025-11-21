import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/admin-auth";
import { recordAuditLog } from "../../../../../lib/settings";
import { resolveOrganizationIdForRequest } from "../../../../../lib/organizations";
import { generateIncidentCSV, type IncidentFilters } from "../../../../../lib/incidents-analytics";

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

  // Parse query parameters for filtering
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
    const csv = await generateIncidentCSV(filters);

    const now = new Date();
    const filename = `tracktally-incidents-${now.toISOString().replace(/[:.]/g, "-")}.csv`;

    const response = new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }

    const performer = session?.user?.email?.toLowerCase() ?? "unknown";
    const incidentCount = csv.split("\n").length - 1; // Subtract header row
    await recordAuditLog("incidents.export", performer, { count: incidentCount, filters: JSON.stringify(filters) });

    return response;
  } catch (err: any) {
    console.error("Failed to export incidents:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to export incidents." },
      { status: 500 }
    );
  }
}
