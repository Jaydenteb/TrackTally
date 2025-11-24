import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/admin-auth";
import { resolveOrganizationIdForRequest } from "../../../../lib/organizations";

type OrgSummary = {
  id: string;
  name: string;
  domain: string;
  active: boolean;
  lmsProvider: "TRACKTALLY" | "SIMON" | null;
};

async function getOrgIdFromRequest(request: Request, session: Session, baseOrgId: string | null) {
  const url = new URL(request.url);
  const requestedDomain = url.searchParams.get("domain");
  return resolveOrganizationIdForRequest({
    session,
    baseOrganizationId: baseOrgId,
    requestedDomain: requestedDomain ?? undefined,
  });
}

export async function GET(request: Request) {
  const { error, rateHeaders, organizationId, session } = await requireAdmin(request);
  if (error) return error;

  let targetOrgId: string;
  try {
    targetOrgId = await getOrgIdFromRequest(request, session, organizationId ?? null);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Invalid organization." },
      { status: 400 },
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: targetOrgId },
    select: { id: true, name: true, domain: true, active: true, lmsProvider: true },
  });

  if (!org) {
    return NextResponse.json(
      { ok: false, error: "Organization not found." },
      { status: 404 },
    );
  }

  const payload: OrgSummary = {
    id: org.id,
    name: org.name,
    domain: org.domain,
    active: org.active,
    lmsProvider: org.lmsProvider,
  };

  const response = NextResponse.json({ ok: true, data: payload });
  if (rateHeaders) {
    Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
  }
  return response;
}

