import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/admin-auth";
import { sanitizeOptional, teacherCreateSchema } from "../../../../lib/validation";
import { resolveOrganizationIdForRequest } from "../../../../lib/organizations";

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

  let targetOrgId: string;
  try {
    targetOrgId = await getOrgIdFromRequest(request, session, organizationId ?? null);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Invalid organization." }, { status: 400 });
  }

  const teachers = await prisma.teacher.findMany({
    where: { organizationId: targetOrgId },
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
  const { error, rateHeaders, organizationId, session } = await requireAdmin(request);
  if (error) return error;

  let targetOrgId: string;
  try {
    targetOrgId = await getOrgIdFromRequest(request, session, organizationId ?? null);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Invalid organization." }, { status: 400 });
  }

  const targetOrg = await prisma.organization.findUnique({
    where: { id: targetOrgId },
    select: { id: true, domain: true },
  });
  if (!targetOrg) {
    return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });
  }

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

  // TODO: Re-enable email domain validation in production
  // For now, allowing any email domain for testing multiple organizations
  // const emailDomain = parsed.data.email.toLowerCase().split("@")[1] ?? "";
  // if (emailDomain !== targetOrg.domain) {
  //   return NextResponse.json(
  //     { ok: false, error: "Email domain does not match this organization." },
  //     { status: 400 },
  //   );
  // }

  const classrooms = await prisma.classroom.findMany({
    where: { id: { in: classroomIds }, organizationId: targetOrgId },
    select: { id: true },
  });
  if (classrooms.length !== classroomIds.length) {
    return NextResponse.json(
      { ok: false, error: "One or more classrooms not found in this organization." },
      { status: 404 },
    );
  }

  try {
    const teacher = await prisma.teacher.create({
      data: {
        email: parsed.data.email,
        displayName,
        role: parsed.data.role,
        isSpecialist: parsed.data.isSpecialist,
        organizationId: targetOrgId,
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
