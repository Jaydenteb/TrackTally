import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { prisma } from "../../../../lib/prisma";

/**
 * GET /api/admin/lms-export
 * Fetches organization info and recent incidents for LMS export preview
 */
export async function GET() {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { organizationId } = authResult;

  if (!organizationId) {
    return NextResponse.json(
      { ok: false, error: "Organization not found" },
      { status: 404 },
    );
  }

  try {
    // Get organization with LMS provider
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
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
        organizationId,
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 50,
    });

    return NextResponse.json({
      ok: true,
      data: {
        organization,
        incidents,
      },
    });
  } catch (error) {
    console.error("Failed to fetch LMS export data:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch data" },
      { status: 500 },
    );
  }
}
