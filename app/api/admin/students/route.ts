import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/admin-auth";
import { sanitizeOptional, studentCreateSchema } from "../../../../lib/validation";
import { resolveOrganizationIdForRequest } from "../../../../lib/organizations";
import { createAuditLog, AuditActions } from "../../../../lib/audit";

async function getOrgIdFromRequest(request: Request, session: Session, baseOrgId: string | null) {
  const url = new URL(request.url);
  const requestedDomain = url.searchParams.get("domain");
  return resolveOrganizationIdForRequest({
    session,
    baseOrganizationId: baseOrgId,
    requestedDomain: requestedDomain ?? undefined,
  });
}

export async function GET(request: Request) {
  const { error, rateHeaders, organizationId, session } = await requireAdmin(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const classroomId = searchParams.get("classroomId") ?? undefined;
  const includeInactive = searchParams.get("includeInactive") === "true";
  let targetOrgId: string;
  try {
    targetOrgId = await getOrgIdFromRequest(request, session, organizationId ?? null);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Invalid organization." }, { status: 400 });
  }

  const students = await prisma.student.findMany({
    where: {
      organizationId: targetOrgId,
      classroomId: classroomId || undefined,
      ...(includeInactive ? {} : { active: true }),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const response = NextResponse.json({ ok: true, data: students });
  if (rateHeaders) {
    Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
  }
  return response;
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = studentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.classroomId) {
      const classroom = await prisma.classroom.findFirst({
        where: { id: parsed.data.classroomId, organizationId: targetOrgId },
        select: { id: true },
      });
      if (!classroom) {
        return NextResponse.json(
          { ok: false, error: "Classroom not found in this organization." },
          { status: 404 },
        );
      }
    }

    const student = await prisma.student.create({
      data: {
        studentId: parsed.data.studentId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        classroomId: parsed.data.classroomId ?? null,
        guardians: sanitizeOptional(parsed.data.guardians) ?? null,
        organizationId: targetOrgId,
      },
    });

    // Audit log
    await createAuditLog({
      action: AuditActions.CREATE_STUDENT,
      performedBy: session.user?.email ?? "unknown",
      meta: {
        studentId: student.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        classroomId: student.classroomId,
        organizationId: targetOrgId,
      },
    });

    const response = NextResponse.json({ ok: true, data: student }, { status: 201 });
    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
  } catch (err) {
    console.error("Failed to create student", err);
    return NextResponse.json(
      { ok: false, error: "Could not create student." },
      { status: 500 },
    );
  }
}
