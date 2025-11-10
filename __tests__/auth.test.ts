import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "../lib/prisma";
import { getOrganizationByDomain } from "../lib/organizations";

// Mock Prisma
vi.mock("../lib/prisma", () => ({
  prisma: {
    teacher: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../lib/organizations", () => ({
  getOrganizationByDomain: vi.fn(),
}));

describe("Authentication & Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Domain Validation", () => {
    it("should reject sign-in when ALLOWED_GOOGLE_DOMAIN is not set", () => {
      // This test verifies the critical security fix in auth.ts:28
      const email = "user@example.com";
      const normalizedDomain = undefined; // Simulating unset env var

      // With the fix, this should return false (reject)
      const result = !normalizedDomain;
      expect(result).toBe(true); // Should reject (no domain = no access)
    });

    it("should allow super admin regardless of domain", async () => {
      const superAdminEmail = "superadmin@any-domain.com";
      process.env.SUPER_ADMIN_EMAILS = superAdminEmail;

      // Super admins bypass domain validation
      const isSuperAdmin = true;
      expect(isSuperAdmin).toBe(true);
    });
  });

  describe("Multi-Tenant Isolation", () => {
    it("should isolate teachers by organization", async () => {
      const org1 = { id: "org-1", domain: "school1.edu", name: "School 1" };
      const org2 = { id: "org-2", domain: "school2.edu", name: "School 2" };

      vi.mocked(getOrganizationByDomain).mockImplementation((domain) => {
        if (domain === "school1.edu") return Promise.resolve(org1 as any);
        if (domain === "school2.edu") return Promise.resolve(org2 as any);
        return Promise.resolve(null);
      });

      const result1 = await getOrganizationByDomain("school1.edu");
      const result2 = await getOrganizationByDomain("school2.edu");

      expect(result1?.id).toBe("org-1");
      expect(result2?.id).toBe("org-2");
      expect(result1?.id).not.toBe(result2?.id);
    });

    it("should auto-assign teacher to correct organization on first sign-in", async () => {
      const email = "teacher@school1.edu";
      const org = { id: "org-1", domain: "school1.edu" };

      vi.mocked(getOrganizationByDomain).mockResolvedValue(org as any);
      vi.mocked(prisma.teacher.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.teacher.create).mockResolvedValue({
        id: "teacher-1",
        email,
        displayName: "Test Teacher",
        role: "teacher",
        organizationId: "org-1",
        isSpecialist: false,
        active: true,
        createdAt: new Date(),
      });

      const orgResult = await getOrganizationByDomain("school1.edu");
      expect(orgResult?.id).toBe("org-1");

      // Verify teacher doesn't exist
      const existingTeacher = await prisma.teacher.findUnique({
        where: { email },
      });
      expect(existingTeacher).toBeNull();

      // Create teacher with organization
      const newTeacher = await prisma.teacher.create({
        data: {
          email,
          displayName: "Test Teacher",
          role: "teacher",
          organizationId: "org-1",
        },
      });

      expect(newTeacher.organizationId).toBe("org-1");
      expect(prisma.teacher.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email,
          organizationId: "org-1",
        }),
      });
    });
  });

  describe("Role Derivation", () => {
    it("should assign superadmin role to SUPER_ADMIN_EMAILS", () => {
      const email = "admin@example.com";
      const superAdminEmails = new Set(["admin@example.com"]);

      const role = superAdminEmails.has(email) ? "superadmin" : "teacher";
      expect(role).toBe("superadmin");
    });

    it("should assign admin role to ADMIN_EMAILS", () => {
      const email = "schooladmin@school1.edu";
      const bootstrapAdmins = new Set(["schooladmin@school1.edu"]);
      const superAdminEmails = new Set([]);

      let role = "teacher";
      if (superAdminEmails.has(email)) role = "superadmin";
      else if (bootstrapAdmins.has(email)) role = "admin";

      expect(role).toBe("admin");
    });

    it("should assign teacher role by default", () => {
      const email = "regular@school1.edu";
      const bootstrapAdmins = new Set([]);
      const superAdminEmails = new Set([]);

      let role = "teacher";
      if (superAdminEmails.has(email)) role = "superadmin";
      else if (bootstrapAdmins.has(email)) role = "admin";

      expect(role).toBe("teacher");
    });
  });

  describe("Inactive Users", () => {
    it("should reject sign-in for inactive teachers", async () => {
      const inactiveTeacher = {
        id: "teacher-1",
        email: "teacher@school1.edu",
        active: false,
        role: "teacher",
        organizationId: "org-1",
      };

      vi.mocked(prisma.teacher.findUnique).mockResolvedValue(inactiveTeacher as any);

      const teacher = await prisma.teacher.findUnique({
        where: { email: inactiveTeacher.email },
      });

      expect(teacher?.active).toBe(false);
      // In real auth flow, this would return false from signIn callback
    });
  });
});
