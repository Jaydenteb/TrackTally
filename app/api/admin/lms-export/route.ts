import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { prisma } from "../../../../lib/prisma";
import { resolveOrganizationIdForRequest } from "../../../../lib/organizations";

/**
 * GET /api/admin/lms-export
 * Fetches organization info and recent incidents for LMS export preview
 */
export async function GET(request: Request) {
  const authResult = await requireAdmin(request);
  if (authResult.error) {
    return authResult.error;
  }

  const { organizationId, session, rateHeaders } = authResult;

  // Allow super admins to impersonate via ?domain= or ?impersonate=
  const url = new URL(request.url);
  const requestedDomain = url.searchParams.get("domain") ?? url.searchParams.get("impersonate");

  let targetOrgId: string;
  try {
    targetOrgId = await resolveOrganizationIdForRequest({
      session,
      baseOrganizationId: organizationId ?? null,
      requestedDomain: requestedDomain ?? undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Invalid organization" },
      { status: 400 },
    );
  }

  try {
    // Get organization with LMS provider
    const organization = await prisma.organization.findUnique({
      where: { id: targetOrgId },
      select: {
        id: true,
        name: true,
        lmsProvider: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { ok: false, error: "Organization not found" },
        { status: 404 },
      );
    }

    // Get recent incidents (last 50)
    const incidents = await prisma.incident.findMany({
      where: {
        organizationId: targetOrgId,
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 50,
    });

    const response = NextResponse.json({
      ok: true,
      data: {
        organization,
        incidents,
      },
    });
    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
  } catch (error) {
    console.error("Failed to fetch LMS export data:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch data" },
      { status: 500 },
    );
  }
}
