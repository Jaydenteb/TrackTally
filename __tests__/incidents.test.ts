import { describe, it, expect, beforeEach, vi } from "vitest";
import { incidentInputSchema, sanitize } from "../lib/validation";

describe("Incident Validation & Creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Input Validation", () => {
    it("should validate valid incident data", () => {
      const validIncident = {
        studentId: "12345",
        studentName: "Test Student",
        level: "Minor",
        category: "Disruption",
        location: "Classroom",
        actionTaken: "Redirect",
        note: "Talking during quiet work",
        classCode: "5A",
        device: "iPad",
        uuid: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2025-01-10T12:00:00Z",
      };

      const result = incidentInputSchema.safeParse(validIncident);
      expect(result.success).toBe(true);
    });

    it("should reject incident with missing required fields", () => {
      const invalidIncident = {
        studentId: "12345",
        // Missing studentName, level, category, location
      };

      const result = incidentInputSchema.safeParse(invalidIncident);
      expect(result.success).toBe(false);
    });

    it("should reject incident with invalid level", () => {
      const invalidIncident = {
        studentId: "12345",
        studentName: "Test Student",
        level: "Critical", // Not in enum
        category: "Disruption",
        location: "Classroom",
      };

      const result = incidentInputSchema.safeParse(invalidIncident);
      expect(result.success).toBe(false);
    });

    it("should enforce string length limits", () => {
      const longNote = "a".repeat(700); // Exceeds 600 char limit

      const invalidIncident = {
        studentId: "12345",
        studentName: "Test Student",
        level: "Minor",
        category: "Disruption",
        location: "Classroom",
        note: longNote,
      };

      const result = incidentInputSchema.safeParse(invalidIncident);
      expect(result.success).toBe(false);
    });
  });

  describe("HTML Sanitization", () => {
    it("should strip HTML tags from input", () => {
      const dirtyInput = "<script>alert('xss')</script>Student Name";
      const cleaned = sanitize(dirtyInput);

      expect(cleaned).toBe("alert('xss')Student Name");
      expect(cleaned).not.toContain("<script>");
      expect(cleaned).not.toContain("</script>");
    });

    it("should strip multiple HTML tags", () => {
      const dirtyInput = "<b>Bold</b> and <i>italic</i> text";
      const cleaned = sanitize(dirtyInput);

      expect(cleaned).toBe("Bold and italic text");
      expect(cleaned).not.toContain("<b>");
      expect(cleaned).not.toContain("<i>");
    });

    it("should handle empty strings", () => {
      expect(sanitize("")).toBe("");
      expect(sanitize(null)).toBe("");
      expect(sanitize(undefined)).toBe("");
    });

    it("should trim whitespace", () => {
      const input = "  Test Student  ";
      const cleaned = sanitize(input);
      expect(cleaned).toBe("Test Student");
    });
  });

  describe("UUID Idempotency", () => {
    it("should accept valid UUIDs", () => {
      const validUuid = "550e8400-e29b-41d4-a716-446655440000";
      const incident = {
        studentId: "12345",
        studentName: "Test Student",
        level: "Minor",
        category: "Disruption",
        location: "Classroom",
        uuid: validUuid,
      };

      const result = incidentInputSchema.safeParse(incident);
      expect(result.success).toBe(true);
      expect(result.data?.uuid).toBe(validUuid);
    });

    it("should reject invalid UUIDs", () => {
      const invalidUuid = "not-a-uuid";
      const incident = {
        studentId: "12345",
        studentName: "Test Student",
        level: "Minor",
        category: "Disruption",
        location: "Classroom",
        uuid: invalidUuid,
      };

      const result = incidentInputSchema.safeParse(incident);
      expect(result.success).toBe(false);
    });

    it("should allow optional UUID field", () => {
      const incident = {
        studentId: "12345",
        studentName: "Test Student",
        level: "Minor",
        category: "Disruption",
        location: "Classroom",
        // No UUID provided
      };

      const result = incidentInputSchema.safeParse(incident);
      expect(result.success).toBe(true);
      expect(result.data?.uuid).toBeUndefined();
    });
  });

  describe("Enum Validation", () => {
    it("should accept valid levels", () => {
      const levels = ["Minor", "Major"];

      levels.forEach((level) => {
        const incident = {
          studentId: "12345",
          studentName: "Test Student",
          level,
          category: "Disruption",
          location: "Classroom",
        };

        const result = incidentInputSchema.safeParse(incident);
        expect(result.success).toBe(true);
      });
    });

    it("should accept all valid categories", () => {
      const categories = [
        "Disruption",
        "Non-compliance",
        "Unsafe play",
        "Physical contact",
        "Defiance",
        "Tech misuse",
        "Bullying",
        "Other",
      ];

      categories.forEach((category) => {
        const incident = {
          studentId: "12345",
          studentName: "Test Student",
          level: "Minor",
          category,
          location: "Classroom",
        };

        const result = incidentInputSchema.safeParse(incident);
        expect(result.success).toBe(true);
      });
    });

    it("should accept all valid locations", () => {
      const locations = ["Classroom", "Yard", "Specialist", "Transition", "Online"];

      locations.forEach((location) => {
        const incident = {
          studentId: "12345",
          studentName: "Test Student",
          level: "Minor",
          category: "Disruption",
          location,
        };

        const result = incidentInputSchema.safeParse(incident);
        expect(result.success).toBe(true);
      });
    });
  });
});
