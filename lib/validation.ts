import { z } from "zod";

const HTML_TAG_REGEX = /<[^>]*>?/g;

const TYPE_VALUES = ["incident", "commendation"] as const;

const LEVEL_VALUES = ["Minor", "Major"] as const;
const CATEGORY_VALUES = [
  "Disruption",
  "Non-compliance",
  "Unsafe play",
  "Physical contact",
  "Defiance",
  "Tech misuse",
  "Bullying",
  "Other",
] as const;
const LOCATION_VALUES = ["Classroom", "Yard", "Specialist", "Transition", "Online"] as const;
const ACTION_VALUES = [
  "Redirect",
  "Time out",
  "Restorative chat",
  "Parent contact",
  "Office referral",
] as const;

// Commendation-specific values
const COMMENDATION_LEVEL_VALUES = ["Notable", "Exceptional"] as const;
const COMMENDATION_CATEGORY_VALUES = [
  "Excellent work",
  "Helping others",
  "Leadership",
  "Improvement",
  "Positive attitude",
  "Kindness",
  "Responsibility",
  "Other",
] as const;

export const typeSchema = z.enum(TYPE_VALUES);
export const levelSchema = z.enum(LEVEL_VALUES);
export const categorySchema = z.enum(CATEGORY_VALUES);
export const locationSchema = z.enum(LOCATION_VALUES);
export const actionSchema = z.enum(ACTION_VALUES);
export const commendationLevelSchema = z.enum(COMMENDATION_LEVEL_VALUES);
export const commendationCategorySchema = z.enum(COMMENDATION_CATEGORY_VALUES);

export type BehaviorType = (typeof TYPE_VALUES)[number];
export type BehaviorLevel = (typeof LEVEL_VALUES)[number];
export type BehaviorCategory = (typeof CATEGORY_VALUES)[number];
export type BehaviorLocation = (typeof LOCATION_VALUES)[number];
export type BehaviorAction = (typeof ACTION_VALUES)[number];
export type CommendationLevel = (typeof COMMENDATION_LEVEL_VALUES)[number];
export type CommendationCategory = (typeof COMMENDATION_CATEGORY_VALUES)[number];

function stripHtml(value: string) {
  return value.replace(HTML_TAG_REGEX, "").trim();
}

export function sanitize(value: unknown): string {
  if (typeof value !== "string") return "";
  return stripHtml(value);
}

export function sanitizeOptional(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const cleaned = stripHtml(String(value));
  return cleaned.length ? cleaned : undefined;
}

export const incidentInputSchema = z.object({
  type: typeSchema.default("incident"),
  studentId: z.string().trim().min(1).max(64),
  studentName: z.string().trim().min(1).max(120),
  level: z.string().trim().min(1).max(32), // Flexible to allow both incident and commendation levels
  category: z.string().trim().min(1).max(64), // Flexible to allow both incident and commendation categories
  location: locationSchema,
  actionTaken: z.string().trim().max(120).optional().nullable(),
  note: z.string().trim().max(600).optional().nullable(),
  classCode: z.string().trim().max(32).optional().nullable(),
  device: z.string().trim().max(200).optional().nullable(),
  uuid: z.string().uuid().optional().nullable(),
  timestamp: z
    .string()
    .trim()
    .max(40)
    .optional()
    .nullable(),
});

export type IncidentInput = z.infer<typeof incidentInputSchema>;

export const classroomCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(24),
  homeroomTeacherId: z.string().cuid().optional().nullable(),
});

export const classroomUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  code: z.string().trim().min(1).max(24).optional(),
  archived: z.boolean().optional(),
  homeroomTeacherId: z.union([z.string().cuid(), z.literal(null)]).optional(),
});

export const classroomSpecialistSchema = z.object({
  teacherIds: z.array(z.string().cuid()).max(50),
});

export const teacherCreateSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  displayName: z.string().trim().max(120).optional().nullable(),
  role: z.enum(["admin", "teacher"]).default("teacher"),
  isSpecialist: z.boolean().default(false),
  classroomIds: z.array(z.string().cuid()).default([]),
});

export const teacherUpdateSchema = z.object({
  displayName: z.string().trim().max(120).optional().nullable(),
  role: z.enum(["admin", "teacher"]).optional(),
  isSpecialist: z.boolean().optional(),
  active: z.boolean().optional(),
  classroomIds: z.array(z.string().cuid()).optional(),
});

export const studentCreateSchema = z.object({
  studentId: z.string().trim().min(1).max(32),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  classroomId: z.string().cuid().optional().nullable(),
  guardians: z.string().trim().max(160).optional().nullable(),
});

export const studentUpdateSchema = z.object({
  studentId: z.string().trim().min(1).max(32).optional(),
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  classroomId: z.union([z.string().cuid(), z.literal(null)]).optional(),
  guardians: z.string().trim().max(160).optional().nullable(),
  notes: z.string().trim().max(600).optional().nullable(),
  active: z.boolean().optional(),
});
