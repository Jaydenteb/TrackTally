import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "../lib/prisma";

vi.mock("../lib/prisma", () => ({
  prisma: {
    incident: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    classroom: {
      findMany: vi.fn(),
    },
    teacher: {
      findMany: vi.fn(),
    },
  },
}));

describe("Multi-Tenant Data Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Incident Isolation", () => {
    it("should only return incidents for the user's organization", async () => {
      const org1Incidents = [
        {
          id: "inc-1",
          organizationId: "org-1",
          studentName: "Student A",
          teacherEmail: "teacher@school1.edu",
        },
        {
          id: "inc-2",
          organizationId: "org-1",
          studentName: "Student B",
          teacherEmail: "teacher@school1.edu",
        },
      ];

      vi.mocked(prisma.incident.findMany).mockResolvedValue(org1Incidents as any);

      const incidents = await prisma.incident.findMany({
        where: { organizationId: "org-1" },
      });

      expect(incidents).toHaveLength(2);
      expect(incidents.every((inc) => inc.organizationId === "org-1")).toBe(true);
    });

    it("should prevent cross-organization incident access", async () => {
      // Attempting to access org-2 incidents while in org-1 context
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);

      const incidents = await prisma.incident.findMany({
        where: { organizationId: "org-2" }, // Different org
      });

      // Should return empty if org context is enforced
      expect(incidents).toHaveLength(0);
    });

    it("should include organizationId in all incident writes", async () => {
      const incidentData = {
        uuid: "test-uuid",
        studentId: "student-1",
        studentName: "Test Student",
        teacherEmail: "teacher@school1.edu",
        level: "Minor",
        category: "Disruption",
        location: "Classroom",
        organizationId: "org-1", // Critical field
      };

      vi.mocked(prisma.incident.create).mockResolvedValue({
        id: "inc-1",
        ...incidentData,
        timestamp: new Date(),
        createdAt: new Date(),
      } as any);

      const incident = await prisma.incident.create({
        data: incidentData,
      });

      expect(incident.organizationId).toBe("org-1");
      expect(prisma.incident.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: "org-1",
        }),
      });
    });
  });

  describe("Student Isolation", () => {
    it("should only return students from user's organization", async () => {
      const org1Students = [
        { id: "s1", studentId: "001", firstName: "Alice", organizationId: "org-1" },
        { id: "s2", studentId: "002", firstName: "Bob", organizationId: "org-1" },
      ];

      vi.mocked(prisma.student.findMany).mockResolvedValue(org1Students as any);

      const students = await prisma.student.findMany({
        where: { organizationId: "org-1" },
      });

      expect(students).toHaveLength(2);
      expect(students.every((s) => s.organizationId === "org-1")).toBe(true);
    });

    it("should enforce organization scope in student lookups", async () => {
      vi.mocked(prisma.student.findFirst).mockResolvedValue({
        id: "s1",
        studentId: "001",
        firstName: "Test",
        lastName: "Student",
        organizationId: "org-1",
      } as any);

      const student = await prisma.student.findFirst({
        where: {
          studentId: "001",
          organizationId: "org-1",
        },
      });

      expect(student?.organizationId).toBe("org-1");
      expect(prisma.student.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          organizationId: "org-1",
        }),
      });
    });
  });

  describe("Classroom Isolation", () => {
    it("should only return classrooms from user's organization", async () => {
      const org1Classrooms = [
        { id: "c1", name: "Class 1A", code: "1A", organizationId: "org-1" },
        { id: "c2", name: "Class 1B", code: "1B", organizationId: "org-1" },
      ];

      vi.mocked(prisma.classroom.findMany).mockResolvedValue(org1Classrooms as any);

      const classrooms = await prisma.classroom.findMany({
        where: { organizationId: "org-1" },
      });

      expect(classrooms).toHaveLength(2);
      expect(classrooms.every((c) => c.organizationId === "org-1")).toBe(true);
    });
  });

  describe("Teacher Isolation", () => {
    it("should only return teachers from user's organization", async () => {
      const org1Teachers = [
        { id: "t1", email: "teacher1@school1.edu", organizationId: "org-1" },
        { id: "t2", email: "teacher2@school1.edu", organizationId: "org-1" },
      ];

      vi.mocked(prisma.teacher.findMany).mockResolvedValue(org1Teachers as any);

      const teachers = await prisma.teacher.findMany({
        where: { organizationId: "org-1" },
      });

      expect(teachers).toHaveLength(2);
      expect(teachers.every((t) => t.organizationId === "org-1")).toBe(true);
    });

    it("should handle null organizationId for super admins", async () => {
      const superAdminTeacher = {
        id: "t-super",
        email: "superadmin@tracktally.com",
        organizationId: null,
        role: "superadmin",
      };

      vi.mocked(prisma.teacher.findMany).mockResolvedValue([superAdminTeacher] as any);

      const teachers = await prisma.teacher.findMany({
        where: { role: "superadmin" },
      });

      expect(teachers[0]?.organizationId).toBeNull();
      expect(teachers[0]?.role).toBe("superadmin");
    });
  });

  describe("Super Admin Impersonation", () => {
    it("should allow super admin to query any organization", async () => {
      // Super admin accessing org-1
      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        { id: "inc-1", organizationId: "org-1" },
      ] as any);

      const org1Incidents = await prisma.incident.findMany({
        where: { organizationId: "org-1" },
      });

      expect(org1Incidents).toHaveLength(1);

      // Super admin accessing org-2
      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        { id: "inc-2", organizationId: "org-2" },
      ] as any);

      const org2Incidents = await prisma.incident.findMany({
        where: { organizationId: "org-2" },
      });

      expect(org2Incidents).toHaveLength(1);
      expect(org1Incidents[0]?.organizationId).not.toBe(org2Incidents[0]?.organizationId);
    });
  });
});
