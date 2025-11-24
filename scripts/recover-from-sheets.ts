/**
 * DATA RECOVERY SCRIPT
 *
 * This script recovers incident and commendation data from Google Sheets
 * and imports it back into the database after data loss.
 *
 * PREREQUISITES:
 * 1. Google Sheets credentials must be configured in .env
 * 2. The organization must be recreated first
 * 3. Run with: npx ts-node scripts/recover-from-sheets.ts
 *
 * WHAT THIS SCRIPT DOES:
 * 1. Reads all incidents from the "Incidents" sheet
 * 2. Reads all commendations from the "Commendations" sheet
 * 3. Creates a recovery organization if needed (Sacred Heart)
 * 4. Imports all data back into the database
 * 5. Generates a recovery report
 */

import { google } from "googleapis";
import { PrismaClient } from "@prisma/client";

// Use direct database URL for migrations/recovery
const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

const SHEET_ID = process.env.SHEET_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

if (!SHEET_ID || !SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
  console.error("❌ Missing Google Sheets credentials in .env");
  console.error("Required: SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  process.exit(1);
}

function getAuthClient() {
  let privateKey = SERVICE_ACCOUNT_PRIVATE_KEY!;
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  return new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL!,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

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
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  console.log(`📖 Reading ${sheetName} sheet...`);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID!,
    range: `${sheetName}!A:L`, // A:L covers all 12 columns
  });

  const rows = response.data.values || [];

  if (rows.length === 0) {
    console.log(`⚠️  No data found in ${sheetName} sheet`);
    return [];
  }

  // Skip header row (if exists)
  const dataRows = rows[0][0] === "timestamp" || rows[0][0] === "Timestamp"
    ? rows.slice(1)
    : rows;

  console.log(`✅ Found ${dataRows.length} rows in ${sheetName}`);

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

async function findOrCreateOrganization(domain: string, name: string) {
  console.log(`🔍 Looking for organization with domain: ${domain}`);

  let org = await prisma.organization.findUnique({
    where: { domain },
  });

  if (!org) {
    console.log(`➕ Creating organization: ${name} (${domain})`);
    org = await prisma.organization.create({
      data: {
        name,
        domain,
        active: true,
        lmsProvider: "TRACKTALLY",
      },
    });
  } else {
    console.log(`✅ Organization exists: ${org.name}`);
  }

  return org;
}

async function importIncidents(
  incidents: SheetRow[],
  commendations: SheetRow[],
  organizationId: string
) {
  console.log("\n📥 Starting data import...\n");

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  const allRecords = [
    ...incidents.map((row) => ({ ...row, type: "incident" as const })),
    ...commendations.map((row) => ({ ...row, type: "commendation" as const })),
  ];

  for (const row of allRecords) {
    try {
      // Skip rows with missing critical data
      if (!row.uuid || !row.studentName || !row.teacherEmail) {
        skipCount++;
        continue;
      }

      // Check if already exists
      const exists = await prisma.incident.findUnique({
        where: { uuid: row.uuid },
      });

      if (exists) {
        skipCount++;
        continue;
      }

      // Find or lookup classroom
      let classroomId: string | null = null;
      if (row.classCode) {
        const classroom = await prisma.classroom.findFirst({
          where: {
            code: row.classCode,
            organizationId,
          },
        });
        classroomId = classroom?.id || null;
      }

      // Find student
      let studentIdForDb: string | null = null;
      if (row.studentId) {
        const student = await prisma.student.findFirst({
          where: {
            studentId: row.studentId,
            organizationId,
          },
        });
        studentIdForDb = student?.studentId || null;
      }

      // Create incident
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
          organizationId,
        },
      });

      successCount++;

      if (successCount % 50 === 0) {
        console.log(`   Imported ${successCount} records...`);
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ Error importing record ${row.uuid}:`, error);
    }
  }

  console.log("\n✅ Import complete!");
  console.log(`   Successfully imported: ${successCount}`);
  console.log(`   Skipped (duplicates/invalid): ${skipCount}`);
  console.log(`   Errors: ${errorCount}`);
}

async function generateReport(organizationId: string) {
  console.log("\n📊 RECOVERY REPORT\n");

  const [incidentCount, commendationCount, teachers, students, classrooms] = await Promise.all([
    prisma.incident.count({
      where: { organizationId, type: "incident" },
    }),
    prisma.incident.count({
      where: { organizationId, type: "commendation" },
    }),
    prisma.incident.groupBy({
      by: ["teacherEmail"],
      where: { organizationId },
      _count: true,
    }),
    prisma.incident.groupBy({
      by: ["studentName"],
      where: { organizationId },
      _count: true,
    }),
    prisma.incident.groupBy({
      by: ["classCode"],
      where: { organizationId, classCode: { not: null } },
      _count: true,
    }),
  ]);

  console.log(`Total Incidents: ${incidentCount}`);
  console.log(`Total Commendations: ${commendationCount}`);
  console.log(`Unique Teachers: ${teachers.length}`);
  console.log(`Unique Students: ${students.length}`);
  console.log(`Unique Classes: ${classrooms.length}`);

  console.log("\n⚠️  NEXT STEPS:\n");
  console.log("1. Review the recovered data in the admin panel");
  console.log("2. Manually recreate teacher accounts if needed");
  console.log("3. Manually recreate student records if needed");
  console.log("4. Manually recreate classroom records if needed");
  console.log("5. Once verified, re-link incidents to proper student/classroom IDs");
  console.log("\n");
}

async function main() {
  console.log("\n🚨 TRACKTALLY DATA RECOVERY SCRIPT\n");
  console.log("This will recover incident data from Google Sheets");
  console.log("and import it back into the database.\n");

  // Step 1: Read data from Sheets
  const [incidents, commendations] = await Promise.all([
    readSheetData("Incidents"),
    readSheetData("Commendations"),
  ]);

  const totalRecords = incidents.length + commendations.length;

  if (totalRecords === 0) {
    console.log("\n❌ No data found in Google Sheets. Cannot recover.\n");
    process.exit(1);
  }

  console.log(`\n📋 Total records to recover: ${totalRecords}`);

  // Step 2: Determine organization domain from teacher emails
  // Sacred Heart domain: shcolac.catholic.edu.au
  const SACRED_HEART_DOMAIN = "shcolac.catholic.edu.au";
  const SACRED_HEART_NAME = "Sacred Heart Primary School";

  // Step 3: Create or find organization
  const organization = await findOrCreateOrganization(SACRED_HEART_DOMAIN, SACRED_HEART_NAME);

  // Step 4: Import all incidents
  await importIncidents(incidents, commendations, organization.id);

  // Step 5: Generate report
  await generateReport(organization.id);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("\n❌ RECOVERY FAILED:\n", error);
  process.exit(1);
});
