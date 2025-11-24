/**
 * LMS Template System
 *
 * Provides type-safe field mapping between TrackTally's data model
 * and external LMS providers (e.g. SIMON).
 *
 * This allows TrackTally to store data in its own format while
 * exporting/displaying it in formats expected by different LMS systems.
 */

import type { Incident } from "@prisma/client";

// Re-export the LmsProvider enum from Prisma
export { LmsProvider } from "@prisma/client";
export type { LmsProvider as LmsProviderType } from "@prisma/client";

/**
 * Extended incident interface for export
 * Includes all TrackTally fields plus LMS-specific fields
 */
export interface IncidentForExport {
  // Core TrackTally fields (always available)
  id: string;
  uuid: string;
  date: Date;
  time: string | null;
  type: "incident" | "commendation";
  studentId: string | null;
  studentName: string;
  classCode: string | null;
  teacherEmail: string;
  level: string;
  category: string;
  location: string | null;
  actionTaken: string | null;
  note: string | null;
  device: string | null;

  // SIMON-specific fields (may use defaults if not collected)
  title?: string;
  details?: string;
  reportedByStaffId?: string;
  reportedByStaffName?: string;
  locationType?: "yard" | "room" | "offsite";
  campus?: string | null;
  yardArea?: string | null;
  roomId?: string | null;
  status?: "resolved" | "unresolved";
  followUpRequired?: boolean;
  followUpNotes?: string | null;
  perceivedMotivation?: string | null;

  // SIMON instigators/affected (not yet collected)
  instigatorIds?: string[];
  affectedStudentIds?: string[];
  affectedStaffIds?: string[];

  // SIMON notifications (not yet collected)
  notifyRoleCodes?: string[];
  notifyStaffIds?: string[];
  detentionAdded?: boolean;
}

/**
 * Extended commendation interface for export
 */
export interface CommendationForExport {
  // Core TrackTally fields
  id: string;
  uuid: string;
  date: Date;
  studentId: string | null;
  studentName: string;
  teacherEmail: string;
  category: string;
  note: string | null;

  // SIMON-specific fields
  title?: string;
  details?: string;
  certificateExport?: boolean;
  studentIds?: string[];
}

/**
 * Helper function to parse location string into structured location type
 */
export function parseLocationType(
  location: string | null,
): "yard" | "room" | "offsite" {
  if (!location) return "offsite";
  const lower = location.toLowerCase();
  if (lower.includes("yard") || lower.includes("playground")) return "yard";
  if (lower.includes("room") || lower.includes("classroom")) return "room";
  return "offsite";
}

/**
 * Helper function to extract campus from location string
 */
export function extractCampus(location: string | null): string | null {
  if (!location) return null;
  // Example: "Main Campus - Yard" -> "Main Campus"
  const match = location.match(/^([^-]+)\s*-/);
  return match ? match[1].trim() : null;
}

/**
 * Helper function to extract yard area from location string
 */
export function extractYardArea(location: string | null): string | null {
  if (!location) return null;
  const lower = location.toLowerCase();
  if (!lower.includes("yard")) return null;
  // Example: "Yard - Upper Field" -> "Upper Field"
  const match = location.match(/yard\s*-\s*(.+)/i);
  return match ? match[1].trim() : null;
}

/**
 * Helper function to extract room ID from location string
 */
export function extractRoomId(location: string | null): string | null {
  if (!location) return null;
  const lower = location.toLowerCase();
  if (!lower.includes("room")) return null;
  // Example: "Room 101" or "Classroom 3A" -> "101" or "3A"
  const match = location.match(/(?:room|classroom)\s*([a-z0-9]+)/i);
  return match ? match[1] : null;
}

/**
 * Generic field mapper type
 * Each field can be either a static value or a function that transforms the incident
 */
export type LmsFieldMapper<T> = {
  [K in keyof T]: T[K] | ((incident: Incident) => T[K]);
};

/**
 * LMS template definitions
 * Each provider has a mapping from Incident model to its export format
 */
export const LMS_TEMPLATES: Record<
  "TRACKTALLY" | "SIMON",
  Partial<LmsFieldMapper<IncidentForExport>>
> = {
  /**
   * TrackTally default template
   * Direct mapping with minimal transformation
   */
  TRACKTALLY: {
    id: (i) => i.id,
    uuid: (i) => i.uuid,
    date: (i) => i.timestamp,
    time: (i) => null, // Not collected yet
    type: (i) => i.type as "incident" | "commendation",
    studentId: (i) => i.studentId,
    studentName: (i) => i.studentName,
    classCode: (i) => i.classCode,
    teacherEmail: (i) => i.teacherEmail,
    level: (i) => i.level,
    category: (i) => i.category,
    location: (i) => i.location,
    actionTaken: (i) => i.actionTaken,
    note: (i) => i.note,
    device: (i) => i.device,
    title: (i) => i.category, // Use category as title
    details: (i) => i.note || "",
  },

  /**
   * SIMON LMS template
   * Maps TrackTally fields to SIMON's expected format
   * Uses defaults for fields not yet collected
   */
  SIMON: {
    // Direct mappings
    id: (i) => i.id,
    uuid: (i) => i.uuid,
    date: (i) => i.timestamp,
    type: (i) => i.type as "incident" | "commendation",
    studentId: (i) => i.studentId,
    studentName: (i) => i.studentName,
    classCode: (i) => i.classCode,
    teacherEmail: (i) => i.teacherEmail,
    level: (i) => i.level,
    category: (i) => i.category,

    // Transformed fields
    title: (i) => i.category, // Map category to title
    details: (i) => i.note || "",
    reportedByStaffId: (i) => i.teacherEmail, // TODO: Map to actual staff ID
    reportedByStaffName: (i) => i.teacherEmail, // TODO: Map to display name

    // Location parsing
    location: (i) => i.location,
    locationType: (i) => parseLocationType(i.location),
    campus: (i) => extractCampus(i.location),
    yardArea: (i) => {
      const locType = parseLocationType(i.location);
      return locType === "yard" ? extractYardArea(i.location) : null;
    },
    roomId: (i) => {
      const locType = parseLocationType(i.location);
      return locType === "room" ? extractRoomId(i.location) : null;
    },

    // Action taken
    actionTaken: (i) => i.actionTaken,
    note: (i) => i.note,

    // Time field (not yet collected in TrackTally)
    time: () => null, // DEFAULT: not yet collected

    // Status fields (not yet collected)
    status: () => "resolved" as const, // DEFAULT: auto-resolved
    followUpRequired: () => false, // DEFAULT: no follow-up
    followUpNotes: () => null, // DEFAULT: not yet collected
    perceivedMotivation: () => null, // DEFAULT: not yet collected

    // Multi-student/staff fields (not yet collected)
    instigatorIds: () => [], // DEFAULT: not yet collected
    affectedStudentIds: () => [], // DEFAULT: not yet collected
    affectedStaffIds: () => [], // DEFAULT: not yet collected

    // Notification fields (not yet collected)
    notifyRoleCodes: () => [], // DEFAULT: not yet collected
    notifyStaffIds: () => [], // DEFAULT: not yet collected
    detentionAdded: () => false, // DEFAULT: not yet collected

    device: (i) => i.device,
  },
};

/**
 * Commendation template mappings
 */
export const COMMENDATION_TEMPLATES: Record<
  "TRACKTALLY" | "SIMON",
  Partial<LmsFieldMapper<CommendationForExport>>
> = {
  TRACKTALLY: {
    id: (i) => i.id,
    uuid: (i) => i.uuid,
    date: (i) => i.timestamp,
    studentId: (i) => i.studentId,
    studentName: (i) => i.studentName,
    teacherEmail: (i) => i.teacherEmail,
    category: (i) => i.category,
    note: (i) => i.note,
    title: (i) => i.category,
    details: (i) => i.note || "",
  },

  SIMON: {
    id: (i) => i.id,
    uuid: (i) => i.uuid,
    date: (i) => i.timestamp,
    studentId: (i) => i.studentId,
    studentName: (i) => i.studentName,
    teacherEmail: (i) => i.teacherEmail,
    category: (i) => i.category,
    title: (i) => i.category,
    details: (i) => i.note || "",
    certificateExport: () => true, // DEFAULT: include in certificates
    studentIds: (i) => (i.studentId ? [i.studentId] : []), // Single student as array
    note: (i) => i.note,
  },
};

/**
 * Transform an incident using the specified LMS template
 */
export function transformIncident(
  incident: Incident,
  provider: "TRACKTALLY" | "SIMON" = "TRACKTALLY",
): Partial<IncidentForExport> {
  const template = LMS_TEMPLATES[provider];
  const result: Partial<IncidentForExport> = {};

  for (const [key, mapper] of Object.entries(template)) {
    const value = typeof mapper === "function" ? mapper(incident) : mapper;
    // @ts-expect-error - Dynamic key assignment
    result[key] = value;
  }

  return result;
}

/**
 * Transform a commendation using the specified LMS template
 */
export function transformCommendation(
  incident: Incident,
  provider: "TRACKTALLY" | "SIMON" = "TRACKTALLY",
): Partial<CommendationForExport> {
  const template = COMMENDATION_TEMPLATES[provider];
  const result: Partial<CommendationForExport> = {};

  for (const [key, mapper] of Object.entries(template)) {
    const value = typeof mapper === "function" ? mapper(incident) : mapper;
    // @ts-expect-error - Dynamic key assignment
    result[key] = value;
  }

  return result;
}

/**
 * Get a list of fields that are using default values (not yet collected)
 */
export function getDefaultFields(
  provider: "TRACKTALLY" | "SIMON",
): string[] {
  if (provider === "TRACKTALLY") return [];

  // Fields that use default values in SIMON template
  return [
    "time",
    "status",
    "followUpRequired",
    "followUpNotes",
    "perceivedMotivation",
    "instigatorIds",
    "affectedStudentIds",
    "affectedStaffIds",
    "notifyRoleCodes",
    "notifyStaffIds",
    "detentionAdded",
  ];
}

/**
 * Get human-readable labels for LMS providers
 */
export const LMS_PROVIDER_LABELS: Record<"TRACKTALLY" | "SIMON", string> = {
  TRACKTALLY: "TrackTally (Default)",
  SIMON: "SIMON LMS",
};

/**
 * Get description for each provider
 */
export const LMS_PROVIDER_DESCRIPTIONS: Record<
  "TRACKTALLY" | "SIMON",
  string
> = {
  TRACKTALLY: "Standard TrackTally incident and commendation tracking",
  SIMON:
    "SIMON Learning Management System integration with extended incident workflow",
};
