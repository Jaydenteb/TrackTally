import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { resolveOrganizationIdForRequest } from "../../../lib/organizations";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase();
  const role = session.user.role ?? "teacher";

  // Check if super admin is impersonating an organization
  const { searchParams } = new URL(request.url);
  const requestedDomain = searchParams.get("domain");

  let targetOrgId: string | null = null;

  // Super admins can view any organization's roster
  if (role === "superadmin" && requestedDomain) {
    try {
      targetOrgId = await resolveOrganizationIdForRequest({
        session,
        baseOrganizationId: null,
        requestedDomain,
      });
    } catch (err) {
      return NextResponse.json({ ok: false, error: "Invalid organization" }, { status: 400 });
    }
  } else {
    // Regular teachers/admins must have a teacher record
    const teacher = await prisma.teacher.findUnique({
      where: { email },
      include: {
        homeroomClassrooms: { select: { id: true } },
        classes: {
          include: {
            classroom: {
              include: {
                students: { where: { active: true } },
                homeroomTeacher: { select: { id: true, email: true, displayName: true } },
              },
            },
          },
        },
      },
    });

    if (!teacher || !teacher.organizationId) {
      return NextResponse.json({ ok: false, error: "Not provisioned" }, { status: 403 });
    }

    targetOrgId = teacher.organizationId;

    // If teacher is not a super admin and they're requesting a specific org, verify access
    if (requestedDomain && role !== "superadmin") {
      const requestedOrg = await prisma.organization.findUnique({
        where: { domain: requestedDomain },
        select: { id: true },
      });
      if (!requestedOrg || requestedOrg.id !== teacher.organizationId) {
        return NextResponse.json({ ok: false, error: "Access denied" }, { status: 403 });
      }
    }

    // For regular admins, return all classes in their org
    if (teacher.role === "admin") {
      const classrooms = await prisma.classroom.findMany({
        where: { archived: false, organizationId: teacher.organizationId },
        orderBy: { name: "asc" },
        include: {
          students: { where: { active: true }, orderBy: [{ lastName: "asc" }] },
          homeroomTeacher: { select: { id: true, email: true, displayName: true } },
        },
      });

      return NextResponse.json({
        ok: true,
        data: classrooms.map((cls) => ({
          id: cls.id,
          name: cls.name,
          code: cls.code,
          homeroomTeacher: cls.homeroomTeacher,
          students: cls.students.map((student) => ({
            id: student.id,
            studentId: student.studentId,
            firstName: student.firstName,
            lastName: student.lastName,
            classId: cls.id,
          })),
        })),
      });
    }

    // For regular teachers, return only their assigned classes
    const specialistIds = teacher.classes.map((item) => item.classroomId);
    const homeroom = teacher.homeroomClassrooms.map((cls) => cls.id);
    const classIds = Array.from(new Set([...specialistIds, ...homeroom]));

    const classrooms = await prisma.classroom.findMany({
      where: { id: { in: classIds }, archived: false, organizationId: teacher.organizationId },
      orderBy: { name: "asc" },
      include: {
        students: { where: { active: true }, orderBy: [{ lastName: "asc" }] },
        homeroomTeacher: { select: { id: true, email: true, displayName: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      data: classrooms.map((cls) => ({
        id: cls.id,
        name: cls.name,
        code: cls.code,
        homeroomTeacher: cls.homeroomTeacher,
        students: cls.students.map((student) => ({
          id: student.id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          classId: cls.id,
        })),
      })),
    });
  }

  // Super admin viewing a specific organization - show all classes
  const classrooms = await prisma.classroom.findMany({
    where: { archived: false, organizationId: targetOrgId },
    orderBy: { name: "asc" },
    include: {
      students: { where: { active: true }, orderBy: [{ lastName: "asc" }] },
      homeroomTeacher: { select: { id: true, email: true, displayName: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    data: classrooms.map((cls) => ({
      id: cls.id,
      name: cls.name,
      code: cls.code,
      homeroomTeacher: cls.homeroomTeacher,
      students: cls.students.map((student) => ({
        id: student.id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        classId: cls.id,
      })),
    })),
  });
}
