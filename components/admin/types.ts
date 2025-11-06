export type ClassRecord = {
  id: string;
  name: string;
  code: string;
  archived: boolean;
  homeroomTeacher: { id: string; email: string; displayName: string | null } | null;
  specialistTeachers: { id: string; email: string; displayName: string | null }[];
  studentCount: number;
};

export type TeacherRecord = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  isSpecialist: boolean;
  active: boolean;
  homeroomClass: { id: string; name: string; code: string } | null;
  specialistClasses: { id: string; name: string; code: string }[];
};

export type StudentRecord = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  guardians: string | null;
  notes: string | null;
  active: boolean;
  classroomId: string | null;
};
