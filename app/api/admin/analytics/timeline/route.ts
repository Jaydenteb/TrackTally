import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAdmin } from "../../../../../lib/admin-auth";
import { subDays, startOfDay, endOfDay, format, eachDayOfInterval } from "date-fns";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { organizationId } = authResult;
  const { searchParams } = new URL(request.url);

  // Parse date range from query params (optional)
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const days = parseInt(searchParams.get("days") || "30", 10);

  const now = new Date();
  const defaultStart = startOfDay(subDays(now, days - 1));
  const defaultEnd = endOfDay(now);

  const startDate = startDateParam ? new Date(startDateParam) : defaultStart;
  const endDate = endDateParam ? new Date(endDateParam) : defaultEnd;

  try {
    // Fetch all incidents in range
    const incidents = await prisma.incident.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        timestamp: true,
        type: true,
      },
    });

    // Generate all days in range
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    // Group incidents by date
    const incidentsByDate = incidents.reduce(
      (acc, incident) => {
        const dateKey = format(startOfDay(incident.timestamp), "yyyy-MM-dd");
        if (!acc[dateKey]) {
          acc[dateKey] = { total: 0, incident: 0, commendation: 0 };
        }
        acc[dateKey].total++;
        if (incident.type === "commendation") {
          acc[dateKey].commendation++;
        } else {
          acc[dateKey].incident++;
        }
        return acc;
      },
      {} as Record<string, { total: number; incident: number; commendation: number }>,
    );

    // Build timeline with all dates (including zero-count days)
    const timeline = dateRange.map((date) => {
      const dateKey = format(date, "yyyy-MM-dd");
      const data = incidentsByDate[dateKey] || { total: 0, incident: 0, commendation: 0 };
      return {
        date: dateKey,
        dateLabel: format(date, "MMM d"),
        total: data.total,
        incident: data.incident,
        commendation: data.commendation,
      };
    });

    return NextResponse.json({
      ok: true,
      data: timeline,
    });
  } catch (error) {
    console.error("Analytics timeline error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch timeline data" },
      { status: 500 },
    );
  }
}
