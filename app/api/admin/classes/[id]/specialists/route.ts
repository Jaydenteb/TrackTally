import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireAdmin } from "../../../../../../lib/admin-auth";
import { classroomSpecialistSchema } from "../../../../../../lib/validation";

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  const { error, rateHeaders } = await requireAdmin(request);
  if (error) return error;

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
    await prisma.teacherClass.deleteMany({ where: { classroomId: params.id } });

    if (teacherIds.length > 0) {
      await prisma.teacherClass.createMany({
        data: teacherIds.map((teacherId) => ({
          teacherId,
          classroomId: params.id,
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
