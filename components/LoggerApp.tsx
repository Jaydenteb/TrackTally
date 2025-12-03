"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import styles from "../app/page.module.css";
import { queueIncident } from "../lib/idb";
import { InstallPwaButton } from "./InstallPwaButton";
import { usePwaInstall } from "./PwaInstallProvider";
import {
  useIncidentForm,
  useOfflineQueue,
  useRoster,
  STEP_ORDER,
  STEP_TITLES,
  getStepDescription,
  type StepKey,
  type IncidentPayload,
} from "../hooks";
import { StudentSelector, ChipSelector, NoteStep } from "./logger";

type Props = {
  authConfigured: boolean;
  missingEnv: string[];
  redirectAdmin?: boolean;
};

export function LoggerApp({
  authConfigured,
  missingEnv,
  redirectAdmin = true,
}: Props) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isIosSafari, isStandalone } = usePwaInstall();

  // Use extracted hooks
  const {
    type, level, category, location, actionTaken, note,
    incidentOptions, activeStepOrder,
    setType, setLevel, setCategory, setLocation, setActionTaken, setNote,
    resetForm,
  } = useIncidentForm();

  const {
    queueCount, sendIncident, processQueue, refreshQueueCount,
  } = useOfflineQueue();

  const role = session?.user?.role ?? "teacher";
  const userEmail = session?.user?.email ?? "";
  const organizationName = session?.user?.organizationName ?? null;
  const organizationDomain = session?.user?.organizationDomain ?? null;

  // Super admin org selection
  const [selectedOrgDomain, setSelectedOrgDomain] = useState<string>("");
  const [availableOrgs, setAvailableOrgs] = useState<Array<{ id: string; name: string; domain: string }>>([]);

  const [toast, setToast] = useState<string>("");
  const showToast = useCallback((message: string) => setToast(message), []);

  const {
    classes, selectedClass, setSelectedClass,
    currentClass, allStudents, rosterLoading,
  } = useRoster({
    status,
    role,
    selectedOrgDomain,
    onError: showToast,
  });

  // Local state
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showIosInstallHint, setShowIosInstallHint] = useState(false);

  const stepPanelRef = useRef<HTMLDivElement | null>(null);
  const swipeOrigin = useRef<{ x: number; y: number } | null>(null);

  // iOS install hint
  useEffect(() => {
    if (!isIosSafari || isStandalone) {
      setShowIosInstallHint(false);
      return;
    }
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem("tt-ios-a2hs-dismissed");
    setShowIosInstallHint(dismissed !== "true");
  }, [isIosSafari, isStandalone]);

  const handleDismissIosInstallHint = useCallback(() => {
    setShowIosInstallHint(false);
    try {
      window.localStorage.setItem("tt-ios-a2hs-dismissed", "true");
    } catch {
      // no-op
    }
  }, []);

  // Load organizations for super admins
  useEffect(() => {
    if (status === "authenticated" && role === "superadmin") {
      fetch("/api/super-admin/schools")
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.data) {
            setAvailableOrgs(data.data);
            if (!selectedOrgDomain && data.data.length > 0) {
              setSelectedOrgDomain(data.data[0].domain);
            }
          }
        })
        .catch((err) => console.error("Failed to load organizations", err));
    }
  }, [status, role, selectedOrgDomain]);

  // Redirect admins
  useEffect(() => {
    if (!redirectAdmin || !authConfigured || status !== "authenticated") return;
    if (role === "superadmin") {
      router.replace("/super-admin");
      return;
    }
    if (role === "admin") {
      router.replace("/admin");
    }
  }, [authConfigured, redirectAdmin, role, router, status]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  // Step navigation logic
  const maxUnlockedStep = useMemo(() => {
    let unlocked = 0;
    if (selectedStudents.length) unlocked = 1;
    if (unlocked >= 1 && type) unlocked = 2;

    if (type === "commendation") {
      if (unlocked >= 2 && category) unlocked = 3;
      if (unlocked >= 3 && location) unlocked = 4;
      return unlocked;
    }

    if (unlocked >= 2 && level) unlocked = 3;
    if (unlocked >= 3 && category) unlocked = 4;
    if (unlocked >= 4 && location) unlocked = 5;
    if (unlocked >= 5 && actionTaken) unlocked = 6;
    return unlocked;
  }, [selectedStudents.length, type, level, category, location, actionTaken]);

  useEffect(() => {
    if (currentStepIndex > maxUnlockedStep) {
      setCurrentStepIndex(maxUnlockedStep);
    }
  }, [currentStepIndex, maxUnlockedStep]);

  useEffect(() => {
    if (!selectedStudents.length && currentStepIndex > 0) {
      setCurrentStepIndex(0);
    }
  }, [selectedStudents.length, currentStepIndex]);

  // Bulk mode constraint
  useEffect(() => {
    if (!isBulkMode && selectedStudents.length > 1) {
      setSelectedStudents((prev) => prev.slice(0, 1));
    }
  }, [isBulkMode, selectedStudents]);

  const currentStep = activeStepOrder[currentStepIndex] as StepKey;
  const isFinalStep = currentStepIndex === activeStepOrder.length - 1;
  const canProceed = currentStepIndex < maxUnlockedStep;
  const stepCount = activeStepOrder.length;

  const handleNext = useCallback(() => {
    setCurrentStepIndex((prev) => Math.min(prev + 1, maxUnlockedStep));
  }, [maxUnlockedStep]);

  const handleBack = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Swipe navigation
  const handleTouchStartSwipe = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    swipeOrigin.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEndSwipe = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    if (!swipeOrigin.current || event.changedTouches.length !== 1) {
      swipeOrigin.current = null;
      return;
    }
    const { x, y } = swipeOrigin.current;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - x;
    const dy = touch.clientY - y;
    swipeOrigin.current = null;

    if (Math.abs(dx) < 60 || Math.abs(dy) > 40) return;

    if (dx < 0 && currentStepIndex < maxUnlockedStep) {
      handleNext();
    } else if (dx > 0 && currentStepIndex > 0) {
      handleBack();
    }
  }, [currentStepIndex, handleBack, handleNext, maxUnlockedStep]);

  const handleTouchCancelSwipe = useCallback(() => {
    swipeOrigin.current = null;
  }, []);

  // Student selection handlers
  const handleStudentToggle = useCallback((studentId: string) => {
    if (!currentClass) return;
    setSelectedStudents((prev) => {
      if (isBulkMode) {
        return prev.includes(studentId)
          ? prev.filter((id) => id !== studentId)
          : [...prev, studentId];
      }
      return prev[0] === studentId ? [] : [studentId];
    });
  }, [currentClass, isBulkMode]);

  const handleStudentSelected = useCallback((studentId: string, classId: string) => {
    if (classId !== selectedClass) {
      setSelectedClass(classId);
    }
    setSelectedStudents([studentId]);
  }, [selectedClass, setSelectedClass]);

  // Step selection handlers with auto-advance
  const handleTypeSelect = useCallback((option: string) => {
    setType(option);
    setCurrentStepIndex((prev) => {
      const target = STEP_ORDER.indexOf("level");
      return prev < target ? target : prev;
    });
  }, [setType]);

  const handleLevelSelect = useCallback((option: string) => {
    setLevel(option);
    setCurrentStepIndex((prev) => {
      const target = STEP_ORDER.indexOf("category");
      return prev < target ? target : prev;
    });
  }, [setLevel]);

  const handleCategorySelect = useCallback((option: string) => {
    setCategory(option);
    setCurrentStepIndex((prev) => {
      const target = STEP_ORDER.indexOf("location");
      return prev < target ? target : prev;
    });
  }, [setCategory]);

  const handleLocationSelect = useCallback((option: string) => {
    setLocation(option);
    setCurrentStepIndex((prev) => {
      const target = STEP_ORDER.indexOf("action");
      return prev < target ? target : prev;
    });
  }, [setLocation]);

  const handleActionSelect = useCallback((option: string) => {
    setActionTaken(option);
    setCurrentStepIndex((prev) => {
      const target = STEP_ORDER.indexOf("note");
      return prev < target ? target : prev;
    });
  }, [setActionTaken]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!selectedStudents.length) {
      showToast("Pick at least one student.");
      setCurrentStepIndex(activeStepOrder.indexOf("students" as any));
      return;
    }
    if (!type) {
      showToast("Choose incident or commendation.");
      setCurrentStepIndex(activeStepOrder.indexOf("type" as any));
      return;
    }
    if (type === "incident") {
      if (!level) {
        showToast("Select a level.");
        setCurrentStepIndex(STEP_ORDER.indexOf("level"));
        return;
      }
      if (!actionTaken) {
        showToast("Select an action.");
        setCurrentStepIndex(STEP_ORDER.indexOf("action"));
        return;
      }
    }
    if (!category) {
      showToast("Choose a category.");
      setCurrentStepIndex(activeStepOrder.indexOf("category" as any));
      return;
    }
    if (!location) {
      showToast("Choose a location.");
      setCurrentStepIndex(activeStepOrder.indexOf("location" as any));
      return;
    }

    setIsSubmitting(true);
    const deviceInfo = typeof navigator !== "undefined" ? navigator.userAgent : undefined;

    if (!currentClass) {
      showToast("Select a class to log incidents.");
      setIsSubmitting(false);
      return;
    }

    const incidents: IncidentPayload[] = selectedStudents
      .map((studentId) => {
        const student = currentClass.students.find((s) => s.id === studentId);
        if (!student) return null;
        return {
          type,
          studentId: student.studentId,
          studentName: student.name,
          level: type === "commendation" ? "Notable" : level,
          category,
          location,
          actionTaken: type === "commendation" ? "Recognized" : actionTaken,
          note,
          classCode: currentClass.code,
          device: deviceInfo,
          uuid: crypto.randomUUID(),
        };
      })
      .filter(Boolean) as IncidentPayload[];

    let sent = 0;
    let queued = 0;
    let lastError: string | null = null;

    for (const incident of incidents) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await queueIncident(incident);
        queued += 1;
        continue;
      }

      try {
        await sendIncident(incident);
        sent += 1;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Failed to send incident";
        await queueIncident(incident);
        queued += 1;
      }
    }

    await refreshQueueCount();
    setIsSubmitting(false);

    if (sent && !queued) {
      showToast("Logged");
    } else if (sent && queued) {
      const queuedMsg = `Queued ${queued} log${queued === 1 ? "" : "s"} offline.`;
      showToast(lastError ? `${lastError} ${queuedMsg}` : `Logged ${sent}, ${queuedMsg}`);
    } else if (queued) {
      const queuedMsg = `Queued ${queued} log${queued === 1 ? "" : "s"} offline.`;
      showToast(lastError ? `${lastError} ${queuedMsg}` : queuedMsg);
    }

    processQueue();

    // Reset form
    setCurrentStepIndex(0);
    setSelectedStudents([]);
    setIsBulkMode(false);
    resetForm();
  }, [
    selectedStudents, type, level, category, location, actionTaken, note,
    currentClass, activeStepOrder, sendIncident, processQueue, refreshQueueCount,
    resetForm, showToast,
  ]);

  // Enter key submit
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.shiftKey) return;
      if (!isFinalStep || isSubmitting) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (["TEXTAREA", "INPUT", "BUTTON", "SELECT"].includes(tag)) {
        event.preventDefault();
        void handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSubmit, isFinalStep, isSubmitting]);

  // Focus management
  useEffect(() => {
    if (!stepPanelRef.current) return;
    const focusable = stepPanelRef.current.querySelector<HTMLElement>(
      "button, input, textarea, select",
    );
    focusable?.focus();
  }, [currentStep]);

  const handleSignIn = () => void signIn("google", { callbackUrl: "/" });
  const handleSignOut = () => void signOut({ callbackUrl: "/login" });

  // Render step content
  const renderStepContent = (): JSX.Element => {
    switch (currentStep) {
      case "students":
        return (
          <StudentSelector
            classes={classes}
            selectedClass={selectedClass}
            currentClass={currentClass}
            selectedStudents={selectedStudents}
            allStudents={allStudents}
            isBulkMode={isBulkMode}
            onSelectClass={(id) => {
              setSelectedClass(id);
              setSelectedStudents([]);
              setCurrentStepIndex(0);
            }}
            onToggleStudent={handleStudentToggle}
            onToggleBulkMode={() => setIsBulkMode((prev) => !prev)}
            onStudentSelected={handleStudentSelected}
          />
        );
      case "type":
        return (
          <ChipSelector
            title="Record type"
            options={["Incident", "Commendation"]}
            selected={type === "incident" ? "Incident" : type === "commendation" ? "Commendation" : ""}
            onSelect={(option) => handleTypeSelect(option.toLowerCase())}
          />
        );
      case "level":
        return (
          <ChipSelector
            title={type === "commendation" ? "Impact" : "Level"}
            options={type === "commendation" ? incidentOptions.commendationLevels || [] : incidentOptions.levels}
            selected={level}
            onSelect={handleLevelSelect}
          />
        );
      case "category":
        return (
          <ChipSelector
            title={type === "commendation" ? "Recognition type" : "Category"}
            options={type === "commendation" ? incidentOptions.commendationCategories || [] : incidentOptions.categories}
            selected={category}
            onSelect={handleCategorySelect}
          />
        );
      case "location":
        return (
          <ChipSelector
            title="Location"
            options={incidentOptions.locations}
            selected={location}
            onSelect={handleLocationSelect}
          />
        );
      case "action":
        return (
          <ChipSelector
            title="Action taken"
            options={incidentOptions.actions}
            selected={actionTaken}
            onSelect={handleActionSelect}
          />
        );
      case "note":
        return (
          <NoteStep
            note={note}
            isRecording={isRecording}
            onNoteChange={setNote}
            onRecordingChange={setIsRecording}
            onToast={showToast}
          />
        );
      default:
        return <></>;
    }
  };

  // Auth states
  if (!authConfigured) {
    return (
      <main className={styles.authWrapper}>
        <section className={styles.authCard}>
          <h1 className={styles.authTitle}>TrackTally</h1>
          <p className={styles.authText}>
            Authentication is not configured. Add the following environment variables to
            `.env.local` and restart the dev server:
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.2rem", textAlign: "left", color: "#0f172a" }}>
            {missingEnv.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
          <p className={styles.authText}>
            Once Google OAuth is set up, reload the page to enable sign-in.
          </p>
        </section>
      </main>
    );
  }

  if (status === "loading") {
    return (
      <main className={styles.authWrapper}>
        <section className={styles.authCard}>
          <h2 className={styles.authTitle}>Checking permissions…</h2>
          <p className={styles.authText}>Please hold while we confirm your account.</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className={styles.authWrapper}>
        <section className={styles.authCard}>
          <h1 className={styles.authTitle}>TrackTally</h1>
          <p className={styles.authText}>
            Sign in with your school Google Workspace account to log incidents.
          </p>
          <button type="button" className={styles.authButton} onClick={handleSignIn}>
            Continue with Google
          </button>
        </section>
      </main>
    );
  }

  if (status === "authenticated" && !rosterLoading && classes.length === 0) {
    return (
      <main className={styles.authWrapper}>
        <section className={styles.authCard}>
          <h1 className={styles.authTitle}>No classes yet</h1>
          <p className={styles.authText}>
            You do not have any classes assigned. Ask an administrator to add you to a roster
            in the TrackTally admin panel.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main
      className={styles.page}
      onTouchStart={handleTouchStartSwipe}
      onTouchEnd={handleTouchEndSwipe}
      onTouchCancel={handleTouchCancelSwipe}
    >
      <div className={styles.card}>
        <div className={styles.userBar}>
          <span>
            {role === "superadmin" ? "Super Admin" : role === "admin" ? "Admin" : "Teacher"} - {userEmail || "Unknown user"}
          </span>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
            <InstallPwaButton />
            {(role === "admin" || role === "superadmin") && (
              <a
                href={role === "superadmin" && selectedOrgDomain ? `/admin?impersonate=${encodeURIComponent(selectedOrgDomain)}` : "/admin"}
                className={styles.userAction}
                style={{ textDecoration: "none" }}
              >
                Admin Dashboard
              </a>
            )}
            {role === "superadmin" && (
              <a href="/super-admin" className={styles.userAction} style={{ textDecoration: "none" }}>
                Super Admin
              </a>
            )}
            <button type="button" className={styles.userAction} onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>

        <header className={styles.header}>
          <h1 className={styles.heading}>TrackTally</h1>
        </header>

        <div className={styles.orgIndicator}>
          {role === "superadmin" && availableOrgs.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Viewing School:</span>
                <select
                  value={selectedOrgDomain}
                  onChange={(e) => setSelectedOrgDomain(e.target.value)}
                  style={{ padding: "0.65rem", borderRadius: "12px", border: "1px solid #cbd5f5", fontSize: "0.95rem", fontWeight: 600, background: "white" }}
                >
                  {availableOrgs.map((org) => (
                    <option key={org.id} value={org.domain}>
                      {org.name} ({org.domain})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <>
              <div>School: <strong>{organizationName ?? "Unknown school"}</strong></div>
              {organizationDomain && <span>{organizationDomain}</span>}
            </>
          )}
        </div>

        {showIosInstallHint && (
          <div className={styles.iosPrompt}>
            <span>
              Install TrackTally on your iPhone: tap the Share icon in Safari and choose <strong>Add to Home Screen</strong>.
            </span>
            <button type="button" onClick={handleDismissIosInstallHint}>Got it</button>
          </div>
        )}

        {queueCount > 0 && (
          <div className={styles.banner}>
            {queueCount} log{queueCount === 1 ? "" : "s"} waiting for signal.
          </div>
        )}

        <div className={styles.stepIndicator}>
          <div className={styles.stepCount}>Step {currentStepIndex + 1} of {stepCount}</div>
          <div className={styles.stepTitle}>{STEP_TITLES[currentStep]}</div>
          <p className={styles.stepDescription}>{getStepDescription(currentStep, type)}</p>
        </div>

        <div key={currentStep} className={styles.stepPanel} ref={stepPanelRef}>
          {renderStepContent()}
        </div>

        <div className={styles.stepNav}>
          {currentStepIndex > 0 && (
            <button type="button" className={styles.stepButton} onClick={handleBack} disabled={isSubmitting}>
              Back
            </button>
          )}
          {currentStepIndex < stepCount - 1 && (
            <button
              type="button"
              className={`${styles.stepButton} ${styles.stepButtonPrimary}`}
              onClick={handleNext}
              disabled={!canProceed || isSubmitting}
            >
              Next
            </button>
          )}
        </div>

        {isFinalStep && (
          <button type="button" className={styles.submitButton} onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Log Incident"}
          </button>
        )}
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </main>
  );
}
