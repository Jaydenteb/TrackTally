"use client";

import { FormEvent, useState } from "react";
import { ClassRecord, TeacherRecord } from "./types";

type Props = {
  classes: ClassRecord[];
  teachers: TeacherRecord[];
  onCreate: (payload: {
    email: string;
    displayName?: string | null;
    role: "teacher" | "admin";
    isSpecialist: boolean;
    classroomIds: string[];
  }) => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
};

export function TeacherManager({ classes, teachers, onCreate, onUpdate, onDelete }: Props) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"teacher" | "admin">("teacher");
  const [isSpecialist, setIsSpecialist] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onCreate({
      email,
      displayName: displayName || undefined,
      role,
      isSpecialist,
      classroomIds: selectedClasses,
    });
    setEmail("");
    setDisplayName("");
    setRole("teacher");
    setIsSpecialist(false);
    setSelectedClasses([]);
  }

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
      <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#0f172a" }}>Teachers & Staff</h2>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          background: "#f8fafc",
          padding: "1rem",
          borderRadius: "16px",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{ padding: "0.65rem", borderRadius: "12px", border: "1px solid #cbd5f5" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>Display name</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            style={{ padding: "0.65rem", borderRadius: "12px", border: "1px solid #cbd5f5" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>Role</span>
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value === "admin" ? "admin" : "teacher")
            }
            style={{ padding: "0.65rem", borderRadius: "12px", border: "1px solid #cbd5f5" }}
          >
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>Specialist classes</span>
          <select
            multiple
            value={selectedClasses}
            onChange={(event) =>
              setSelectedClasses(
                Array.from(event.target.selectedOptions).map((option) => option.value),
              )
            }
            style={{
              padding: "0.65rem",
              borderRadius: "12px",
              border: "1px solid #cbd5f5",
              minHeight: "120px",
            }}
          >
            {classes
              .filter((cls) => !cls.archived)
              .map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
          </select>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <input
              type="checkbox"
              checked={isSpecialist}
              onChange={(event) => setIsSpecialist(event.target.checked)}
            />
            Mark as specialist
          </label>
        </label>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button
            type="submit"
            style={{
              padding: "0.75rem 1.2rem",
              borderRadius: "12px",
              border: "none",
              background: "#0f766e",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Add teacher
          </button>
        </div>
      </form>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#475569" }}>
              <th style={{ padding: "0.75rem 0.5rem" }}>Name</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Email</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Role</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Specialist classes</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Active</th>
              <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => (
              <tr key={teacher.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600, color: "#0f172a" }}>
                  {teacher.displayName ?? "—"}
                </td>
                <td style={{ padding: "0.75rem 0.5rem", color: "#475569" }}>
                  {teacher.email}
                </td>
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  <select
                    value={teacher.role === "admin" ? "admin" : "teacher"}
                    onChange={(event) =>
                      onUpdate(teacher.id, { role: event.target.value as "admin" | "teacher" })
                    }
                    style={{
                      padding: "0.45rem 0.6rem",
                      borderRadius: "10px",
                      border: "1px solid #cbd5f5",
                    }}
                  >
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  <div style={{ display: "grid", gap: "0.35rem" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                      <input
                        type="checkbox"
                        checked={teacher.isSpecialist}
                        onChange={(event) =>
                          onUpdate(teacher.id, { isSpecialist: event.target.checked })
                        }
                      />
                      Specialist
                    </label>
                    <select
                      multiple
                      value={teacher.specialistClasses.map((cls) => cls.id)}
                      onChange={(event) =>
                        onUpdate(teacher.id, {
                          classroomIds: Array.from(event.target.selectedOptions).map(
                            (option) => option.value,
                          ),
                        })
                      }
                      style={{
                        padding: "0.45rem",
                        borderRadius: "10px",
                        border: "1px solid #cbd5f5",
                        minWidth: "180px",
                      }}
                    >
                      {classes
                        .filter((cls) => !cls.archived)
                        .map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </td>
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                    <input
                      type="checkbox"
                      checked={teacher.active}
                      onChange={(event) =>
                        onUpdate(teacher.id, { active: event.target.checked })
                      }
                    />
                    Active
                  </label>
                </td>
                <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remove ${teacher.displayName ?? teacher.email} from TrackTally? They will lose access.`,
                        )
                      ) {
                        onDelete(teacher.id);
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
          </tbody>
        </table>
      </div>
    </section>
  );
}
