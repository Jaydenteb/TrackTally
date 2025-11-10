import { prisma } from "./prisma";

/**
 * Create an audit log entry for admin actions
 * This provides accountability and troubleshooting capabilities
 */
export async function createAuditLog(params: {
  action: string;
  performedBy: string;
  meta?: Record<string, any>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        performedBy: params.performedBy,
        meta: params.meta ? JSON.stringify(params.meta) : null,
      },
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error("Failed to create audit log", error);
  }
}

/**
 * Common audit actions
 */
export const AuditActions = {
  // Student actions
  CREATE_STUDENT: "CREATE_STUDENT",
  UPDATE_STUDENT: "UPDATE_STUDENT",
  DELETE_STUDENT: "DELETE_STUDENT",
  IMPORT_STUDENTS: "IMPORT_STUDENTS",

  // Classroom actions
  CREATE_CLASSROOM: "CREATE_CLASSROOM",
  UPDATE_CLASSROOM: "UPDATE_CLASSROOM",
  DELETE_CLASSROOM: "DELETE_CLASSROOM",
  ARCHIVE_CLASSROOM: "ARCHIVE_CLASSROOM",
  SEED_CLASSROOM: "SEED_CLASSROOM",
  ASSIGN_SPECIALIST: "ASSIGN_SPECIALIST",

  // Teacher actions
  CREATE_TEACHER: "CREATE_TEACHER",
  UPDATE_TEACHER: "UPDATE_TEACHER",
  DELETE_TEACHER: "DELETE_TEACHER",
  DEACTIVATE_TEACHER: "DEACTIVATE_TEACHER",

  // Organization actions
  CREATE_ORGANIZATION: "CREATE_ORGANIZATION",
  UPDATE_ORGANIZATION: "UPDATE_ORGANIZATION",
  DELETE_ORGANIZATION: "DELETE_ORGANIZATION",

  // Incident actions
  EXPORT_INCIDENTS: "EXPORT_INCIDENTS",
  ENFORCE_RETENTION: "ENFORCE_RETENTION",

  // Options
  UPDATE_OPTIONS: "UPDATE_OPTIONS",
} as const;
