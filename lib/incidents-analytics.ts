import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export type IncidentFilters = {
  organizationId: string;
  dateFrom?: string;
  dateTo?: string;
  studentId?: string;
  teacherEmail?: string;
  classroomId?: string;
  level?: string;
  category?: string;
  type?: "incident" | "commendation";
  page?: number;
  limit?: number;
  sortBy?: "timestamp" | "studentName" | "level" | "category";
  sortOrder?: "asc" | "desc";
};

export type IncidentWithRelations = {
  id: string;
  uuid: string;
  timestamp: Date;
  type: string;
  studentId: string | null;
  studentName: string;
  classroomId: string | null;
  classCode: string | null;
  teacherEmail: string;
  level: string;
  category: string;
  location: string;
  actionTaken: string | null;
  note: string | null;
  device: string | null;
  student: {
    firstName: string;
    lastName: string;
  } | null;
  classroom: {
    name: string;
    code: string;
  } | null;
};

export type IncidentStats = {
  total: number;
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  thisWeek: number;
  lastWeek: number;
  changePercent: number;
};

/**
 * Build Prisma where clause from filters
 */
function buildWhereClause(filters: IncidentFilters): Prisma.IncidentWhereInput {
  const where: Prisma.IncidentWhereInput = {
    organizationId: filters.organizationId,
  };

  if (filters.dateFrom || filters.dateTo) {
    where.timestamp = {};
    if (filters.dateFrom) {
      where.timestamp.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      // Include the entire end date by setting to end of day
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.timestamp.lte = endDate;
    }
  }

  if (filters.studentId) {
    where.studentId = filters.studentId;
  }

  if (filters.teacherEmail) {
    where.teacherEmail = filters.teacherEmail;
  }

  if (filters.classroomId) {
    where.classroomId = filters.classroomId;
  }

  if (filters.level) {
    where.level = filters.level;
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  return where;
}

/**
 * Get incidents with filters, pagination, and sorting
 */
export async function getIncidentsWithFilters(filters: IncidentFilters) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const skip = (page - 1) * limit;
  const sortBy = filters.sortBy ?? "timestamp";
  const sortOrder = filters.sortOrder ?? "desc";

  const where = buildWhereClause(filters);

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        classroom: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    }),
    prisma.incident.count({ where }),
  ]);

  return {
    incidents: incidents as IncidentWithRelations[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get incident statistics with filters
 */
export async function getIncidentStats(filters: IncidentFilters): Promise<IncidentStats> {
  const where = buildWhereClause(filters);

  // Get all incidents matching filters
  const incidents = await prisma.incident.findMany({
    where,
    select: {
      level: true,
      category: true,
      type: true,
      timestamp: true,
    },
  });

  // Calculate stats
  const total = incidents.length;
  const byLevel: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byType: Record<string, number> = {};

  incidents.forEach((incident) => {
    byLevel[incident.level] = (byLevel[incident.level] ?? 0) + 1;
    byCategory[incident.category] = (byCategory[incident.category] ?? 0) + 1;
    byType[incident.type] = (byType[incident.type] ?? 0) + 1;
  });

  // Calculate this week vs last week
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfWeek.getDate() - 7);

  const thisWeek = incidents.filter((i) => i.timestamp >= startOfWeek).length;
  const lastWeek = incidents.filter(
    (i) => i.timestamp >= startOfLastWeek && i.timestamp < startOfWeek
  ).length;

  const changePercent = lastWeek === 0 ? 0 : ((thisWeek - lastWeek) / lastWeek) * 100;

  return {
    total,
    byLevel,
    byCategory,
    byType,
    thisWeek,
    lastWeek,
    changePercent,
  };
}

/**
 * Generate CSV content from incidents
 */
export async function generateIncidentCSV(filters: IncidentFilters): Promise<string> {
  // Get all incidents without pagination for export
  const where = buildWhereClause(filters);

  const incidents = await prisma.incident.findMany({
    where,
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      classroom: {
        select: {
          name: true,
          code: true,
        },
      },
    },
    orderBy: {
      timestamp: "desc",
    },
  });

  // CSV headers
  const headers = [
    "Date",
    "Time",
    "Type",
    "Student ID",
    "Student Name",
    "Level",
    "Category",
    "Location",
    "Action Taken",
    "Note",
    "Teacher Email",
    "Class Code",
    "Class Name",
    "Device",
    "UUID",
  ];

  // Escape CSV field
  const escapeCSV = (value: string | null | undefined): string => {
    if (value == null) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Build CSV rows
  const rows = incidents.map((incident) => {
    const date = new Date(incident.timestamp);
    const fullName = incident.student
      ? `${incident.student.firstName} ${incident.student.lastName}`
      : incident.studentName;

    return [
      escapeCSV(date.toLocaleDateString()),
      escapeCSV(date.toLocaleTimeString()),
      escapeCSV(incident.type),
      escapeCSV(incident.studentId),
      escapeCSV(fullName),
      escapeCSV(incident.level),
      escapeCSV(incident.category),
      escapeCSV(incident.location),
      escapeCSV(incident.actionTaken),
      escapeCSV(incident.note),
      escapeCSV(incident.teacherEmail),
      escapeCSV(incident.classCode ?? incident.classroom?.code),
      escapeCSV(incident.classroom?.name),
      escapeCSV(incident.device),
      escapeCSV(incident.uuid),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}
