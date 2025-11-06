import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/admin-auth";
import { sanitizeOptional, teacherCreateSchema } from "../../../../lib/validation";

export async function GET(request: Request) {
  const { error, rateHeaders } = await requireAdmin(request);
  if (error) return error;

  const teachers = await prisma.teacher.findMany({
    orderBy: { email: "asc" },
    include: {
      homeroomClassrooms: { select: { id: true, name: true, code: true } },
      classes: {
        include: {
          classroom: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });

  const response = NextResponse.json({
    ok: true,
    data: teachers.map((teacher) => ({
      id: teacher.id,
      email: teacher.email,
      displayName: teacher.displayName,
      role: teacher.role,
      isSpecialist: teacher.isSpecialist,
      active: teacher.active,
      homeroomClass: teacher.homeroomClassrooms[0]
        ? {
            id: teacher.homeroomClassrooms[0].id,
            name: teacher.homeroomClassrooms[0].name,
            code: teacher.homeroomClassrooms[0].code,
          }
        : null,
      specialistClasses: teacher.classes.map((item) => ({
        id: item.classroom.id,
        name: item.classroom.name,
        code: item.classroom.code,
      })),
    })),
  });

  if (rateHeaders) {
    Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
  }

  return response;
}

export async function POST(request: Request) {
  const { error, rateHeaders } = await requireAdmin(request);
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = teacherCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 },
    );
  }

  const classroomIds = Array.from(new Set(parsed.data.classroomIds));
  const displayName = sanitizeOptional(parsed.data.displayName);

  try {
    const teacher = await prisma.teacher.create({
      data: {
        email: parsed.data.email,
        displayName,
        role: parsed.data.role,
        isSpecialist: parsed.data.isSpecialist,
        classes: {
          create: classroomIds.map((classroomId) => ({
            classroom: { connect: { id: classroomId } },
          })),
        },
      },
      include: {
        classes: { include: { classroom: true } },
      },
    });

    const response = NextResponse.json({ ok: true, data: teacher }, { status: 201 });
    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
  } catch (err) {
    console.error("Failed to create teacher", err);
    return NextResponse.json(
      { ok: false, error: "Could not create teacher." },
      { status: 500 },
    );
  }
}
