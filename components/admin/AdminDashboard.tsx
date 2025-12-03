"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { ClassManager } from "./ClassManager";
import { TeacherManager } from "./TeacherManager";
import { StudentManager } from "./StudentManager";
import { OptionManager, type IncidentOptionGroups } from "./OptionManager";
import { IncidentControls } from "./IncidentControls";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from "../ui/Modal";
import { RoleBanner } from "../layout/RoleBanner";
import type { ClassRecord, StudentRecord, TeacherRecord } from "./types";
import styles from "./AdminDashboard.module.css";

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
  role?: "admin" | "superadmin" | "teacher";
  currentPath?: string;
  initialOrganization?: { name: string | null; domain: string | null } | null;
};

export function AdminDashboard({
  domain,
  impersonatedDomain,
  isSuperAdminView = false,
  role = "admin",
  currentPath,
  initialOrganization = null,
}: Props) {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cleanupConfirm, setCleanupConfirm] = useState(false);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
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

  const doCleanup = useCallback(async () => {
    if (cleanupRunning) return;
    setCleanupRunning(true);
    setCleanupConfirm(false);
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
      setCleanupError(err?.message ?? "Could not remove sample data.");
    } finally {
      setCleanupRunning(false);
    }
  }, [cleanupRunning, buildUrl, loadClasses, loadTeachers, loadStudents, selectedClassId]);

  const handleCleanup = useCallback(() => {
    if (cleanupRunning) return;
    setCleanupConfirm(true);
  }, [cleanupRunning]);

  const effectiveDomain = useMemo(
    () => impersonatedDomain ?? organization?.domain ?? domain,
    [impersonatedDomain, organization, domain],
  );
  const organizationLabel = organization?.name ?? effectiveDomain;

  return (
    <div className={styles.container}>
      <RoleBanner
        role="admin"
        organizationName={organizationLabel}
        organizationDomain={organization?.domain}
        isImpersonating={isSuperAdminView}
      />

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Admin Dashboard</h1>
          {organization?.lmsProvider && organization.lmsProvider !== "TRACKTALLY" && (
            <div className={styles.lmsBadge}>
              <span className={styles.lmsBadgeIcon}>🏫</span>
              <span className={styles.lmsBadgeText}>
                {organization.lmsProvider === "SIMON" ? "SIMON LMS" : organization.lmsProvider}
              </span>
            </div>
          )}
        </div>
        <div className={styles.headerActions}>
          <Button
            href={impersonatedDomain ? `/admin?impersonate=${encodeURIComponent(impersonatedDomain)}` : "/admin"}
            variant="outline"
            size="sm"
            active={currentPath === "/admin"}
          >
            Admin
          </Button>
          <Button
            href={impersonatedDomain ? `/admin/analytics?impersonate=${encodeURIComponent(impersonatedDomain)}` : "/admin/analytics"}
            variant="secondary"
            size="sm"
            active={currentPath === "/admin/analytics"}
          >
            Analytics
          </Button>
          {organization?.lmsProvider && organization.lmsProvider !== "TRACKTALLY" && (
            <Button
              href={impersonatedDomain ? `/admin/lms-export?impersonate=${encodeURIComponent(impersonatedDomain)}` : "/admin/lms-export"}
              variant="secondary"
              size="sm"
              active={currentPath === "/admin/lms-export"}
            >
              LMS Export
            </Button>
          )}
          <Button
            href={impersonatedDomain ? `/admin/incidents?impersonate=${encodeURIComponent(impersonatedDomain)}` : "/admin/incidents"}
            variant="outline"
            size="sm"
            active={currentPath === "/admin/incidents"}
          >
            View incidents
          </Button>
          <Button
            href="/teacher"
            variant="outline"
            size="sm"
          >
            Incident logger
          </Button>
          {isSuperAdminView && (
            <Button
              href="/super-admin"
              variant="secondary"
              size="sm"
            >
              Exit to Super Admin
            </Button>
          )}
          {role === "superadmin" && (
            <Button
              href="/api/health"
              variant="ghost"
              size="sm"
            >
              Check health
            </Button>
          )}
          <Button
            onClick={() => signOut({ callbackUrl: "/login" })}
            variant="outline"
            size="sm"
          >
            Sign out
          </Button>
        </div>
      </header>

      {message && (
        <div className={styles.message}>
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

      <div className={styles.optionsSection}>
        {isSuperAdminView && impersonatedDomain && (
          <div className={styles.superAdminNotice}>
            Super Admin view · managing {impersonatedDomain}. {" "}
            <a href="/super-admin">Exit to Super Admin console</a>
          </div>
        )}
        {optionsDomain && (
          <p className={styles.optionsDomainText}>
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

      <section className={styles.cleanupSection}>
        <div className={styles.cleanupInfo}>
          <h3 className={styles.cleanupTitle}>Remove sample data</h3>
          <p className={styles.cleanupDescription}>
            Deletes the legacy Bluegum/Koalas classes, S9001-S9010 students, and their incidents from this
            organization. Use this after onboarding to keep rosters clean.
          </p>
        </div>
        <button
          type="button"
          disabled={cleanupRunning}
          onClick={() => void handleCleanup()}
          className={styles.cleanupButton}
        >
          {cleanupRunning ? "Removing…" : "Remove test classes & students"}
        </button>
      </section>

      <IncidentControls initialRetention={retentionDays} />

      <footer className={styles.footer}>
        TrackTally admin · Workspace domain: {domain} - ABN 96 110 054 130
      </footer>

      {/* Cleanup Confirmation Dialog */}
      <ConfirmDialog
        isOpen={cleanupConfirm}
        onClose={() => setCleanupConfirm(false)}
        onConfirm={doCleanup}
        title="Remove sample data?"
        description="This will remove the Bluegum/Koalas sample classes and the S9001-S9010 students from this school. This action cannot be undone."
        confirmText="Remove sample data"
        variant="warning"
      />

      {/* Cleanup Error Modal */}
      <Modal isOpen={!!cleanupError} onClose={() => setCleanupError(null)} size="sm">
        <ModalHeader onClose={() => setCleanupError(null)}>
          <ModalTitle>Cleanup Failed</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className={styles.errorText}>{cleanupError}</p>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setCleanupError(null)}>OK</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
