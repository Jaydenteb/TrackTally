import { NextResponse } from "next/server";
import { pruneExpiredTickets } from "../../../../lib/mobile-auth";

export const runtime = "nodejs";

/**
 * Cron job to clean up expired mobile auth tickets
 * Scheduled to run daily at 2 AM via Vercel Cron
 */
export async function GET() {
  try {
    const deleted = await pruneExpiredTickets();

    return NextResponse.json({
      ok: true,
      deleted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to prune expired tickets", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
