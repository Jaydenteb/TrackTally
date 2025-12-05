import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireAdmin } from "../../../../../../lib/admin-auth";
import { subDays, startOfDay, endOfDay } from "date-fns";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { organizationId } = authResult;
  const { id: studentId } = await context.params;
  const { searchParams } = new URL(request.url);

  // Parse query params
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const typeFilter = searchParams.get("type") as "incident" | "commendation" | null;
  const days = parseInt(searchParams.get("days") || "90", 10);

  const now = new Date();
  const defaultStart = startOfDay(subDays(now, days - 1));
  const defaultEnd = endOfDay(now);

  const startDate = startDateParam ? new Date(startDateParam) : defaultStart;
  const endDate = endDateParam ? new Date(endDateParam) : defaultEnd;

  try {
    // Get student info
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        classroom: {
          include: {
            homeroomTeacher: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { ok: false, error: "Student not found" },
        { status: 404 },
      );
    }

    // Build where clause
    const whereClause: any = {
      studentId: student.studentId,
      ...(organizationId ? { organizationId } : {}),
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (typeFilter) {
      whereClause.type = typeFilter;
    }

    // Get incidents for this student
    const incidents = await prisma.incident.findMany({
      where: whereClause,
      orderBy: { timestamp: "desc" },
      include: {
        classroom: true,
      },
    });

    // Get summary statistics
    const totalIncidents = await prisma.incident.count({
      where: {
        studentId: student.studentId,
        ...(organizationId ? { organizationId } : {}),
        type: "incident",
      },
    });

    const totalCommendations = await prisma.incident.count({
      where: {
        studentId: student.studentId,
        ...(organizationId ? { organizationId } : {}),
        type: "commendation",
      },
    });

    const incidentsByLevel = await prisma.incident.groupBy({
      by: ["level"],
      where: {
        studentId: student.studentId,
        ...(organizationId ? { organizationId } : {}),
        type: "incident",
      },
      _count: true,
    });

    const incidentsByCategory = await prisma.incident.groupBy({
      by: ["category"],
      where: {
        studentId: student.studentId,
        ...(organizationId ? { organizationId } : {}),
      },
      _count: true,
      orderBy: {
        _count: {
          category: "desc",
        },
      },
      take: 5,
    });

    // Get recent trend (last 30 days vs previous 30)
    const last30Days = await prisma.incident.count({
      where: {
        studentId: student.studentId,
        ...(organizationId ? { organizationId } : {}),
        type: "incident",
        timestamp: {
          gte: startOfDay(subDays(now, 30)),
          lte: endOfDay(now),
        },
      },
    });

    const previous30Days = await prisma.incident.count({
      where: {
        studentId: student.studentId,
        ...(organizationId ? { organizationId } : {}),
        type: "incident",
        timestamp: {
          gte: startOfDay(subDays(now, 60)),
          lt: startOfDay(subDays(now, 30)),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        student: {
          id: student.id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          name: `${student.firstName} ${student.lastName}`,
          classroom: student.classroom
            ? {
                id: student.classroom.id,
                name: student.classroom.name,
                code: student.classroom.code,
                teacher: student.classroom.homeroomTeacher
                  ? {
                      name: student.classroom.homeroomTeacher.displayName || student.classroom.homeroomTeacher.email,
                      email: student.classroom.homeroomTeacher.email,
                    }
                  : null,
              }
            : null,
        },
        incidents,
        stats: {
          totalIncidents,
          totalCommendations,
          last30Days,
          previous30Days,
          trend:
            previous30Days > 0
              ? (((last30Days - previous30Days) / previous30Days) * 100).toFixed(0)
              : last30Days > 0
                ? "+100"
                : "0",
          byLevel: incidentsByLevel.map((item) => ({
            level: item.level,
            count: item._count,
          })),
          topCategories: incidentsByCategory.map((item) => ({
            category: item.category,
            count: item._count,
          })),
        },
      },
    });
  } catch (error) {
    console.error("Student incidents fetch error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch student incidents" },
      { status: 500 },
    );
  }
}
