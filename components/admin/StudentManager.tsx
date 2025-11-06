"use client";

import { useEffect, useState } from "react";
import { ClassRecord, StudentRecord } from "./types";

type Props = {
  classes: ClassRecord[];
  selectedClassId: string | null;
  students: StudentRecord[];
  onSelectClass: (id: string | null) => void;
  onUpdateStudent: (id: string, patch: Record<string, unknown>) => void;
  onDeleteStudent: (id: string) => void;
};

export function StudentManager({
  classes,
  selectedClassId,
  students,
  onSelectClass,
  onUpdateStudent,
  onDeleteStudent,
}: Props) {
  const [localStudents, setLocalStudents] = useState<StudentRecord[]>(students);

  useEffect(() => {
    setLocalStudents(students);
  }, [students]);

  function updateLocalStudent(id: string, patch: Partial<StudentRecord>) {
    setLocalStudents((current) =>
      current.map((student) => (student.id === id ? { ...student, ...patch } : student)),
    );
  }

  const activeClasses = classes.filter((cls) => !cls.archived);

  return (
    <section
      style={{
        background: "white",
        borderRadius: "20px",
        boxShadow: "0 25px 55px -40px rgba(15,23,42,0.35)",
        padding: "1.75rem",
        display: "grid",
        gap: "1.25rem",
      }}
    >
      <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#0f172a" }}>Students</h2>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <select
          value={selectedClassId ?? ""}
          onChange={(event) => onSelectClass(event.target.value || null)}
          style={{
            padding: "0.65rem",
            borderRadius: "12px",
            border: "1px solid #cbd5f5",
            minWidth: "220px",
          }}
        >
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} {cls.archived ? "(archived)" : ""}
            </option>
          ))}
        </select>
        {selectedClassId && (
          <span style={{ color: "#475569" }}>
            {localStudents.length} students in{" "}
            {classes.find((cls) => cls.id === selectedClassId)?.name ?? ""}
          </span>
        )}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", fontSize: "0.95rem", color: "#475569" }}>
              <th style={{ padding: "0.75rem 0.5rem" }}>Student</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Student ID</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Guardians</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Notes</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Class</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Active</th>
              <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {localStudents.map((student) => (
              <tr key={student.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  <div style={{ display: "grid", gap: "0.35rem" }}>
                    <input
                      value={student.firstName}
                      onChange={(event) => {
                        updateLocalStudent(student.id, { firstName: event.target.value });
                        onUpdateStudent(student.id, { firstName: event.target.value });
                      }}
                      style={{
                        padding: "0.45rem",
                        borderRadius: "10px",
                        border: "1px solid #cbd5f5",
                      }}
                    />
                    <input
                      value={student.lastName}
                      onChange={(event) => {
                        updateLocalStudent(student.id, { lastName: event.target.value });
                        onUpdateStudent(student.id, { lastName: event.target.value });
                      }}
                      style={{
                        padding: "0.45rem",
                        borderRadius: "10px",
                        border: "1px solid #cbd5f5",
                      }}
                    />
                  </div>
                </td>
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  <input
                    value={student.studentId}
                    onChange={(event) => {
                      updateLocalStudent(student.id, { studentId: event.target.value });
                      onUpdateStudent(student.id, { studentId: event.target.value });
                    }}
                    style={{
                      padding: "0.45rem",
                      borderRadius: "10px",
                      border: "1px solid #cbd5f5",
                    }}
                  />
                </td>
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  <textarea
                    rows={2}
                    value={student.guardians ?? ""}
                    placeholder="guardian emails"
                    onChange={(event) => {
                      updateLocalStudent(student.id, { guardians: event.target.value });
                      onUpdateStudent(student.id, { guardians: event.target.value || null });
                    }}
                    style={{
                      width: "100%",
                      padding: "0.45rem",
                      borderRadius: "10px",
                      border: "1px solid #cbd5f5",
                    }}
                  />
                </td>
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  <textarea
                    rows={2}
                    value={student.notes ?? ""}
                    onChange={(event) => {
                      updateLocalStudent(student.id, { notes: event.target.value });
                      onUpdateStudent(student.id, { notes: event.target.value || null });
                    }}
                    style={{
                      width: "100%",
                      padding: "0.45rem",
                      borderRadius: "10px",
                      border: "1px solid #cbd5f5",
                    }}
                  />
                </td>
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  <select
                    value={student.classroomId ?? ""}
                    onChange={(event) => {
                      updateLocalStudent(student.id, { classroomId: event.target.value });
                      onUpdateStudent(student.id, {
                        classroomId: event.target.value || null,
                      });
                    }}
                    style={{
                      padding: "0.45rem",
                      borderRadius: "10px",
                      border: "1px solid #cbd5f5",
                    }}
                  >
                    <option value="">Unassigned</option>
                    {activeClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                    <input
                      type="checkbox"
                      checked={student.active}
                      onChange={(event) => {
                        updateLocalStudent(student.id, { active: event.target.checked });
                        onUpdateStudent(student.id, { active: event.target.checked });
                      }}
                    />
                    Active
                  </label>
                </td>
                <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Remove ${student.firstName} ${student.lastName}?`)) {
                        onDeleteStudent(student.id);
                        setLocalStudents((current) =>
                          current.filter((item) => item.id !== student.id),
                        );
                      }
                    }}
                    style={{
                      padding: "0.45rem 0.75rem",
                      borderRadius: "10px",
                      border: "1px solid #dc2626",
                      background: "#fef2f2",
                      color: "#b91c1c",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {!localStudents.length && (
              <tr>
                <td colSpan={7} style={{ padding: "1rem", textAlign: "center", color: "#64748b" }}>
                  No students for this class yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
