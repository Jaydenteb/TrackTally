import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const INCIDENT_RETENTION_KEY = "incidentRetentionDays";
const DEFAULT_RETENTION_DAYS = 365;
const RETENTION_CACHE_TTL_MS = 5 * 60 * 1000;
const RETENTION_ENFORCE_INTERVAL_MS = 60 * 1000;

let cachedRetention: { value: number; fetchedAt: number } | null = null;
let lastRetentionEnforcement = 0;

export async function getIncidentRetentionDays(force = false): Promise<number> {
  const now = Date.now();
  if (!force && cachedRetention && now - cachedRetention.fetchedAt < RETENTION_CACHE_TTL_MS) {
    return cachedRetention.value;
  }

  const setting = await prisma.setting.findUnique({ where: { key: INCIDENT_RETENTION_KEY } });
  const value = setting ? Math.max(parseInt(setting.value, 10) || DEFAULT_RETENTION_DAYS, 1) : DEFAULT_RETENTION_DAYS;
  cachedRetention = { value, fetchedAt: now };
  return value;
}

export async function setIncidentRetentionDays(days: number): Promise<number> {
  const safeDays = Math.max(Math.floor(days), 1);
  await prisma.setting.upsert({
    where: { key: INCIDENT_RETENTION_KEY },
    update: { value: String(safeDays) },
    create: { key: INCIDENT_RETENTION_KEY, value: String(safeDays) },
  });
  cachedRetention = { value: safeDays, fetchedAt: Date.now() };
  return safeDays;
}

export async function recordAuditLog(action: string, performedBy: string, meta?: Prisma.JsonValue) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        performedBy,
        meta: meta ? JSON.stringify(meta) : null,
      },
    });
  } catch (error) {
    console.error("Failed to record audit log", error);
  }
}

export async function enforceIncidentRetention() {
  const now = Date.now();
  if (now - lastRetentionEnforcement < RETENTION_ENFORCE_INTERVAL_MS) return;
  lastRetentionEnforcement = now;

  const days = await getIncidentRetentionDays();
  if (!Number.isFinite(days) || days <= 0) return;

  const cutoff = new Date(now - days * 24 * 60 * 60 * 1000);
  try {
    await prisma.incident.deleteMany({ where: { timestamp: { lt: cutoff } } });
  } catch (error) {
    console.error("Failed to enforce incident retention", error);
  }
}
