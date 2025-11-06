"use client";

import { useCallback, useEffect, useState } from "react";
import { ClassManager } from "./ClassManager";
import { TeacherManager } from "./TeacherManager";
import { StudentManager } from "./StudentManager";
import { ClassRecord, StudentRecord, TeacherRecord } from "./types";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed?.error) throw new Error(parsed.error);
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(text || `Request failed (${response.status})`);
  }
  return response.json();
}

type Props = {
  domain: string;
};

export function AdminDashboard({ domain }: Props) {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    const payload = await fetchJson<{ ok: boolean; data: ClassRecord[] }>("/api/admin/classes");
    setClasses(payload.data ?? []);
  }, []);

  const loadTeachers = useCallback(async () => {
    const payload = await fetchJson<{ ok: boolean; data: TeacherRecord[] }>("/api/admin/teachers");
    setTeachers(payload.data ?? []);
  }, []);

  const loadStudents = useCallback(
    async (classId: string | null) => {
      if (!classId) {
        setStudents([]);
        return;
      }
      const payload = await fetchJson<{ ok: boolean; data: StudentRecord[] }>(
        `/api/admin/students?classroomId=${classId}`,
      );
      setStudents(payload.data ?? []);
    },
    [],
  );

  const reloadAll = useCallback(async () => {
    await Promise.all([loadClasses(), loadTeachers()]);
  }, [loadClasses, loadTeachers]);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    if (classes.length && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    void loadStudents(selectedClassId);
  }, [selectedClassId, loadStudents]);

  function report(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(null), 3200);
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem", width: "min(1080px, 100%)" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "0.75rem",
          background: "white",
          borderRadius: "20px",
          padding: "1.25rem 1.5rem",
          boxShadow: "0 25px 55px -40px rgba(15,23,42,0.35)",
        }}
      >
        <div style={{ maxWidth: "640px" }}>
          <h1 style={{ margin: 0, fontSize: "1.8rem", color: "#0f172a" }}>TrackTally Admin</h1>
          <p style={{ margin: "0.4rem 0 0", color: "#475569" }}>
            Manage classes, teachers, and student rosters for your school. Access is limited to
            Google Workspace admins from {domain}.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <a
            href="/admin/incidents"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.65rem 1rem",
              borderRadius: "12px",
              border: "1px solid #0f766e",
              color: "#0f766e",
              textDecoration: "none",
              fontWeight: 600,
              background: "#ecfeff",
            }}
          >
            Incidents
          </a>
          <a
            href="/teacher"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.65rem 1rem",
              borderRadius: "12px",
              background: "#0f766e",
              color: "white",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Open tracker
          </a>
          <a
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.65rem 1rem",
              borderRadius: "12px",
              border: "1px solid #0f766e",
              color: "#0f766e",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Teacher home
          </a>
        </div>
      </header>

      {message && (
        <div
          style={{
            padding: "0.85rem 1rem",
            borderRadius: "12px",
            background: "#f8fafc",
            border: "1px solid #cbd5f5",
            color: "#0f172a",
          }}
        >
          {message}
        </div>
      )}

      <ClassManager
        classes={classes}
        teachers={teachers}
        onCreate={async (payload) => {
          await fetchJson("/api/admin/classes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          report("Class created.");
          await reloadAll();
        }}
        onUpdate={async (id, patch) => {
          await fetchJson(`/api/admin/classes/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          report("Class updated.");
          await reloadAll();
        }}
        onUpdateSpecialists={async (id, teacherIds) => {
          await fetchJson(`/api/admin/classes/${id}/specialists`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teacherIds }),
          });
          report("Specialists updated.");
          await reloadAll();
        }}
        onUploadRoster={async (id, file, mapping) => {
          const form = new FormData();
          form.append("classroomId", id);
          form.append("file", file);
          form.append("mapping", JSON.stringify(mapping));
          await fetchJson("/api/admin/classes/import", {
            method: "POST",
            body: form,
          });
          report("Roster imported.");
          await Promise.all([reloadAll(), loadStudents(id)]);
        }}
        onSeedRoster={async (id) => {
          await fetchJson(`/api/admin/classes/${id}/seed`, { method: "POST" });
          report("Added sample students.");
          await Promise.all([reloadAll(), loadStudents(id)]);
        }}
        onDelete={async (id) => {
          await fetchJson(`/api/admin/classes/${id}`, { method: "DELETE" });
          report("Class archived.");
          await Promise.all([reloadAll(), loadStudents(id)]);
          if (selectedClassId === id) {
            setSelectedClassId(null);
          }
        }}
      />

      <TeacherManager
        classes={classes}
        teachers={teachers}
        onCreate={async (payload) => {
          await fetchJson("/api/admin/teachers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          report("Teacher added.");
          await reloadAll();
        }}
        onUpdate={async (id, patch) => {
          await fetchJson(`/api/admin/teachers/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          report("Teacher updated.");
          await reloadAll();
        }}
        onDelete={async (id) => {
          await fetchJson(`/api/admin/teachers/${id}`, { method: "DELETE" });
          report("Teacher removed.");
          await reloadAll();
        }}
      />

      <StudentManager
        classes={classes}
        selectedClassId={selectedClassId}
        students={students}
        onSelectClass={(id) => setSelectedClassId(id)}
        onUpdateStudent={async (id, patch) => {
          await fetchJson(`/api/admin/students/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          report("Student updated.");
          await loadStudents(selectedClassId);
        }}
        onDeleteStudent={async (id) => {
          await fetchJson(`/api/admin/students/${id}`, { method: "DELETE" });
          report("Student removed.");
          await loadStudents(selectedClassId);
        }}
      />

      <footer style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
        TrackTally admin · Workspace domain: {domain}
      </footer>
    </div>
  );
}
