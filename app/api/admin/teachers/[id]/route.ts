import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAdmin } from "../../../../../lib/admin-auth";
import { sanitizeOptional, teacherUpdateSchema } from "../../../../../lib/validation";
import { resolveOrganizationIdForRequest } from "../../../../../lib/organizations";

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

  const teacherRecord = await prisma.teacher.findUnique({
    where: { id: params.id },
    select: { organizationId: true },
  });

  if (!teacherRecord || teacherRecord.organizationId !== targetOrgId) {
    return NextResponse.json({ ok: false, error: "Teacher not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = teacherUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 },
    );
  }

  const updates: {
    displayName?: string | null;
    role?: "admin" | "teacher";
    isSpecialist?: boolean;
    active?: boolean;
  } = {};

  if (parsed.data.displayName !== undefined) {
    updates.displayName = sanitizeOptional(parsed.data.displayName) ?? null;
  }

  if (parsed.data.role) {
    updates.role = parsed.data.role;
  }

  if (parsed.data.isSpecialist !== undefined) {
    updates.isSpecialist = parsed.data.isSpecialist;
  }

  if (parsed.data.active !== undefined) {
    updates.active = parsed.data.active;
  }

  const classroomIds = parsed.data.classroomIds
    ? Array.from(new Set(parsed.data.classroomIds))
    : undefined;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const teacher = await tx.teacher.update({
        where: { id: params.id },
        data: updates,
      });

      if (classroomIds) {
        const classrooms = await tx.classroom.findMany({
          where: { id: { in: classroomIds }, organizationId: targetOrgId },
          select: { id: true },
        });
        if (classrooms.length !== classroomIds.length) {
          throw new Error("Invalid classroom selection.");
        }
        await tx.teacherClass.deleteMany({ where: { teacherId: params.id } });
        if (classroomIds.length > 0) {
          await tx.teacherClass.createMany({
            data: classroomIds.map((classroomId) => ({
              teacherId: params.id,
              classroomId,
            })),
          });
        }
      }

      return teacher;
    });

    const response = NextResponse.json({ ok: true, data: updated });
    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
  } catch (err) {
    console.error("Failed to update teacher", err);
    if (err instanceof Error && err.message === "Invalid classroom selection.") {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, error: "Could not update teacher." },
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
    const updated = await prisma.teacher.updateMany({
      where: { id: params.id, organizationId: targetOrgId },
      data: { active: false },
    });
    if (updated.count === 0) {
      return NextResponse.json({ ok: false, error: "Teacher not found." }, { status: 404 });
    }
    const response = NextResponse.json({ ok: true });
    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
  } catch (err) {
    console.error("Failed to deactivate teacher", err);
    return NextResponse.json(
      { ok: false, error: "Could not deactivate teacher." },
      { status: 500 },
    );
  }
}
