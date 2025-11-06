import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/admin-auth";
import { sanitizeOptional, studentCreateSchema } from "../../../../lib/validation";

export async function GET(request: Request) {
  const { error, rateHeaders } = await requireAdmin(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const classroomId = searchParams.get("classroomId") ?? undefined;
  const includeInactive = searchParams.get("includeInactive") === "true";

  const students = await prisma.student.findMany({
    where: {
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
  const { error, rateHeaders } = await requireAdmin(request);
  if (error) return error;

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
    const student = await prisma.student.create({
      data: {
        studentId: parsed.data.studentId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        classroomId: parsed.data.classroomId ?? null,
        guardians: sanitizeOptional(parsed.data.guardians) ?? null,
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
