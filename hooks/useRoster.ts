import { useCallback, useEffect, useMemo, useState } from "react";

export type Student = {
  id: string;
  studentId: string;
  name: string;
  firstName: string;
  lastName: string;
};

export type ClassData = {
  id: string;
  name: string;
  code: string;
  students: Student[];
};

type UseRosterOptions = {
  status: "loading" | "authenticated" | "unauthenticated";
  role: string;
  selectedOrgDomain?: string;
  onError?: (message: string) => void;
};

export function useRoster({
  status,
  role,
  selectedOrgDomain,
  onError,
}: UseRosterOptions) {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [rosterLoading, setRosterLoading] = useState(true);

  const loadRoster = useCallback(async (orgDomain?: string) => {
    if (status !== "authenticated") return;
    setRosterLoading(true);
    try {
      const url = orgDomain
        ? `/api/roster?domain=${encodeURIComponent(orgDomain)}`
        : "/api/roster";
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        console.error("Failed to load roster", await response.text());
        onError?.("Could not load roster.");
        return;
      }
      const payload = await response.json();
      const mapped: ClassData[] = (payload.data ?? []).map((cls: any) => ({
        id: cls.id,
        name: cls.name,
        code: cls.code,
        students: (cls.students ?? []).map((student: any) => ({
          id: student.id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          name: `${student.firstName} ${student.lastName}`,
        })),
      }));
      setClasses(mapped);
      setSelectedClass((prev) => prev || (mapped[0]?.id ?? ""));
    } catch (error) {
      console.error("Roster load failed", error);
      onError?.("Could not load roster.");
    } finally {
      setRosterLoading(false);
    }
  }, [status, onError]);

  // Load roster when org selection changes
  useEffect(() => {
    if (status === "authenticated") {
      setRosterLoading(true);
      if (role === "superadmin" && selectedOrgDomain) {
        void loadRoster(selectedOrgDomain);
      } else {
        void loadRoster();
      }
    } else if (status === "unauthenticated") {
      setRosterLoading(false);
    }
  }, [status, loadRoster, role, selectedOrgDomain]);

  // Restore last selected class from localStorage
  useEffect(() => {
    if (!classes.length) return;
    const storedClass = localStorage.getItem("tracktally:lastClass");
    if (storedClass && classes.some((c) => c.id === storedClass)) {
      setSelectedClass((prev) => prev || storedClass);
    } else {
      setSelectedClass((prev) => prev || classes[0].id);
    }
  }, [classes]);

  // Save selected class to localStorage
  useEffect(() => {
    if (selectedClass) {
      localStorage.setItem("tracktally:lastClass", selectedClass);
    }
  }, [selectedClass]);

  const currentClass = useMemo(
    () => classes.find((item) => item.id === selectedClass) ?? null,
    [classes, selectedClass],
  );

  const allStudents = useMemo(
    () =>
      classes.flatMap((classroom) =>
        classroom.students.map((student) => ({
          id: student.id,
          studentId: student.studentId,
          name: student.name,
          classId: classroom.id,
          classLabel: classroom.name,
        })),
      ),
    [classes],
  );

  return {
    classes,
    selectedClass,
    setSelectedClass,
    currentClass,
    allStudents,
    rosterLoading,
    loadRoster,
  };
}
