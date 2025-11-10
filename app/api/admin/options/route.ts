import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import {
  DEFAULT_INCIDENT_OPTIONS,
  normalizeOptions,
  updateOptionsForDomain,
  getOptionsForDomain,
  resolveOrganizationIdForRequest,
} from "../../../../lib/organizations";
import { requireAdmin } from "../../../../lib/admin-auth";

function requestedDomain(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("domain") ?? undefined;
}

export async function GET(request: Request) {
  const { error, session, rateHeaders, organizationId } = await requireAdmin(request);
  if (error) return error;

  let targetOrgId: string;
  try {
    targetOrgId = await resolveOrganizationIdForRequest({
      session: session as Session,
      baseOrganizationId: organizationId ?? null,
      requestedDomain: requestedDomain(request),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unable to determine organization for this account." },
      { status: 400 },
    );
  }

  const org = await prisma.organization.findUnique({ where: { id: targetOrgId } });
  if (!org) {
    return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });
  }

  const response = NextResponse.json({
    ok: true,
    data: {
      domain: org.domain,
      options: await getOptionsForDomain(org.domain),
    },
  });

  if (rateHeaders) {
    Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
  }

  return response;
}

export async function PUT(request: Request) {
  const { error, session, rateHeaders, organizationId } = await requireAdmin(request);
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "Invalid payload." }, { status: 400 });
  }

  const { levels, categories, locations, actions, domain: domainOverride } = body as Record<
    string,
    unknown
  >;

  let targetOrgId: string;
  try {
    targetOrgId = await resolveOrganizationIdForRequest({
      session: session as Session,
      baseOrganizationId: organizationId ?? null,
      requestedDomain:
        typeof domainOverride === "string" ? domainOverride.toLowerCase() : requestedDomain(request),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unable to determine organization for this account." },
      { status: 400 },
    );
  }

  const org = await prisma.organization.findUnique({ where: { id: targetOrgId } });
  if (!org) {
    return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });
  }

  const options = normalizeOptions({
    levels: Array.isArray(levels) ? (levels as string[]) : undefined,
    categories: Array.isArray(categories) ? (categories as string[]) : undefined,
    locations: Array.isArray(locations) ? (locations as string[]) : undefined,
    actions: Array.isArray(actions) ? (actions as string[]) : undefined,
  });

  try {
    const updated = await updateOptionsForDomain(org.domain, options);
    const response = NextResponse.json({ ok: true, data: updated });
    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
  } catch (err) {
    console.error("Failed to update options", err);
    return NextResponse.json(
      { ok: false, error: "Could not update incident options." },
      { status: 500 },
    );
  }
}
