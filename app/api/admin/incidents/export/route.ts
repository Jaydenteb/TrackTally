import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/admin-auth";
import { prisma } from "../../../../../lib/prisma";
import { recordAuditLog } from "../../../../../lib/settings";
import { resolveOrganizationIdForRequest } from "../../../../../lib/organizations";

async function getOrgIdFromRequest(request: Request, session: Session, baseOrgId: string | null) {
  const url = new URL(request.url);
  const requestedDomain = url.searchParams.get("domain");
  return resolveOrganizationIdForRequest({
    session,
    baseOrganizationId: baseOrgId,
    requestedDomain: requestedDomain ?? undefined,
  });
}

function toCsvValue(value: string | null | undefined) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes("\"") || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
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

  const incidents = await prisma.incident.findMany({
    where: { organizationId: targetOrgId },
    orderBy: { timestamp: "desc" },
    include: {
      classroom: { select: { name: true, code: true } },
    },
  });

  const header = [
    "timestamp",
    "studentId",
    "studentName",
    "level",
    "category",
    "location",
    "actionTaken",
    "note",
    "teacherEmail",
    "classCode",
    "device",
    "uuid",
  ];

  const rows = incidents.map((incident) => [
    incident.timestamp.toISOString(),
    incident.studentId ?? "",
    incident.studentName,
    incident.level,
    incident.category,
    incident.location,
    incident.actionTaken ?? "",
    incident.note ?? "",
    incident.teacherEmail,
    incident.classroom?.code ?? incident.classCode ?? "",
    incident.device ?? "",
    incident.uuid,
  ]);

  const csv = [header, ...rows]
    .map((line) => line.map((cell) => toCsvValue(cell)).join(","))
    .join("\n");

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
  await recordAuditLog("incidents.export", performer, { count: incidents.length });

  return response;
}
