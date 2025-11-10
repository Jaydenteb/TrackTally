import crypto from "node:crypto";
import { prisma } from "./prisma";

const BASE_REDIRECTS = ["/teacher", "/admin", "/super-admin"] as const;
const REDIRECT_WHITELIST = new Set<string>(BASE_REDIRECTS);

const DEFAULT_REDIRECT = "/teacher";
const DEFAULT_TOKEN_TTL_MINUTES = 5;
const TTL_MINUTES = safeParseInt(
  process.env.MOBILE_AUTH_TOKEN_TTL_MINUTES,
  DEFAULT_TOKEN_TTL_MINUTES,
);

function safeParseInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function generateToken() {
  return crypto.randomBytes(24).toString("hex");
}

function futureDate(minutes: number = TTL_MINUTES) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function sanitizeRedirectPath(path?: string | null) {
  if (!path || typeof path !== "string") return DEFAULT_REDIRECT;
  try {
    const trimmed = path.trim();
    if (!trimmed.startsWith("/")) return DEFAULT_REDIRECT;
    for (const base of BASE_REDIRECTS) {
      if (trimmed === base || trimmed.startsWith(`${base}/`)) {
        return trimmed;
      }
    }
    return DEFAULT_REDIRECT;
  } catch {
    return DEFAULT_REDIRECT;
  }
}

async function findValidTicketByState(state: string) {
  if (!state) return null;
  return prisma.mobileAuthTicket.findFirst({
    where: {
      state,
      expiresAt: { gt: new Date() },
      consumedAt: null,
    },
  });
}

async function findValidTicketByTransfer(token: string) {
  if (!token) return null;
  return prisma.mobileAuthTicket.findFirst({
    where: {
      transferToken: token,
      consumedAt: null,
      expiresAt: { gt: new Date() },
      sessionToken: { not: null },
    },
  });
}

export async function createTicket(options?: { redirectPath?: string }) {
  const state = generateToken();
  const redirectPath = sanitizeRedirectPath(options?.redirectPath);
  const ticket = await prisma.mobileAuthTicket.create({
    data: {
      state,
      redirectPath,
      expiresAt: futureDate(),
    },
    select: {
      id: true,
      state: true,
      redirectPath: true,
      expiresAt: true,
    },
  });
  return ticket;
}

export async function storeSessionToken(state: string, sessionToken: string) {
  if (!state || !sessionToken) return null;
  const ticket = await findValidTicketByState(state);
  if (!ticket) return null;
  const updated = await prisma.mobileAuthTicket.update({
    where: { id: ticket.id },
    data: {
      sessionToken,
      expiresAt: futureDate(),
    },
    select: {
      id: true,
      redirectPath: true,
    },
  });
  return updated;
}

export async function issueTransferToken(state: string) {
  if (!state) return null;
  const ticket = await findValidTicketByState(state);
  if (!ticket || !ticket.sessionToken) return null;
  const transferToken = generateToken();
  await prisma.mobileAuthTicket.update({
    where: { id: ticket.id },
    data: {
      transferToken,
      expiresAt: futureDate(),
    },
  });
  return { transferToken };
}

export async function consumeTransferToken(token: string) {
  const ticket = await findValidTicketByTransfer(token);
  if (!ticket || !ticket.sessionToken) return null;
  await prisma.mobileAuthTicket.update({
    where: { id: ticket.id },
    data: {
      consumedAt: new Date(),
      transferToken: null,
    },
  });
  return {
    sessionToken: ticket.sessionToken,
    redirectPath: ticket.redirectPath,
  };
}

export async function pruneExpiredTickets(limit = 100) {
  const staleTickets = await prisma.mobileAuthTicket.findMany({
    where: {
      expiresAt: { lt: new Date() },
    },
    select: { id: true },
    take: limit,
  });
  if (!staleTickets.length) return 0;
  const deleted = await prisma.mobileAuthTicket.deleteMany({
    where: { id: { in: staleTickets.map((ticket) => ticket.id) } },
  });
  return deleted.count;
}

export const mobileAuthConfig = {
  allowedRedirects: Array.from(REDIRECT_WHITELIST),
  ttlMinutes: TTL_MINUTES,
};
