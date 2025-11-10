import { NextResponse } from "next/server";
import { requireSuperAdmin } from "../../../../lib/admin-auth";
import { listOrganizations, createOrganization, normalizeOptions, updateOrganization } from "../../../../lib/organizations";

export async function GET(request: Request) {
  const { error, rateHeaders } = await requireSuperAdmin(request);
  if (error) return error;

  const schools = await listOrganizations();
  const response = NextResponse.json({ ok: true, data: schools });
  if (rateHeaders) {
    Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
  }
  return response;
}

export async function POST(request: Request) {
  const { error, rateHeaders } = await requireSuperAdmin(request);
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

  const { name, domain, options } = body as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim() || typeof domain !== "string" || !domain.trim()) {
    return NextResponse.json({ ok: false, error: "Name and domain are required." }, { status: 400 });
  }

  try {
    const organization = await createOrganization(name.trim(), domain.trim());
    if (options && typeof options === "object") {
      await updateOrganization(organization.id, {
        options: normalizeOptions(options as any),
      });
    }
    const response = NextResponse.json({ ok: true, data: organization }, { status: 201 });
    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Could not create school." },
      { status: 400 },
    );
  }
}
