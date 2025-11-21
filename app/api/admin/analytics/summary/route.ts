import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAdmin } from "../../../../../lib/admin-auth";
import { subDays, startOfDay, endOfDay } from "date-fns";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { organizationId } = authResult;
  const { searchParams } = new URL(request.url);

  // Parse date range from query params (optional)
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const now = new Date();
  const defaultStart = startOfDay(subDays(now, 30));
  const defaultEnd = endOfDay(now);

  const startDate = startDateParam ? new Date(startDateParam) : defaultStart;
  const endDate = endDateParam ? new Date(endDateParam) : defaultEnd;

  // Build where clause - if organizationId is null (superadmin), show all
  const whereClause = {
    ...(organizationId ? { organizationId } : {}),
    timestamp: {
      gte: startDate,
      lte: endDate,
    },
  };

  const whereClauseLast7 = {
    ...(organizationId ? { organizationId } : {}),
    timestamp: {
      gte: startOfDay(subDays(now, 7)),
      lte: endOfDay(now),
    },
  };

  const whereClausePrevious7 = {
    ...(organizationId ? { organizationId } : {}),
    timestamp: {
      gte: startOfDay(subDays(now, 14)),
      lt: startOfDay(subDays(now, 7)),
    },
  };

  try {
    // Total incidents in date range
    const totalIncidents = await prisma.incident.count({
      where: whereClause,
    });

    // Count by type
    const incidentsByType = await prisma.incident.groupBy({
      by: ["type"],
      where: whereClause,
      _count: true,
    });

    // Count by level
    const incidentsByLevel = await prisma.incident.groupBy({
      by: ["level"],
      where: whereClause,
      _count: true,
    });

    // Unique students with incidents
    const uniqueStudents = await prisma.incident.findMany({
      where: whereClause,
      select: {
        studentId: true,
      },
      distinct: ["studentId"],
    });

    // Previous period comparison (last 7 days vs 7 days before that)
    const last7Days = await prisma.incident.count({
      where: whereClauseLast7,
    });

    const previous7Days = await prisma.incident.count({
      where: whereClausePrevious7,
    });

    const avgPerStudent =
      uniqueStudents.length > 0
        ? (totalIncidents / uniqueStudents.length).toFixed(1)
        : "0";

    const weekOverWeekChange =
      previous7Days > 0
        ? (((last7Days - previous7Days) / previous7Days) * 100).toFixed(0)
        : last7Days > 0
          ? "+100"
          : "0";

    return NextResponse.json({
      ok: true,
      data: {
        totalIncidents,
        last7Days,
        previous7Days,
        weekOverWeekChange,
        uniqueStudents: uniqueStudents.length,
        avgPerStudent,
        incidentsByType: incidentsByType.map((item) => ({
          type: item.type,
          count: item._count,
        })),
        incidentsByLevel: incidentsByLevel.map((item) => ({
          level: item.level,
          count: item._count,
        })),
      },
    });
  } catch (error) {
    console.error("Analytics summary error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch analytics summary" },
      { status: 500 },
    );
  }
}
