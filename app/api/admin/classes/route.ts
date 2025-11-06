import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/admin-auth";
import { classroomCreateSchema, sanitize } from "../../../../lib/validation";

export async function GET(request: Request) {
  const { error, rateHeaders } = await requireAdmin(request);
  if (error) return error;

  const classes = await prisma.classroom.findMany({
    orderBy: { name: "asc" },
    include: {
      students: { where: { active: true }, select: { id: true } },
      homeroomTeacher: { select: { id: true, email: true, displayName: true } },
      specialists: {
        include: {
          teacher: { select: { id: true, email: true, displayName: true, isSpecialist: true } },
        },
      },
    },
  });

  const response = NextResponse.json({
    ok: true,
    data: classes.map((cls) => ({
      id: cls.id,
      name: cls.name,
      code: cls.code,
      archived: cls.archived,
      homeroomTeacher: cls.homeroomTeacher
        ? {
            id: cls.homeroomTeacher.id,
            email: cls.homeroomTeacher.email,
            displayName: cls.homeroomTeacher.displayName,
          }
        : null,
      specialistTeachers: cls.specialists.map((specialist) => ({
        id: specialist.teacher.id,
        email: specialist.teacher.email,
        displayName: specialist.teacher.displayName,
        isSpecialist: specialist.teacher.isSpecialist,
      })),
      studentCount: cls.students.length,
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

  const parsed = classroomCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 },
    );
  }

  const name = sanitize(parsed.data.name);
  const code = sanitize(parsed.data.code);
  const homeroomTeacherId = parsed.data.homeroomTeacherId ?? undefined;

  if (!name || !code) {
    return NextResponse.json(
      { ok: false, error: "Class name and code are required." },
      { status: 400 },
    );
  }

  if (homeroomTeacherId) {
    const teacherExists = await prisma.teacher.findUnique({
      where: { id: homeroomTeacherId },
      select: { id: true },
    });
    if (!teacherExists) {
      return NextResponse.json(
        { ok: false, error: "Homeroom teacher not found." },
        { status: 404 },
      );
    }
  }

  try {
    const classroom = await prisma.classroom.create({
      data: {
        name,
        code,
        homeroomTeacherId: homeroomTeacherId ?? null,
      },
    });

    const response = NextResponse.json({ ok: true, data: classroom }, { status: 201 });
    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
  } catch (err) {
    console.error("Failed to create classroom", err);
    return NextResponse.json(
      { ok: false, error: "Could not create classroom." },
      { status: 500 },
    );
  }
}
