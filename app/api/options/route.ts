import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { DEFAULT_INCIDENT_OPTIONS, getOptionsForDomain } from "../../../lib/organizations";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let domain = session.user.organizationId
    ? null
    : session.user.email.split("@")[1]?.toLowerCase() ?? null;

  if (!domain && session.user.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { domain: true },
    });
    domain = org?.domain ?? null;
  }

  try {
    const options = await getOptionsForDomain(domain);
    return NextResponse.json({ ok: true, data: options });
  } catch (error) {
    console.error("Failed to load incident options", error);
    return NextResponse.json(
      { ok: true, data: DEFAULT_INCIDENT_OPTIONS },
      { status: 200 },
    );
  }
}
