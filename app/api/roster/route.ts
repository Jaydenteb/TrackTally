import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase();
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

  if (!teacher) {
    return NextResponse.json({ ok: false, error: "Not provisioned" }, { status: 403 });
  }

  let classrooms;

  if (teacher.role === "admin") {
    classrooms = await prisma.classroom.findMany({
      where: { archived: false },
      orderBy: { name: "asc" },
      include: {
        students: { where: { active: true }, orderBy: [{ lastName: "asc" }] },
        homeroomTeacher: { select: { id: true, email: true, displayName: true } },
      },
    });
  } else {
    const specialistIds = teacher.classes.map((item) => item.classroomId);
    const homeroom = teacher.homeroomClassrooms.map((cls) => cls.id);
    const classIds = Array.from(new Set([...specialistIds, ...homeroom]));

    classrooms = await prisma.classroom.findMany({
      where: { id: { in: classIds }, archived: false },
      orderBy: { name: "asc" },
      include: {
        students: { where: { active: true }, orderBy: [{ lastName: "asc" }] },
        homeroomTeacher: { select: { id: true, email: true, displayName: true } },
      },
    });
  }

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
