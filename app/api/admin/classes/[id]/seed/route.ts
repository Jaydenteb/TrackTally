import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/admin-auth";
import { prisma } from "../../../../../../lib/prisma";

const SAMPLE_STUDENTS = [
  ["S9001", "Ava", "Johnson"],
  ["S9002", "Liam", "Nguyen"],
  ["S9003", "Noah", "Williams"],
  ["S9004", "Olivia", "Brown"],
  ["S9005", "Mia", "Taylor"],
  ["S9006", "Lucas", "Anderson"],
  ["S9007", "Sophie", "Martin"],
  ["S9008", "Ethan", "Clark"],
  ["S9009", "Isabella", "Lewis"],
  ["S9010", "Henry", "Walker"],
];

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  const { error, rateHeaders } = await requireAdmin(request);
  if (error) return error;

  try {
    await prisma.$transaction(
      SAMPLE_STUDENTS.map(([studentId, firstName, lastName]) =>
        prisma.student.upsert({
          where: { studentId },
          update: {
            firstName,
            lastName,
            active: true,
            classroomId: params.id,
          },
          create: {
            studentId,
            firstName,
            lastName,
            classroomId: params.id,
          },
        }),
      ),
    );

    const response = NextResponse.json({
      ok: true,
      added: SAMPLE_STUDENTS.length,
    });
    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
  } catch (err) {
    console.error("Failed to seed sample students", err);
    return NextResponse.json(
      { ok: false, error: "Could not add sample students." },
      { status: 500 },
    );
  }
}
