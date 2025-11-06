import { google, sheets_v4 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const SHEET_ID = process.env.SHEET_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

let sheetsClient: sheets_v4.Sheets | undefined;

function assertEnv() {
  if (!SHEET_ID) throw new Error("SHEET_ID env var is required");
  if (!SERVICE_ACCOUNT_EMAIL)
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL env var is required");
  if (!SERVICE_ACCOUNT_PRIVATE_KEY)
    throw new Error("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY env var is required");
  if (
    SERVICE_ACCOUNT_PRIVATE_KEY &&
    !SERVICE_ACCOUNT_PRIVATE_KEY.includes("BEGIN PRIVATE KEY")
  ) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY appears malformed.");
  }
}

function getAuthClient() {
  assertEnv();
  const privateKey = SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, "\n");

  return new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL!,
    key: privateKey,
    scopes: SCOPES,
  });
}

export function getSheetsClient() {
  if (!sheetsClient) {
    const auth = getAuthClient();
    sheetsClient = google.sheets({ version: "v4", auth });
  }

  return sheetsClient;
}

export interface IncidentRow {
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

export async function appendIncidentRow(row: IncidentRow) {
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID!,
    range: "Incidents!A:L",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          row.timestamp,
          row.studentId,
          row.studentName,
          row.level,
          row.category,
          row.location,
          row.actionTaken,
          row.note,
          row.teacherEmail,
          row.classCode,
          row.device,
          row.uuid,
        ],
      ],
    },
  });
}

