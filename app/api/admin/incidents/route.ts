import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { organizationId } = authResult;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  try {
    const incidents = await prisma.incident.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
      },
      orderBy: { timestamp: "desc" },
      take: Math.min(limit, 1000), // Cap at 1000
      include: {
        student: true,
        classroom: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: incidents,
    });
  } catch (error) {
    console.error("Incidents fetch error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch incidents" },
      { status: 500 },
    );
  }
}
