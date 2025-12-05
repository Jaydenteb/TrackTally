import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireAdmin } from "../../../../../../lib/admin-auth";
import { classroomSpecialistSchema } from "../../../../../../lib/validation";
import { resolveOrganizationIdForRequest } from "../../../../../../lib/organizations";

type Params = { params: Promise<{ id: string }> };

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
  const { id } = await params;

  let targetOrgId: string;
  try {
    targetOrgId = await getOrgIdFromRequest(request, session, organizationId ?? null);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Invalid organization." }, { status: 400 });
  }

  const classroomRecord = await prisma.classroom.findUnique({
    where: { id },
    select: { organizationId: true },
  });
  if (!classroomRecord || classroomRecord.organizationId !== targetOrgId) {
    return NextResponse.json({ ok: false, error: "Classroom not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = classroomSpecialistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 },
    );
  }

  const teacherIds = parsed.data.teacherIds;

  try {
    const validTeachers = await prisma.teacher.findMany({
      where: { id: { in: teacherIds }, organizationId: targetOrgId },
      select: { id: true },
    });
    if (validTeachers.length !== teacherIds.length) {
      return NextResponse.json(
        { ok: false, error: "One or more teachers not found in this organization." },
        { status: 404 },
      );
    }

    await prisma.teacherClass.deleteMany({ where: { classroomId: id } });

    if (teacherIds.length > 0) {
      await prisma.teacherClass.createMany({
        data: teacherIds.map((teacherId) => ({
          teacherId,
          classroomId: id,
        })),
      });
    }

    const response = NextResponse.json({ ok: true });
    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
  } catch (err) {
    console.error("Failed to update specialist assignments", err);
    return NextResponse.json(
      { ok: false, error: "Could not update specialist assignments." },
      { status: 500 },
    );
  }
}
