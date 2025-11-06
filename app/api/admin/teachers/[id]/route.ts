import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAdmin } from "../../../../../lib/admin-auth";
import { sanitizeOptional, teacherUpdateSchema } from "../../../../../lib/validation";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  const { error, rateHeaders } = await requireAdmin(request);
  if (error) return error;

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
    return NextResponse.json(
      { ok: false, error: "Could not update teacher." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { error, rateHeaders } = await requireAdmin(request);
  if (error) return error;

  try {
    await prisma.teacher.update({
      where: { id: params.id },
      data: { active: false },
    });
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
