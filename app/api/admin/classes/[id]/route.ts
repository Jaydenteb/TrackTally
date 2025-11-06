import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAdmin } from "../../../../../lib/admin-auth";
import { classroomUpdateSchema, sanitize } from "../../../../../lib/validation";

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

  const parsed = classroomUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 },
    );
  }

  const updates: {
    name?: string;
    code?: string;
    archived?: boolean;
    homeroomTeacherId?: string | null;
  } = {};

  if (parsed.data.name !== undefined) {
    const cleaned = sanitize(parsed.data.name);
    if (!cleaned) {
      return NextResponse.json(
        { ok: false, error: "Class name cannot be empty." },
        { status: 400 },
      );
    }
    updates.name = cleaned;
  }

  if (parsed.data.code !== undefined) {
    const cleaned = sanitize(parsed.data.code);
    if (!cleaned) {
      return NextResponse.json(
        { ok: false, error: "Class code cannot be empty." },
        { status: 400 },
      );
    }
    updates.code = cleaned;
  }

  if (parsed.data.archived !== undefined) {
    updates.archived = parsed.data.archived;
  }

  let homeroomTeacherId = parsed.data.homeroomTeacherId ?? undefined;
  if (homeroomTeacherId !== undefined) {
    if (homeroomTeacherId === null) {
      updates.homeroomTeacherId = null;
    } else {
      const exists = await prisma.teacher.findUnique({
        where: { id: homeroomTeacherId },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json(
          { ok: false, error: "Homeroom teacher not found." },
          { status: 404 },
        );
      }
      updates.homeroomTeacherId = homeroomTeacherId;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { ok: false, error: "No valid fields provided for update." },
      { status: 400 },
    );
  }

  try {
    const classroom = await prisma.classroom.update({
      where: { id: params.id },
      data: updates,
    });

    const response = NextResponse.json({ ok: true, data: classroom });
    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
  } catch (err) {
    console.error("Failed to update classroom", err);
    return NextResponse.json(
      { ok: false, error: "Could not update classroom." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { error, rateHeaders } = await requireAdmin(request);
  if (error) return error;

  try {
    await prisma.classroom.update({
      where: { id: params.id },
      data: { archived: true },
    });
    const response = NextResponse.json({ ok: true });
    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
  } catch (err) {
    console.error("Failed to archive classroom", err);
    return NextResponse.json(
      { ok: false, error: "Could not archive classroom." },
      { status: 500 },
    );
  }
}
