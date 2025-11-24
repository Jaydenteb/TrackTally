import { NextResponse } from "next/server";
import { requireSuperAdmin } from "../../../../../lib/admin-auth";
import { normalizeOptions, updateOrganization, deleteOrganization } from "../../../../../lib/organizations";

type Params = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: Params) {
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

  const { name, domain, active, lmsProvider, options } = body as Record<string, unknown>;

  try {
    const updated = await updateOrganization(params.id, {
      name: typeof name === "string" ? name.trim() : undefined,
      domain: typeof domain === "string" ? domain.trim().toLowerCase() : undefined,
      active: typeof active === "boolean" ? active : undefined,
      lmsProvider: typeof lmsProvider === "string" && (lmsProvider === "TRACKTALLY" || lmsProvider === "SIMON")
        ? lmsProvider
        : undefined,
      options: options && typeof options === "object" ? normalizeOptions(options as any) : undefined,
    });
    const response = NextResponse.json({ ok: true, data: updated });
    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Could not update school." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { error, rateHeaders } = await requireSuperAdmin(request);
  if (error) return error;

  try {
    await deleteOrganization(params.id);
    const response = NextResponse.json({ ok: true });
    if (rateHeaders) {
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Could not delete school." },
      { status: 400 },
    );
  }
}
