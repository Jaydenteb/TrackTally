import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/admin-auth";
import { prisma } from "../../../../../../lib/prisma";
import { resolveOrganizationIdForRequest } from "../../../../../../lib/organizations";

const SAMPLE_STUDENTS = [
  ["S9001", "Ava", "Johnson"],
  ["S9002", "Liam", "Nguyen"],
  ["S9003", "Noah", "Williams"],
  ["S9004", "Olivia", "Brown"],
  ["S9005", "Mia", "Taylor"],
  ["S9006", "Lucas", "Anderson"],
  ["S9007", "Sophie", "Martin"],
  ["S9008", "Ethan", "Clark"],
  ["S9009", "Isabella", "Lewis"],
  ["S9010", "Henry", "Walker"],
];

type Params = { params: { id: string } };

async function getOrgIdFromRequest(request: Request, session: Session, baseOrgId: string | null) {
  const url = new URL(request.url);
  const requestedDomain = url.searchParams.get("domain");
  return resolveOrganizationIdForRequest({
    session,
    baseOrganizationId: baseOrgId,
    requestedDomain: requestedDomain ?? undefined,
  });
}

export async function POST(request: Request, { params }: Params) {
  const { error, rateHeaders, organizationId, session } = await requireAdmin(request);
  if (error) return error;

  let targetOrgId: string;
  try {
    targetOrgId = await getOrgIdFromRequest(request, session, organizationId ?? null);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Invalid organization." }, { status: 400 });
  }

  const classroomRecord = await prisma.classroom.findUnique({
    where: { id: params.id },
    select: { organizationId: true },
  });
  if (!classroomRecord || classroomRecord.organizationId !== targetOrgId) {
    return NextResponse.json({ ok: false, error: "Classroom not found." }, { status: 404 });
  }

  try {
    await prisma.$transaction(
      SAMPLE_STUDENTS.map(([studentId, firstName, lastName]) =>
        prisma.student.upsert({
          where: { studentId },
          update: {
            firstName,
            lastName,
            active: true,
            classroomId: params.id,
            organizationId: targetOrgId,
          },
          create: {
            studentId,
            firstName,
            lastName,
            classroomId: params.id,
            organizationId: targetOrgId,
          },
        }),
      ),
    );

    const response = NextResponse.json({
      ok: true,
      added: SAMPLE_STUDENTS.length,
    });
    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
  } catch (err) {
    console.error("Failed to seed sample students", err);
    return NextResponse.json(
      { ok: false, error: "Could not add sample students." },
      { status: 500 },
    );
  }
}
