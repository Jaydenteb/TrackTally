import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAdmin } from "../../../../../lib/admin-auth";
import { sanitizeOptional, studentUpdateSchema } from "../../../../../lib/validation";
import { resolveOrganizationIdForRequest } from "../../../../../lib/organizations";
import { createAuditLog, AuditActions } from "../../../../../lib/audit";

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

export async function PATCH(request: Request, { params }: Params) {
  const { error, rateHeaders, organizationId, session } = await requireAdmin(request);
  if (error) return error;

  let targetOrgId: string;
  try {
    targetOrgId = await getOrgIdFromRequest(request, session, organizationId ?? null);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Invalid organization." }, { status: 400 });
  }

  const studentRecord = await prisma.student.findUnique({
    where: { id: params.id },
    select: { organizationId: true },
  });
  if (!studentRecord || studentRecord.organizationId !== targetOrgId) {
    return NextResponse.json({ ok: false, error: "Student not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = studentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};

  if (parsed.data.studentId !== undefined) {
    const cleaned = sanitizeOptional(parsed.data.studentId);
    if (!cleaned) {
      return NextResponse.json(
        { ok: false, error: "Student ID cannot be empty." },
        { status: 400 },
      );
    }
    updates.studentId = cleaned;
  }

  if (parsed.data.firstName !== undefined) {
    const cleaned = sanitizeOptional(parsed.data.firstName);
    if (!cleaned) {
      return NextResponse.json(
        { ok: false, error: "First name cannot be empty." },
        { status: 400 },
      );
    }
    updates.firstName = cleaned;
  }

  if (parsed.data.lastName !== undefined) {
    const cleaned = sanitizeOptional(parsed.data.lastName);
    if (!cleaned) {
      return NextResponse.json(
        { ok: false, error: "Last name cannot be empty." },
        { status: 400 },
      );
    }
    updates.lastName = cleaned;
  }

  if (parsed.data.guardians !== undefined) {
    updates.guardians = sanitizeOptional(parsed.data.guardians) ?? null;
  }

  if (parsed.data.notes !== undefined) {
    updates.notes = sanitizeOptional(parsed.data.notes) ?? null;
  }

  if (parsed.data.active !== undefined) {
    updates.active = parsed.data.active;
  }

  if (parsed.data.classroomId !== undefined) {
    if (parsed.data.classroomId === null) {
      updates.classroomId = null;
    } else {
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
      updates.classroomId = parsed.data.classroomId;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { ok: false, error: "No valid fields provided for update." },
      { status: 400 },
    );
  }

  try {
    const student = await prisma.student.update({
      where: { id: params.id },
      data: updates,
    });

    // Audit log
    await createAuditLog({
      action: AuditActions.UPDATE_STUDENT,
      performedBy: session.user?.email ?? "unknown",
      meta: {
        studentId: student.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        updates: Object.keys(updates),
        organizationId: targetOrgId,
      },
    });

    const response = NextResponse.json({ ok: true, data: student });
    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
  } catch (err) {
    console.error("Failed to update student", err);
    return NextResponse.json(
      { ok: false, error: "Could not update student." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { error, rateHeaders, organizationId, session } = await requireAdmin(request);
  if (error) return error;

  let targetOrgId: string;
  try {
    targetOrgId = await getOrgIdFromRequest(request, session, organizationId ?? null);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Invalid organization." }, { status: 400 });
  }

  try {
    const updated = await prisma.student.updateMany({
      where: { id: params.id, organizationId: targetOrgId },
      data: { active: false },
    });
    if (updated.count === 0) {
      return NextResponse.json({ ok: false, error: "Student not found." }, { status: 404 });
    }
    const response = NextResponse.json({ ok: true });
    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
  } catch (err) {
    console.error("Failed to archive student", err);
    return NextResponse.json(
      { ok: false, error: "Could not archive student." },
      { status: 500 },
    );
  }
}
