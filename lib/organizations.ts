import type { Session } from "next-auth";
import { prisma } from "./prisma";

export type IncidentOptionGroups = {
  levels: string[];
  categories: string[];
  locations: string[];
  actions: string[];
};

export const DEFAULT_INCIDENT_OPTIONS: IncidentOptionGroups = {
  levels: ["Minor", "Major"],
  categories: [
    "Disruption",
    "Non-compliance",
    "Unsafe play",
    "Physical contact",
    "Defiance",
    "Tech misuse",
    "Bullying",
    "Other",
  ],
  locations: ["Classroom", "Yard", "Specialist", "Transition", "Online"],
  actions: ["Redirect", "Time out", "Restorative chat", "Parent contact", "Office referral"],
};

const OPTION_PREFIX = "org-options:";

function normalizeList(values?: string[]) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 24);
}

export function normalizeOptions(options?: Partial<IncidentOptionGroups>): IncidentOptionGroups {
  const normalizedLevels = normalizeList(options?.levels);
  const normalizedCategories = normalizeList(options?.categories);
  const normalizedLocations = normalizeList(options?.locations);
  const normalizedActions = normalizeList(options?.actions);

  return {
    levels: normalizedLevels.length ? normalizedLevels : [...DEFAULT_INCIDENT_OPTIONS.levels],
    categories: normalizedCategories.length
      ? normalizedCategories
      : [...DEFAULT_INCIDENT_OPTIONS.categories],
    locations: normalizedLocations.length
      ? normalizedLocations
      : [...DEFAULT_INCIDENT_OPTIONS.locations],
    actions: normalizedActions.length
      ? normalizedActions
      : [...DEFAULT_INCIDENT_OPTIONS.actions],
  };
}

function optionsKey(orgId: string) {
  return `${OPTION_PREFIX}${orgId}`;
}

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase();
}

async function readOptions(orgId: string) {
  const record = await prisma.setting.findUnique({
    where: { key: optionsKey(orgId) },
  });
  if (!record) return { ...DEFAULT_INCIDENT_OPTIONS };
  try {
    const parsed = JSON.parse(record.value);
    return normalizeOptions(parsed);
  } catch {
    return { ...DEFAULT_INCIDENT_OPTIONS };
  }
}

async function writeOptions(orgId: string, options: IncidentOptionGroups) {
  await prisma.setting.upsert({
    where: { key: optionsKey(orgId) },
    create: {
      key: optionsKey(orgId),
      value: JSON.stringify(options),
    },
    update: {
      value: JSON.stringify(options),
    },
  });
}

export async function listOrganizations() {
  const orgs = await prisma.organization.findMany({
    orderBy: { name: "asc" },
  });

  return Promise.all(
    orgs.map(async (org) => ({
      id: org.id,
      name: org.name,
      domain: org.domain,
      active: org.active,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
      options: await readOptions(org.id),
    })),
  );
}

export async function createOrganization(name: string, domain: string) {
  const normalizedDomain = normalizeDomain(domain);
  const existing = await getOrganizationByDomain(normalizedDomain);
  if (existing) {
    throw new Error("An organization already exists for that domain.");
  }

  const org = await prisma.organization.create({
    data: {
      name,
      domain: normalizedDomain,
    },
  });
  await writeOptions(org.id, { ...DEFAULT_INCIDENT_OPTIONS });
  return org;
}

export async function updateOrganization(
  id: string,
  patch: {
    name?: string;
    domain?: string;
    active?: boolean;
    options?: IncidentOptionGroups;
  },
) {
  if (patch.domain) {
    patch.domain = normalizeDomain(patch.domain);
  }

  const org = await prisma.organization.update({
    where: { id },
    data: {
      name: patch.name,
      domain: patch.domain,
      active: patch.active,
    },
  });

  if (patch.options) {
    await writeOptions(org.id, normalizeOptions(patch.options));
  }

  return org;
}

export async function deleteOrganization(id: string) {
  await prisma.setting.deleteMany({ where: { key: optionsKey(id) } });
  await prisma.organization.delete({ where: { id } });
}

export async function getOrganizationByDomain(domain: string) {
  return prisma.organization.findUnique({
    where: { domain: normalizeDomain(domain) },
  });
}

export async function ensureOrganization(domain: string, name?: string) {
  const existing = await getOrganizationByDomain(domain);
  if (existing) return existing;
  return createOrganization(name ?? domain, domain);
}

export async function getOptionsForDomain(domain?: string | null) {
  if (!domain) return { ...DEFAULT_INCIDENT_OPTIONS };
  const org = await getOrganizationByDomain(domain);
  if (!org) return { ...DEFAULT_INCIDENT_OPTIONS };
  return readOptions(org.id);
}

export async function updateOptionsForDomain(domain: string, options: IncidentOptionGroups) {
  const org = await getOrganizationByDomain(domain);
  if (!org) {
    throw new Error("Organization not found for domain");
  }
  const normalized = normalizeOptions(options);
  await writeOptions(org.id, normalized);
  return normalized;
}

export async function resolveOrganizationIdForRequest(params: {
  session: Session;
  baseOrganizationId: string | null;
  requestedDomain?: string | null;
}) {
  const { session, baseOrganizationId, requestedDomain } = params;
  const role = session.user?.role ?? "teacher";
  if (role === "superadmin" && requestedDomain) {
    const org = await getOrganizationByDomain(requestedDomain);
    if (!org) {
      throw new Error("Organization not found");
    }
    return org.id;
  }
  if (!baseOrganizationId) {
    throw new Error("Organization not available for this account.");
  }
  return baseOrganizationId;
}
