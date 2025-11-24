"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { ClassManager } from "./ClassManager";
import { TeacherManager } from "./TeacherManager";
import { StudentManager } from "./StudentManager";
import { OptionManager, type IncidentOptionGroups } from "./OptionManager";
import { IncidentControls } from "./IncidentControls";
import type { ClassRecord, StudentRecord, TeacherRecord } from "./types";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed?.error) throw new Error(parsed.error);
    } catch {
      // ignore
    }
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json();
}

type Props = {
  domain: string;
  impersonatedDomain?: string | null;
  isSuperAdminView?: boolean;
  initialOrganization?: { name: string | null; domain: string | null } | null;
};

export function AdminDashboard({
  domain,
  impersonatedDomain,
  isSuperAdminView = false,
  initialOrganization = null,
}: Props) {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [incidentOptions, setIncidentOptions] = useState<IncidentOptionGroups | null>(null);
  const [optionsDomain, setOptionsDomain] = useState<string | null>(null);
  const [savingOptions, setSavingOptions] = useState(false);
  const [retentionDays, setRetentionDays] = useState<number>(365);
  const [organization, setOrganization] = useState<{
    name: string | null;
    domain: string | null;
    lmsProvider?: "TRACKTALLY" | "SIMON" | null;
  } | null>(initialOrganization);
  const [cleanupRunning, setCleanupRunning] = useState(false);

  const buildUrl = useCallback(
    (base: string) => {
      if (!impersonatedDomain) return base;
      const sep = base.includes("?") ? "&" : "?";
      return `${base}${sep}domain=${encodeURIComponent(impersonatedDomain)}`;
    },
    [impersonatedDomain],
  );

  const loadClasses = useCallback(async () => {
    const payload = await fetchJson<{ ok: boolean; data: ClassRecord[] }>(buildUrl("/api/admin/classes"));
    setClasses(payload.data ?? []);
  }, [buildUrl]);

  const loadTeachers = useCallback(async () => {
    const payload = await fetchJson<{ ok: boolean; data: TeacherRecord[] }>(buildUrl("/api/admin/teachers"));
    setTeachers(payload.data ?? []);
  }, [buildUrl]);

  const loadStudents = useCallback(
    async (classId: string | null) => {
      if (!classId) {
        setStudents([]);
        return;
      }
      const payload = await fetchJson<{ ok: boolean; data: StudentRecord[] }>(
        buildUrl(`/api/admin/students?classroomId=${classId}`),
      );
      setStudents(payload.data ?? []);
    },
    [buildUrl],
  );

  const loadIncidentOptions = useCallback(async () => {
    try {
      const payload = await fetchJson<{ ok: boolean; data: { domain?: string; options: IncidentOptionGroups } }>(
        buildUrl(`/api/admin/options`),
      );
      setIncidentOptions(payload.data?.options ?? null);
      setOptionsDomain(payload.data?.domain ?? (impersonatedDomain ?? null));
    } catch (err) {
      // optional
      setIncidentOptions(null);
    }
  }, [buildUrl, impersonatedDomain]);

  const loadRetention = useCallback(async () => {
    try {
      const payload = await fetchJson<{ ok: true; days: number }>(buildUrl("/api/admin/incidents/retention"));
      setRetentionDays(payload.days);
    } catch {
      // ignore
    }
  }, [buildUrl]);

  const loadOrganization = useCallback(async () => {
    try {
      const payload = await fetchJson<{
        ok: boolean;
        data: { name: string; domain: string; lmsProvider?: "TRACKTALLY" | "SIMON" | null };
      }>(buildUrl("/api/admin/organization"));
      setOrganization({
        name: payload.data?.name ?? null,
        domain: payload.data?.domain ?? null,
        lmsProvider: payload.data?.lmsProvider ?? null,
      });
    } catch {
      // fall back to whatever was provided initially
      setOrganization((prev) => prev ?? initialOrganization);
    }
  }, [buildUrl, initialOrganization]);

  const reloadAll = useCallback(async () => {
    await Promise.all([
      loadClasses(),
      loadTeachers(),
      loadIncidentOptions(),
      loadRetention(),
      loadOrganization(),
    ]);
  }, [loadClasses, loadTeachers, loadIncidentOptions, loadRetention, loadOrganization]);

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

  const handleCleanup = useCallback(async () => {
    if (cleanupRunning) return;
    if (
      !window.confirm(
        "Remove the Bluegum/Koalas sample classes and the S9001-S9010 students from this school?",
      )
    ) {
      return;
    }
    setCleanupRunning(true);
    try {
      const result = await fetchJson<{
        ok: boolean;
        removedClasses: number;
        removedStudents: number;
        removedIncidents: number;
      }>(buildUrl("/api/admin/cleanup-sample-data"), { method: "POST" });
      report(
        `Removed ${result.removedClasses} classes, ${result.removedStudents} students, ${result.removedIncidents} incidents.`,
      );
      await Promise.all([loadClasses(), loadTeachers(), loadStudents(selectedClassId)]);
    } catch (err: any) {
      window.alert(err?.message ?? "Could not remove sample data.");
    } finally {
      setCleanupRunning(false);
    }
  }, [cleanupRunning, buildUrl, loadClasses, loadTeachers, loadStudents, selectedClassId]);

  const effectiveDomain = useMemo(
    () => impersonatedDomain ?? organization?.domain ?? domain,
    [impersonatedDomain, organization, domain],
  );
  const organizationLabel = organization?.name ?? effectiveDomain;

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
          boxShadow: "0 25px 55px -40px rgba(15,23,42,0.35)",
          padding: "1.25rem 1.5rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", color: "#0f172a" }}>Admin</h1>
          <p style={{ margin: "0.25rem 0 0", color: "#475569" }}>
            School: <strong>{organizationLabel}</strong>
            {organization?.domain ? (
              <span style={{ color: "#94a3b8", fontWeight: 500 }}>({organization.domain})</span>
            ) : null}
            {isSuperAdminView && impersonatedDomain ? (
              <>
                {" · managing "}
                <a href="/super-admin" style={{ color: "#0f766e", fontWeight: 600 }}>Exit to Super Admin console</a>
              </>
            ) : null}
          </p>
          {organization?.lmsProvider && organization.lmsProvider !== "TRACKTALLY" && (
            <div
              style={{
                marginTop: "0.5rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "8px",
                background: "#ecfeff",
                border: "1px solid #06b6d4",
                fontSize: "0.8rem",
              }}
            >
              <span style={{ fontSize: "1rem" }}>🏫</span>
              <span style={{ fontWeight: 600, color: "#0e7490" }}>
                {organization.lmsProvider === "SIMON" ? "SIMON LMS" : organization.lmsProvider}
              </span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: 'center', flexWrap: 'wrap' }}>
          <a
            href={impersonatedDomain ? `/admin?impersonate=${encodeURIComponent(impersonatedDomain)}` : "/admin"}
            style={{
              border: "1px solid #cbd5f5",
              padding: "0.45rem 0.75rem",
              borderRadius: "10px",
              textDecoration: "none",
              color: "#0f172a",
              background: "#f8fafc",
              fontWeight: 600,
            }}
          >
            Admin
          </a>
          <a
            href={impersonatedDomain ? `/admin/analytics?impersonate=${encodeURIComponent(impersonatedDomain)}` : "/admin/analytics"}
            style={{
              border: "1px solid #0f766e",
              padding: "0.45rem 0.75rem",
              borderRadius: "10px",
              textDecoration: "none",
              color: "#0f766e",
              background: "#ecfeff",
              fontWeight: 600,
            }}
          >
            Analytics
          </a>
          {organization?.lmsProvider && organization.lmsProvider !== "TRACKTALLY" && (
            <a
              href={impersonatedDomain ? `/admin/lms-export?impersonate=${encodeURIComponent(impersonatedDomain)}` : "/admin/lms-export"}
              style={{
                border: "1px solid #06b6d4",
                padding: "0.45rem 0.75rem",
                borderRadius: "10px",
                textDecoration: "none",
                color: "#0e7490",
                background: "#ecfeff",
                fontWeight: 600,
              }}
            >
              LMS Export
            </a>
          )}
          <a
            href={impersonatedDomain ? `/admin/incidents?impersonate=${encodeURIComponent(impersonatedDomain)}` : "/admin/incidents"}
            style={{
              border: "1px solid #cbd5f5",
              padding: "0.45rem 0.75rem",
              borderRadius: "10px",
              textDecoration: "none",
              color: "#0f172a",
              background: "#f8fafc",
              fontWeight: 600,
            }}
          >
            View incidents
          </a>
          <a
            href="/teacher"
            style={{
              border: "1px solid #cbd5f5",
              padding: "0.45rem 0.75rem",
              borderRadius: "10px",
              textDecoration: "none",
              color: "#0f172a",
              background: "#f8fafc",
              fontWeight: 600,
            }}
          >
            Incident logger
          </a>
          <a
            href="/api/health"
            style={{
              border: "1px solid #cbd5f5",
              padding: "0.45rem 0.75rem",
              borderRadius: "10px",
              textDecoration: "none",
              color: "#0f172a",
              background: "#f8fafc",
              fontWeight: 600,
            }}
          >
            Check health
          </a>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              border: "1px solid #cbd5f5",
              padding: "0.45rem 0.75rem",
              borderRadius: "10px",
              background: "white",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {message && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "12px",
            background: "#ecfeff",
            border: "1px solid #0f766e",
            color: "#0f172a",
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      )}

      <ClassManager
        classes={classes}
        teachers={teachers}
        onCreate={async (payload) => {
          await fetchJson(buildUrl("/api/admin/classes"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          report("Class created.");
          await loadClasses();
        }}
        onUpdate={async (id, patch) => {
          await fetchJson(buildUrl(`/api/admin/classes/${id}`), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          report("Class updated.");
          await loadClasses();
        }}
        onUpdateSpecialists={async (id, teacherIds) => {
          await fetchJson(buildUrl(`/api/admin/classes/${id}/specialists`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teacherIds }),
          });
          report("Specialists updated.");
          await loadClasses();
        }}
        onUploadRoster={async (id, file, mapping) => {
          const form = new FormData();
          form.set("classroomId", id);
          form.set("file", file);
          form.set("mapping", JSON.stringify(mapping));
          await fetchJson(buildUrl("/api/admin/classes/import"), { method: "POST", body: form });
          report("Roster imported.");
          await Promise.all([loadClasses(), loadStudents(id)]);
        }}
        onDelete={async (id) => {
          await fetchJson(buildUrl(`/api/admin/classes/${id}`), { method: "DELETE" });
          report("Class archived.");
          await Promise.all([loadClasses(), loadStudents(id)]);
          if (selectedClassId === id) setSelectedClassId(null);
        }}
      />

      <TeacherManager
        classes={classes}
        teachers={teachers}
        onCreate={async (payload) => {
          await fetchJson(buildUrl("/api/admin/teachers"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          report("Teacher added.");
          await loadTeachers();
        }}
        onUpdate={async (id, patch) => {
          await fetchJson(buildUrl(`/api/admin/teachers/${id}`), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          report("Teacher updated.");
          await loadTeachers();
        }}
        onDelete={async (id) => {
          await fetchJson(buildUrl(`/api/admin/teachers/${id}`), { method: "DELETE" });
          report("Teacher removed.");
          await loadTeachers();
        }}
      />

      <StudentManager
        classes={classes}
        selectedClassId={selectedClassId}
        students={students}
        onSelectClass={(id) => setSelectedClassId(id)}
        onCreateStudent={async (payload) => {
          await fetchJson(buildUrl("/api/admin/students"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          report("Student added.");
          await loadStudents(selectedClassId);
        }}
        onUpdateStudent={async (id, patch) => {
          await fetchJson(buildUrl(`/api/admin/students/${id}`), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          report("Student updated.");
          await loadStudents(selectedClassId);
        }}
        onDeleteStudent={async (id) => {
          await fetchJson(buildUrl(`/api/admin/students/${id}`), { method: "DELETE" });
          report("Student removed.");
          await loadStudents(selectedClassId);
        }}
      />

      <div style={{ display: "grid", gap: "0.5rem" }}>
        {isSuperAdminView && impersonatedDomain && (
          <div
            style={{
              padding: "0.85rem 1rem",
              borderRadius: "12px",
              background: "#ecfeff",
              border: "1px solid #0f766e",
              color: "#0f172a",
            }}
          >
            Super Admin view · managing {impersonatedDomain}. {" "}
            <a href="/super-admin" style={{ color: "#0f766e", fontWeight: 600 }}>Exit to Super Admin console</a>
          </div>
        )}
        {optionsDomain && (
          <p style={{ margin: 0, color: "#475569" }}>
            Customising options for domain <strong>{optionsDomain}</strong>
          </p>
        )}
        <OptionManager
          options={incidentOptions}
          saving={savingOptions}
          onSave={async (payload) => {
            setSavingOptions(true);
            await fetchJson(buildUrl("/api/admin/options"), {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(impersonatedDomain ? { ...payload, domain: impersonatedDomain } : payload),
            });
            setSavingOptions(false);
            report("Incident options updated.");
            await loadIncidentOptions();
          }}
        />
      </div>

      <section
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "1rem 1.25rem",
          boxShadow: "0 20px 40px -32px rgba(15,23,42,0.4)",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <h3 style={{ margin: 0, color: "#0f172a" }}>Remove sample data</h3>
          <p style={{ margin: "0.35rem 0 0", color: "#475569", fontSize: "0.95rem" }}>
            Deletes the legacy Bluegum/Koalas classes, S9001-S9010 students, and their incidents from this
            organization. Use this after onboarding to keep rosters clean.
          </p>
        </div>
        <button
          type="button"
          disabled={cleanupRunning}
          onClick={() => void handleCleanup()}
          style={{
            padding: "0.65rem 1.2rem",
            borderRadius: "12px",
            border: "1px solid #0f766e",
            background: cleanupRunning ? "#f1f5f9" : "#0f766e",
            color: cleanupRunning ? "#0f766e" : "#ffffff",
            fontWeight: 600,
            cursor: cleanupRunning ? "not-allowed" : "pointer",
            minWidth: "220px",
            textAlign: "center",
          }}
        >
          {cleanupRunning ? "Removing…" : "Remove test classes & students"}
        </button>
      </section>

      <IncidentControls initialRetention={retentionDays} />

      <footer style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
        TrackTally admin · Workspace domain: {domain} - ABN 96 110 054 130
      </footer>
    </div>
  );
}
