import crypto from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { appendIncidentRow } from "../../../lib/sheets";
import { prisma } from "../../../lib/prisma";
import { sendTeacherNotification } from "../../../lib/mailer";
import { auth } from "../../../auth";
import type { IncidentInput } from "../../../lib/validation";
import { incidentInputSchema, sanitize, sanitizeOptional } from "../../../lib/validation";
import { buildRateLimitHeaders, defaultLimits, rateLimit } from "../../../lib/rate-limit";
import { enforceIncidentRetention } from "../../../lib/settings";

export const runtime = "nodejs";
export const preferredRegion = "home";

const REQUIRED_FIELDS = [
  "studentId",
  "studentName",
  "level",
  "category",
  "location",
] as const;

const MAX_BYTES = 10 * 1024;

type IncidentPayload = {
  type?: string;
  studentId: string;
  studentName: string;
  level: string;
  category: string;
  location: string;
  actionTaken?: string;
  note?: string;
  classCode?: string;
  device?: string;
  uuid?: string;
  timestamp?: string;
};

function buildError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const byteLength = Buffer.from(rawBody).byteLength;

  if (byteLength > MAX_BYTES) {
    return buildError("Request body too large.", 413);
  }

  let payload: IncidentInput;

  try {
    const parsedBody = JSON.parse(rawBody);
    const parsed = incidentInputSchema.safeParse(parsedBody);
    if (!parsed.success) {
      return buildError(parsed.error.issues[0]?.message ?? "Invalid request body.");
    }
    payload = parsed.data;
  } catch {
    return buildError("Invalid JSON body.");
  }

  const data: IncidentPayload = {
    type: payload.type,
    studentId: sanitize(payload.studentId),
    studentName: sanitize(payload.studentName),
    level: sanitize(payload.level),
    category: sanitize(payload.category),
    location: sanitize(payload.location),
    actionTaken: sanitizeOptional(payload.actionTaken),
    note: sanitizeOptional(payload.note),
    classCode: sanitizeOptional(payload.classCode),
    device: sanitizeOptional(payload.device),
    uuid: sanitizeOptional(payload.uuid),
    timestamp: sanitizeOptional(payload.timestamp),
  };

  for (const field of REQUIRED_FIELDS) {
    if (!data[field]) {
      return buildError(`Missing required field: ${field}`);
    }
  }

  const missingEnv = [
    ["SHEET_ID", process.env.SHEET_ID],
    ["GOOGLE_SERVICE_ACCOUNT_EMAIL", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL],
    [
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    ],
  ].filter(([, value]) => !value);

  if (missingEnv.length) {
    return buildError(
      `Sheets credentials missing: ${missingEnv.map(([key]) => key).join(", ")}`,
      500,
    );
  }

  const session = await auth();
  const userEmail = session?.user?.email?.toLowerCase();
  const role = session?.user?.role ?? "teacher";
  const organizationId = session?.user?.organizationId ?? null;

  if (!session || !userEmail) {
    return buildError("Unauthorized", 401);
  }

  if (role !== "teacher" && role !== "admin") {
    return buildError("Forbidden", 403);
  }

  if (!organizationId) {
    return buildError("No organization assigned to this account.", 403);
  }

  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") ?? "";
  const ip =
    headerStore
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||
    headerStore.get("x-real-ip") ||
    "unknown";

  const ipResult = rateLimit(
    `incident:ip:${ip}`,
    defaultLimits.incident.limit,
    defaultLimits.incident.windowMs,
  );
  if (ipResult.limited) {
    return NextResponse.json(
      { ok: false, error: "Too many requests from this address. Please slow down." },
      {
        status: 429,
        headers: buildRateLimitHeaders(defaultLimits.incident.limit, ipResult),
      },
    );
  }

  const teacherEmail = userEmail;

  const userResult = rateLimit(
    `incident:user:${teacherEmail}`,
    defaultLimits.incident.limit,
    defaultLimits.incident.windowMs,
  );
  if (userResult.limited) {
    return NextResponse.json(
      { ok: false, error: "Too many incidents submitted. Please slow down." },
      {
        status: 429,
        headers: buildRateLimitHeaders(defaultLimits.incident.limit, userResult),
      },
    );
  }

  const timestamp = data.timestamp || new Date().toISOString();
  const uuid = data.uuid || crypto.randomUUID();
  const device = data.device || userAgent;

  try {
    // 1) Persist to the database for audit/analytics (idempotent on uuid)
    try {
      const [studentRecord, classroomRecord] = await Promise.all([
        prisma.student.findFirst({
          where: { studentId: data.studentId, organizationId },
        }),
        data.classCode
          ? prisma.classroom.findFirst({
              where: { code: data.classCode, organizationId },
            })
          : Promise.resolve(null as any),
      ]);

      await prisma.incident.upsert({
        where: { uuid },
        update: {},
        create: {
          uuid,
          timestamp: new Date(timestamp),
          type: data.type || "incident",
          studentId: studentRecord ? studentRecord.studentId : null,
          studentName: data.studentName,
          classroomId: classroomRecord?.id ?? null,
          classCode: data.classCode || null,
          teacherEmail,
          level: data.level,
          category: data.category,
          location: data.location,
          actionTaken: data.actionTaken || null,
          note: data.note || null,
          device: device || null,
          organizationId,
        },
      });
    } catch (dbErr) {
      console.error("DB write failed (continuing to Sheets)", dbErr);
    }

    // 2) Append to Google Sheets (source of truth for MVP)
    const sheetRow = {
      timestamp,
      studentId: data.studentId,
      studentName: data.studentName,
      level: data.level,
      category: data.category,
      location: data.location,
      actionTaken: data.actionTaken ?? "",
      note: data.note ?? "",
      teacherEmail,
      classCode: data.classCode ?? "",
      device,
      uuid,
    };

    if (data.type === "commendation") {
      const { appendCommendationRow } = await import("../../../lib/sheets");
      await appendCommendationRow(sheetRow);
    } else {
      await appendIncidentRow(sheetRow);
    }

    if (data.studentId) {
      try {
        const studentRecord = await prisma.student.findFirst({
          where: { studentId: data.studentId, organizationId },
          include: {
            classroom: {
              include: {
                homeroomTeacher: true,
              },
            },
          },
        });

        const homeroomEmail = studentRecord?.classroom?.homeroomTeacher?.email;
        if (homeroomEmail && homeroomEmail.toLowerCase() !== teacherEmail.toLowerCase()) {
          await sendTeacherNotification({
            to: homeroomEmail,
            studentName: `${studentRecord?.firstName ?? data.studentName} ${
              studentRecord?.lastName ?? ""
            }`.trim(),
            className: studentRecord?.classroom?.name ?? data.classCode ?? "Class",
            logLevel: data.level,
            category: data.category,
            location: data.location,
            actionTaken: data.actionTaken || undefined,
            note: data.note || undefined,
            submitterEmail: teacherEmail,
          });
        }
      } catch (notifyError) {
        console.error("Failed to send notification", notifyError);
      }
    }
  } catch (error) {
    console.error("Failed to append incident", error);
    let message = "Failed to log incident.";
    const err = error as {
      errors?: Array<{ message?: string }>;
      response?: { data?: { error?: { message?: string } } };
      message?: string;
    };

    const apiMessage =
      err?.response?.data?.error?.message ?? err?.errors?.[0]?.message ?? err?.message;
    if (apiMessage) {
      message = apiMessage;
    }

    return buildError(message, 502);
  }

  void enforceIncidentRetention();

  return NextResponse.json(
    { ok: true },
    {
      headers: buildRateLimitHeaders(defaultLimits.incident.limit, userResult),
    },
  );
}



