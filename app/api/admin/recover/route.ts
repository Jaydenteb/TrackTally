/**
 * EMERGENCY DATA RECOVERY ENDPOINT
 *
 * This endpoint runs the recovery script from Google Sheets.
 * Only accessible by super admins.
 *
 * Usage: POST /api/admin/recover
 */

import { NextResponse } from "next/server";
import { requireSuperAdmin } from "../../../../lib/admin-auth";
import { google } from "googleapis";
import { prisma } from "../../../../lib/prisma";

interface SheetRow {
  timestamp: string;
  studentId: string;
  studentName: string;
  level: string;
  category: string;
  location: string;
  actionTaken: string;
  note: string;
  teacherEmail: string;
  classCode: string;
  device: string;
  uuid: string;
}

async function readSheetData(sheetName: "Incidents" | "Commendations"): Promise<SheetRow[]> {
  const SHEET_ID = process.env.SHEET_ID;
  const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!SHEET_ID || !SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error("Missing Google Sheets credentials");
  }

  let privateKey = SERVICE_ACCOUNT_PRIVATE_KEY;
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  const auth = new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A:L`,
  });

  const rows = response.data.values || [];
  if (rows.length === 0) return [];

  // Skip header row if exists
  const dataRows = rows[0][0] === "timestamp" || rows[0][0] === "Timestamp"
    ? rows.slice(1)
    : rows;

  return dataRows.map((row) => ({
    timestamp: row[0] || "",
    studentId: row[1] || "",
    studentName: row[2] || "",
    level: row[3] || "",
    category: row[4] || "",
    location: row[5] || "",
    actionTaken: row[6] || "",
    note: row[7] || "",
    teacherEmail: row[8] || "",
    classCode: row[9] || "",
    device: row[10] || "",
    uuid: row[11] || "",
  }));
}

export async function POST(request: Request) {
  const { error } = await requireSuperAdmin(request);
  if (error) return error;

  try {
    // Step 1: Read data from Sheets
    const [incidents, commendations] = await Promise.all([
      readSheetData("Incidents"),
      readSheetData("Commendations"),
    ]);

    const totalRecords = incidents.length + commendations.length;

    if (totalRecords === 0) {
      return NextResponse.json(
        { ok: false, error: "No data found in Google Sheets" },
        { status: 404 }
      );
    }

    // Step 2: Find or create Sacred Heart organization
    const SACRED_HEART_DOMAIN = "shcolac.catholic.edu.au";
    const SACRED_HEART_NAME = "Sacred Heart Primary School";

    let organization = await prisma.organization.findUnique({
      where: { domain: SACRED_HEART_DOMAIN },
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          name: SACRED_HEART_NAME,
          domain: SACRED_HEART_DOMAIN,
          active: true,
          lmsProvider: "TRACKTALLY",
        },
      });
    }

    // Step 3: Import incidents
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    const allRecords = [
      ...incidents.map((row) => ({ ...row, type: "incident" as const })),
      ...commendations.map((row) => ({ ...row, type: "commendation" as const })),
    ];

    for (const row of allRecords) {
      try {
        if (!row.uuid || !row.studentName || !row.teacherEmail) {
          skipCount++;
          continue;
        }

        const exists = await prisma.incident.findUnique({
          where: { uuid: row.uuid },
        });

        if (exists) {
          skipCount++;
          continue;
        }

        let classroomId: string | null = null;
        if (row.classCode) {
          const classroom = await prisma.classroom.findFirst({
            where: {
              code: row.classCode,
              organizationId: organization.id,
            },
          });
          classroomId = classroom?.id || null;
        }

        let studentIdForDb: string | null = null;
        if (row.studentId) {
          const student = await prisma.student.findFirst({
            where: {
              studentId: row.studentId,
              organizationId: organization.id,
            },
          });
          studentIdForDb = student?.studentId || null;
        }

        await prisma.incident.create({
          data: {
            uuid: row.uuid,
            timestamp: new Date(row.timestamp || Date.now()),
            type: row.type,
            studentId: studentIdForDb,
            studentName: row.studentName,
            classroomId,
            classCode: row.classCode || null,
            teacherEmail: row.teacherEmail,
            level: row.level,
            category: row.category,
            location: row.location,
            actionTaken: row.actionTaken || null,
            note: row.note || null,
            device: row.device || null,
            organizationId: organization.id,
          },
        });

        successCount++;
      } catch (err) {
        errorCount++;
        console.error(`Error importing record ${row.uuid}:`, err);
      }
    }

    // Step 4: Generate stats
    const [incidentCount, commendationCount, teacherEmails, studentNames] = await Promise.all([
      prisma.incident.count({
        where: { organizationId: organization.id, type: "incident" },
      }),
      prisma.incident.count({
        where: { organizationId: organization.id, type: "commendation" },
      }),
      prisma.incident.groupBy({
        by: ["teacherEmail"],
        where: { organizationId: organization.id },
        _count: true,
      }),
      prisma.incident.groupBy({
        by: ["studentName"],
        where: { organizationId: organization.id },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        imported: successCount,
        skipped: skipCount,
        errors: errorCount,
        total: totalRecords,
        stats: {
          totalIncidents: incidentCount,
          totalCommendations: commendationCount,
          uniqueTeachers: teacherEmails.length,
          uniqueStudents: studentNames.length,
          teacherEmails: teacherEmails.map(t => t.teacherEmail).sort(),
          studentNames: studentNames.map(s => s.studentName).sort(),
        },
      },
    });

  } catch (err: any) {
    console.error("Recovery failed:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Recovery failed" },
      { status: 500 }
    );
  }
}
