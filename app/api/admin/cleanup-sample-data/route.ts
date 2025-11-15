import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { prisma } from "../../../../lib/prisma";
import { resolveOrganizationIdForRequest } from "../../../../lib/organizations";

const SAMPLE_STUDENT_IDS = ["S9001", "S9002", "S9003", "S9004", "S9005", "S9006", "S9007", "S9008", "S9009", "S9010"];
const SAMPLE_CLASS_NAMES = ["Bluegum", "Koalas"];

async function getOrgIdFromRequest(request: Request, session: Session, baseOrgId: string | null) {
  const url = new URL(request.url);
  const requestedDomain = url.searchParams.get("domain");
  return resolveOrganizationIdForRequest({
    session,
    baseOrganizationId: baseOrgId,
    requestedDomain: requestedDomain ?? undefined,
  });
}

export async function POST(request: Request) {
  const { error, rateHeaders, organizationId, session } = await requireAdmin(request);
  if (error) return error;

  let targetOrgId: string;
  try {
    targetOrgId = await getOrgIdFromRequest(request, session, organizationId ?? null);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Invalid organization." }, { status: 400 });
  }

  const sampleClasses = await prisma.classroom.findMany({
    where: { organizationId: targetOrgId, name: { in: SAMPLE_CLASS_NAMES } },
    select: { id: true },
  });
  const sampleClassIds = sampleClasses.map((cls) => cls.id);

  const sampleStudents = await prisma.student.findMany({
    where: { organizationId: targetOrgId, studentId: { in: SAMPLE_STUDENT_IDS } },
    select: { studentId: true },
  });
  const studentIds = sampleStudents.map((student) => student.studentId);

  const [incidentResult, teacherClassResult, studentResult, classResult] = await prisma.$transaction([
    prisma.incident.deleteMany({
      where: {
        organizationId: targetOrgId,
        OR: [{ studentId: { in: studentIds } }, { classroomId: { in: sampleClassIds } }],
      },
    }),
    prisma.teacherClass.deleteMany({
      where: { classroomId: { in: sampleClassIds } },
    }),
    prisma.student.deleteMany({
      where: { organizationId: targetOrgId, studentId: { in: SAMPLE_STUDENT_IDS } },
    }),
    prisma.classroom.deleteMany({
      where: { organizationId: targetOrgId, name: { in: SAMPLE_CLASS_NAMES } },
    }),
  ]);

  const response = NextResponse.json({
    ok: true,
    removedIncidents: incidentResult.count,
    removedTeacherLinks: teacherClassResult.count,
    removedStudents: studentResult.count,
    removedClasses: classResult.count,
  });
  if (rateHeaders) {
    Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
  }
  return response;
}
