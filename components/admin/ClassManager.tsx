"use client";

import { FormEvent, useMemo, useState } from "react";
import { ClassRecord, TeacherRecord } from "./types";

type Props = {
  classes: ClassRecord[];
  teachers: TeacherRecord[];
  onCreate: (payload: { name: string; code: string; homeroomTeacherId?: string | null }) => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => void;
  onUpdateSpecialists: (id: string, teacherIds: string[]) => void;
  onUploadRoster: (
    id: string,
    file: File,
    mapping: { studentId: string; firstName: string; lastName: string; guardians?: string },
  ) => void;
  onDelete: (id: string) => void;
};

const headerNormalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const HEADER_SUGGESTIONS: Record<string, "studentId" | "firstName" | "lastName" | "guardians"> = {
  studentid: "studentId",
  student_id: "studentId",
  student: "studentId",
  id: "studentId",
  firstname: "firstName",
  first_name: "firstName",
  givenname: "firstName",
  preferred: "firstName",
  preferredname: "firstName",
  preferredfirstname: "firstName",
  preferredfirst: "firstName",
  lastname: "lastName",
  last_name: "lastName",
  surname: "lastName",
  guardians: "guardians",
  guardianemails: "guardians",
  guardiansemail: "guardians",
  parentemails: "guardians",
  parentemail: "guardians",
};

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values.map((cell) => cell.replace(/^"|"$/g, "").trim());
}

type ImportConfig = {
  classId: string;
  file: File;
  headers: string[];
  mapping: { studentId: string; firstName: string; lastName: string; guardians?: string };
};

export function ClassManager({
  classes,
  teachers,
  onCreate,
  onUpdate,
  onUpdateSpecialists,
  onUploadRoster,
  onDelete,
}: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [homeroomTeacherId, setHomeroomTeacherId] = useState<string | null>(null);
  const [importConfig, setImportConfig] = useState<ImportConfig | null>(null);

  const specialistTeachers = useMemo(
    () => teachers.filter((teacher) => teacher.active),
    [teachers],
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onCreate({
      name,
      code,
      homeroomTeacherId,
    });
    setName("");
    setCode("");
    setHomeroomTeacherId(null);
  }

  function buildDefaultMapping(headers: string[]) {
    const map: ImportConfig["mapping"] = {
      studentId: "",
      firstName: "",
      lastName: "",
      guardians: "",
    };

    headers.forEach((header) => {
      const key = HEADER_SUGGESTIONS[headerNormalise(header)];
      if (key && !(map as any)[key]) {
        (map as any)[key] = header;
      }
    });

    if (!map.studentId && headers[0]) map.studentId = headers[0];
    if (!map.firstName && headers[1]) map.firstName = headers[1];
    if (!map.lastName && headers[2]) map.lastName = headers[2];

    return map;
  }

  function handleRosterFile(classId: string, file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = typeof reader.result === "string" ? reader.result : "";
        const firstLine = content
          .replace(/^\uFEFF/, "")
          .split(/\r?\n/)
          .find((line) => line.trim());
        if (!firstLine) {
          window.alert("CSV is empty.");
          return;
        }
        const headers = splitCsvLine(firstLine).filter(Boolean);
        if (!headers.length) {
          window.alert("Could not read CSV headers.");
          return;
        }
        const mapping = buildDefaultMapping(headers);
        setImportConfig({ classId, file, headers, mapping });
      } catch (error) {
        console.error("Failed to read CSV", error);
        window.alert("Could not read CSV file.");
      }
    };
    reader.onerror = () => {
      console.error("Failed to read CSV", reader.error);
      window.alert("Could not read CSV file.");
    };
    reader.readAsText(file);
  }

  function updateMapping(key: keyof ImportConfig["mapping"], value: string) {
    setImportConfig((prev) =>
      prev ? { ...prev, mapping: { ...prev.mapping, [key]: value } } : prev,
    );
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
      <header style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#0f172a" }}>Classes</h2>
        <span style={{ color: "#64748b", fontSize: "0.95rem" }}>
          Active: {classes.filter((cls) => !cls.archived).length}
        </span>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          background: "#f8fafc",
          padding: "1rem",
          borderRadius: "16px",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>Class name</span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            style={{ padding: "0.65rem", borderRadius: "12px", border: "1px solid #cbd5f5" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>Code</span>
          <input
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            style={{ padding: "0.65rem", borderRadius: "12px", border: "1px solid #cbd5f5" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>Homeroom teacher</span>
          <select
            value={homeroomTeacherId ?? ""}
            onChange={(event) => setHomeroomTeacherId(event.target.value || null)}
            style={{ padding: "0.65rem", borderRadius: "12px", border: "1px solid #cbd5f5" }}
          >
            <option value="">Unassigned</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.displayName ?? teacher.email}
              </option>
            ))}
          </select>
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
            Create class
          </button>
        </div>
      </form>

      <div style={{ display: "grid", gap: "1rem" }}>
        {classes.map((cls) => (
          <div
            key={cls.id}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "1rem",
              background: cls.archived ? "#f1f5f9" : "white",
              opacity: cls.archived ? 0.6 : 1,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h3 style={{ margin: 0, color: "#0f172a" }}>
                  {cls.name} <span style={{ color: "#64748b" }}>({cls.code})</span>
                </h3>
                <p style={{ margin: "0.25rem 0", color: "#475569" }}>
                  {cls.studentCount} active students
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => onUpdate(cls.id, { archived: !cls.archived })}
                  style={{
                    padding: "0.5rem 0.85rem",
                    borderRadius: "12px",
                    border: "1px solid #cbd5f5",
                    background: "#f8fafc",
                    cursor: "pointer",
                  }}
                >
                  {cls.archived ? "Unarchive" : "Archive"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete ${cls.name}? This will remove staff access to this class.`,
                      )
                    ) {
                      onDelete(cls.id);
                    }
                  }}
                  style={{
                    padding: "0.5rem 0.85rem",
                    borderRadius: "12px",
                    border: "1px solid #dc2626",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Delete class
                </button>
                <label
                  style={{
                    padding: "0.5rem 0.85rem",
                    borderRadius: "12px",
                    border: "1px dashed #cbd5f5",
                    background: "#f8fafc",
                    cursor: "pointer",
                  }}
                >
                  Import CSV
                  <input
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        handleRosterFile(cls.id, file);
                      }
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            <div
              style={{
                marginTop: "0.75rem",
                display: "grid",
                gap: "0.75rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>Homeroom teacher</span>
                <select
                  value={cls.homeroomTeacher?.id ?? ""}
                  onChange={(event) =>
                    onUpdate(cls.id, { homeroomTeacherId: event.target.value || null })
                  }
                  style={{ padding: "0.6rem", borderRadius: "12px", border: "1px solid #cbd5f5" }}
                >
                  <option value="">Unassigned</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.displayName ?? teacher.email}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>Specialist staff</span>
                <select
                  multiple
                  value={cls.specialistTeachers.map((teacher) => teacher.id)}
                  onChange={(event) =>
                    onUpdateSpecialists(
                      cls.id,
                      Array.from(event.target.selectedOptions).map((option) => option.value),
                    )
                  }
                  style={{
                    padding: "0.6rem",
                    borderRadius: "12px",
                    border: "1px solid #cbd5f5",
                    minHeight: "120px",
                  }}
                >
                  {specialistTeachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.displayName ?? teacher.email}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>

      {importConfig && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "20px",
              padding: "1.5rem",
              width: "min(520px, 100%)",
              display: "grid",
              gap: "1rem",
              boxShadow: "0 30px 60px -40px rgba(15,23,42,0.6)",
            }}
          >
            <header>
              <h3 style={{ margin: 0, fontSize: "1.35rem", color: "#0f172a" }}>
                Map CSV columns
              </h3>
              <p style={{ margin: "0.35rem 0 0", color: "#475569" }}>
                Choose which columns correspond to TrackTally fields.
              </p>
            </header>

            {(["studentId", "firstName", "lastName", "guardians"] as const).map((field) => (
              <label key={field} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>
                  {field === "studentId"
                    ? "Student ID"
                    : field === "firstName"
                    ? "First name"
                    : field === "lastName"
                    ? "Last name"
                    : "Guardian contacts (optional)"}
                </span>
                <select
                  value={importConfig.mapping[field] ?? ""}
                  onChange={(event) => updateMapping(field, event.target.value)}
                  style={{ padding: "0.65rem", borderRadius: "12px", border: "1px solid #cbd5f5" }}
                >
                  <option value="">
                    {field === "guardians" ? "Skip guardians column" : "Select column"}
                  </option>
                  {importConfig.headers.map((header) => (
                    <option key={`${field}-${header}`} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setImportConfig(null)}
                style={{
                  padding: "0.65rem 1.1rem",
                  borderRadius: "12px",
                  border: "1px solid #cbd5f5",
                  background: "#f8fafc",
                  cursor: "pointer",
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const mapping = importConfig.mapping;
                  if (!mapping.studentId || !mapping.firstName || !mapping.lastName) {
                    window.alert("Map student ID, first name, and last name before importing.");
                    return;
                  }
                  const sanitized: {
                    studentId: string;
                    firstName: string;
                    lastName: string;
                    guardians?: string;
                  } = {
                    studentId: mapping.studentId,
                    firstName: mapping.firstName,
                    lastName: mapping.lastName,
                  };
                  if (mapping.guardians) sanitized.guardians = mapping.guardians;
                  onUploadRoster(importConfig.classId, importConfig.file, sanitized);
                  setImportConfig(null);
                }}
                style={{
                  padding: "0.65rem 1.1rem",
                  borderRadius: "12px",
                  border: "none",
                  background: "#0f766e",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Import roster
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
