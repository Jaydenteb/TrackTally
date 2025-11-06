import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "../../../../../lib/admin-auth";
import {
  getIncidentRetentionDays,
  recordAuditLog,
  setIncidentRetentionDays,
} from "../../../../../lib/settings";

const retentionSchema = z.object({
  days: z.number().int().min(1).max(3650),
});

export async function GET(request: Request) {
  const { error, rateHeaders } = await requireAdmin(request);
  if (error) return error;

  const days = await getIncidentRetentionDays();
  const response = NextResponse.json({ ok: true, days });
  if (rateHeaders) {
    Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
  }
  return response;
}

export async function POST(request: Request) {
  const { error, rateHeaders, session } = await requireAdmin(request);
  if (error) return error;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = retentionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 },
    );
  }

  const days = await setIncidentRetentionDays(parsed.data.days);
  const performer = session?.user?.email?.toLowerCase() ?? "unknown";
  await recordAuditLog("incidents.retention.update", performer, { days });

  const response = NextResponse.json({ ok: true, days });
  if (rateHeaders) {
    Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
  }
  return response;
}
