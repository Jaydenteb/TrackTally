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
  const limit = parseInt(searchParams.get("limit") || "5", 10);

  const now = new Date();
  const defaultStart = startOfDay(subDays(now, 30));
  const defaultEnd = endOfDay(now);

  const startDate = startDateParam ? new Date(startDateParam) : defaultStart;
  const endDate = endDateParam ? new Date(endDateParam) : defaultEnd;

  const whereClause = {
    ...(organizationId ? { organizationId } : {}),
    timestamp: {
      gte: startDate,
      lte: endDate,
    },
  };

  try {
    // Top categories
    const topCategories = await prisma.incident.groupBy({
      by: ["category"],
      where: whereClause,
      _count: true,
      orderBy: {
        _count: {
          category: "desc",
        },
      },
      take: limit,
    });

    // Top locations
    const topLocations = await prisma.incident.groupBy({
      by: ["location"],
      where: whereClause,
      _count: true,
      orderBy: {
        _count: {
          location: "desc",
        },
      },
      take: limit,
    });

    return NextResponse.json({
      ok: true,
      data: {
        topCategories: topCategories.map((item) => ({
          name: item.category,
          count: item._count,
        })),
        topLocations: topLocations.map((item) => ({
          name: item.location,
          count: item._count,
        })),
      },
    });
  } catch (error) {
    console.error("Analytics top items error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch top items" },
      { status: 500 },
    );
  }
}
