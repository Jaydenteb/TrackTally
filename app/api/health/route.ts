import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { google } from "googleapis";

type HealthCheck = {
  ok: boolean;
  error?: string;
  latency?: number;
};

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latency: Date.now() - start };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Database check failed",
      latency: Date.now() - start,
    };
  }
}

async function checkGoogleSheets(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const sheetId = process.env.SHEET_ID;

    if (!privateKey || !serviceAccountEmail || !sheetId) {
      return { ok: false, error: "Missing Google Sheets credentials" };
    }

    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Just try to get sheet metadata (lightweight check)
    await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: "spreadsheetId",
    });

    return { ok: true, latency: Date.now() - start };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Sheets API check failed",
      latency: Date.now() - start,
    };
  }
}

export async function GET() {
  const timestamp = new Date().toISOString();

  const [database, sheets] = await Promise.all([
    checkDatabase(),
    checkGoogleSheets(),
  ]);

  const healthy = database.ok && sheets.ok;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      timestamp,
      checks: {
        database,
        sheets,
      },
      version: process.env.npm_package_version ?? "unknown",
      environment: process.env.NODE_ENV,
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    }
  );
}
