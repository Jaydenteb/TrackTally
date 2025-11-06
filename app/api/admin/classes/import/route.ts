import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAdmin } from "../../../../../lib/admin-auth";
import { sanitize } from "../../../../../lib/validation";

type RosterRow = {
  studentId: string;
  firstName: string;
  lastName: string;
  guardians?: string;
};

const HEADER_MAP: Record<string, "studentId" | "firstName" | "lastName" | "guardians"> = {
  studentid: "studentId",
  student_id: "studentId",
  student: "studentId",
  id: "studentId",
  firstname: "firstName",
  first_name: "firstName",
  givenname: "firstName",
  preferred: "firstName",
  preferredname: "firstName",
  preferredfirstname: "firstName",
  preferredgivenname: "firstName",
  preferredfirst: "firstName",
  lastname: "lastName",
  last_name: "lastName",
  surname: "lastName",
  guardians: "guardians",
  guardianemails: "guardians",
  guardianemail: "guardians",
  guardiansemail: "guardians",
};

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function splitCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map((cell) => cell.replace(/^"|"$/g, "").trim());
}

function parseCsv(text: string, mapping?: Partial<Record<"studentId" | "firstName" | "lastName" | "guardians", string>>): RosterRow[] {
  const trimmed = text.replace(/^\uFEFF/, "");
  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const headerCells = splitCsvLine(lines[0]);
  const columnMap: Record<"studentId" | "firstName" | "lastName" | "guardians", number> = {
    studentId: -1,
    firstName: -1,
    lastName: -1,
    guardians: -1,
  };

  if (mapping) {
    (["studentId", "firstName", "lastName", "guardians"] as const).forEach((key) => {
      const target = mapping[key];
      if (!target) return;
      const idx = headerCells.findIndex(
        (cell) => normalise(cell) === normalise(String(target)),
      );
      columnMap[key] = idx;
    });
  }

  headerCells.forEach((cell, index) => {
    const key = HEADER_MAP[normalise(cell)];
    if (!key) return;
    if (columnMap[key] === -1) {
      columnMap[key] = index;
    }
  });

  if (columnMap.studentId === undefined || columnMap.firstName === undefined || columnMap.lastName === undefined) {
    throw new Error("CSV must include studentId, firstName, and lastName columns.");
  }

  return lines.slice(1).map((row) => {
    const cells = splitCsvLine(row);
    return {
      studentId: cells[columnMap.studentId] ?? "",
      firstName: cells[columnMap.firstName] ?? "",
      lastName: cells[columnMap.lastName] ?? "",
      guardians:
        columnMap.guardians !== undefined ? cells[columnMap.guardians] ?? "" : undefined,
    };
  });
}

export async function POST(request: Request) {
  const { error, rateHeaders } = await requireAdmin(request);
  if (error) return error;

  const form = await request.formData();
  const classroomId = String(form.get("classroomId") ?? "");
  const file = form.get("file");
  const mappingRaw = form.get("mapping");
  let mapping: Partial<Record<"studentId" | "firstName" | "lastName" | "guardians", string>> | undefined;

  if (typeof mappingRaw === "string" && mappingRaw.trim()) {
    try {
      mapping = JSON.parse(mappingRaw);
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid mapping payload." }, { status: 400 });
    }
  }

  if (!classroomId) {
    return NextResponse.json({ ok: false, error: "classroomId is required." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "CSV file is required." }, { status: 400 });
  }

  const fileContent = await file.text();

  let rows: RosterRow[] = [];
  try {
    rows = parseCsv(fileContent, mapping);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to parse CSV." },
      { status: 400 },
    );
  }

  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: "CSV is empty." }, { status: 400 });
  }

  const now = new Date();

  try {
    let imported = 0;
    for (const row of rows) {
      if (!row.studentId || !row.firstName || !row.lastName) continue;

      const studentId = sanitize(row.studentId);
      const firstName = sanitize(row.firstName);
      const lastName = sanitize(row.lastName);

      if (!studentId || !firstName || !lastName) continue;

      await prisma.student.upsert({
        where: { studentId },
        update: {
          firstName,
          lastName,
          guardians: sanitize(row.guardians ?? "") || null,
          active: true,
          classroomId,
        },
        create: {
          studentId,
          firstName,
          lastName,
          guardians: sanitize(row.guardians ?? "") || null,
          classroomId,
          createdAt: now,
        },
      });
      imported += 1;
    }

    const response = NextResponse.json({ ok: true, imported });
    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
  } catch (err) {
    console.error("Failed to import roster", err);
    return NextResponse.json(
      { ok: false, error: "Could not import roster." },
      { status: 500 },
    );
  }
}
