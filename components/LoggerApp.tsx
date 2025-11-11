"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import styles from "../app/page.module.css";
import { flushQueue, getQueueCount, queueIncident } from "../lib/idb";
import { startDictation } from "../lib/speech";

type Student = {
  id: string;
  studentId: string;
  name: string;
  firstName: string;
  lastName: string;
};

type ClassData = {
  id: string;
  name: string;
  code: string;
  students: Student[];
};

type IncidentPayload = {
  type?: string;
  studentId: string;
  studentName: string;
  level: string;
  category: string;
  location: string;
  actionTaken?: string;
  note?: string;
  classCode?: string;
  device?: string;
  uuid: string;
  timestamp?: string;
};

type IncidentOptionGroups = {
  levels: string[];
  categories: string[];
  locations: string[];
  actions: string[];
  commendationLevels?: string[];
  commendationCategories?: string[];
};

const LEVELS = ["Minor", "Major"] as const;
const CATEGORIES = [
  "Disruption",
  "Non-compliance",
  "Unsafe play",
  "Physical contact",
  "Defiance",
  "Tech misuse",
  "Bullying",
  "Other",
];
const LOCATIONS = ["Classroom", "Yard", "Specialist", "Transition", "Online"];
const ACTIONS = [
  "Redirect",
  "Time out",
  "Restorative chat",
  "Parent contact",
  "Office referral",
];

const DEFAULT_INCIDENT_OPTIONS: IncidentOptionGroups = {
  levels: [...LEVELS],
  categories: [...CATEGORIES],
  locations: [...LOCATIONS],
  actions: [...ACTIONS],
};

const STEP_ORDER = [
  "students",
  "type",
  "level",
  "category",
  "location",
  "action",
  "note",
] as const;

type StepKey = (typeof STEP_ORDER)[number];

const STEP_TITLES: Record<StepKey, string> = {
  students: "Choose students",
  type: "Record type",
  level: "Pick level",
  category: "Tag category",
  location: "Set location",
  action: "Action taken",
  note: "Add context",
};

const getStepDescription = (step: StepKey, recordType: string): string => {
  switch (step) {
    case "students":
      return "Select who is involved. Bulk select lets you tag multiple learners.";
    case "type":
      return "Is this an incident or a commendation?";
    case "level":
      return recordType === "commendation"
        ? "How notable is this positive behavior?"
        : "Is this a minor or major behaviour incident?";
    case "category":
      return recordType === "commendation"
        ? "What type of positive behavior is this?"
        : "Label the behaviour so trends stay clear.";
    case "location":
      return "Where did this happen?";
    case "action":
      return "Document the response taken.";
    case "note":
      return "Optional context for the team (voice dictation supported).";
    default:
      return "";
  }
};

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
  const sessionResult = useSession();
  const { data: session, status } = sessionResult;
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [type, setType] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [actionTaken, setActionTaken] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [toast, setToast] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [classSearch, setClassSearch] = useState("");
  const [quickFindTerm, setQuickFindTerm] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [incidentOptions, setIncidentOptions] =
    useState<IncidentOptionGroups>(DEFAULT_INCIDENT_OPTIONS);
  const dictationRef = useRef<{ stop: () => void } | null>(null);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);
  const stepPanelRef = useRef<HTMLDivElement | null>(null);
  const swipeOrigin = useRef<{ x: number; y: number } | null>(null);
  const role = session?.user?.role ?? "teacher";
  const userEmail = session?.user?.email ?? "";
  const providerId = "google";

  const loadRoster = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const response = await fetch("/api/roster", { cache: "no-store" });
      if (!response.ok) {
        console.error("Failed to load roster", await response.text());
        setToast("Could not load roster.");
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
      setToast("Could not load roster.");
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      void loadRoster();
    }
  }, [status, loadRoster]);

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

  const handleSignIn = () => {
    void signIn(providerId, { callbackUrl: "/" });
  };

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      try {
        const response = await fetch("/api/options", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        const data = payload?.data as IncidentOptionGroups | undefined;
        if (!data) return;
        const normalized: IncidentOptionGroups = {
          levels:
            Array.isArray(data.levels) && data.levels.length
              ? data.levels
              : DEFAULT_INCIDENT_OPTIONS.levels,
          categories:
            Array.isArray(data.categories) && data.categories.length
              ? data.categories
              : DEFAULT_INCIDENT_OPTIONS.categories,
          locations:
            Array.isArray(data.locations) && data.locations.length
              ? data.locations
              : DEFAULT_INCIDENT_OPTIONS.locations,
          actions:
            Array.isArray(data.actions) && data.actions.length
              ? data.actions
              : DEFAULT_INCIDENT_OPTIONS.actions,
        };
        if (!cancelled) {
          setIncidentOptions(normalized);
          setLevel((value) => (normalized.levels.includes(value) ? value : ""));
          setCategory((value) =>
            normalized.categories.includes(value) ? value : "",
          );
          setLocation((value) =>
            normalized.locations.includes(value) ? value : "",
          );
          setActionTaken((value) =>
            normalized.actions.includes(value) ? value : "",
          );
        }
      } catch {
        // ignore failures, defaults stay in place
      }
    }
    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = () => {
    void signOut({ callbackUrl: "/login" });
  };

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

  const currentClass = useMemo(
    () => classes.find((item) => item.id === selectedClass) ?? null,
    [classes, selectedClass],
  );

  const quickFindOptions = useMemo(
    () =>
      allStudents.map((student) => ({
        ...student,
        label: `${student.name} (${student.classLabel})`,
      })),
    [allStudents],
  );

  const classFilteredStudents = useMemo(() => {
    if (!currentClass) return [];
    const term = classSearch.trim().toLowerCase();
    if (!term) return currentClass.students;
    return currentClass.students.filter((student) =>
      student.name.toLowerCase().includes(term),
    );
  }, [classSearch, currentClass]);

  const maxUnlockedStep = useMemo(() => {
    let unlocked = 0;
    if (selectedStudents.length) unlocked = 1;
    if (unlocked >= 1 && type) unlocked = 2;
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

  const currentStep = STEP_ORDER[currentStepIndex];
  const isFinalStep = currentStepIndex === STEP_ORDER.length - 1;
  const canProceed = currentStepIndex < maxUnlockedStep;
  const stepCount = STEP_ORDER.length;

  useEffect(() => {
    if (!classes.length) return;
    const storedClass = localStorage.getItem("tracktally:lastClass");
    if (storedClass && classes.some((c) => c.id === storedClass)) {
      setSelectedClass((prev) => prev || storedClass);
    } else {
      setSelectedClass((prev) => prev || classes[0].id);
    }
  }, [classes]);

  useEffect(() => {
    if (selectedClass) {
      localStorage.setItem("tracktally:lastClass", selectedClass);
    }
  }, [selectedClass]);

  useEffect(() => {
    setClassSearch("");
  }, [selectedClass]);

  useEffect(() => {
    if (!isBulkMode && selectedStudents.length > 1) {
      setSelectedStudents((prev) => prev.slice(0, 1));
    }
  }, [isBulkMode, selectedStudents]);

  const sendIncident = useCallback(async (payload: IncidentPayload) => {
    let response: Response;
    try {
      response = await fetch("/api/log-incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Network error while sending incident.",
      );
    }

    if (!response.ok) {
      let message = "Failed to send incident";
      try {
        const data = await response.json();
        if (data?.error) message = data.error;
      } catch {
        // ignore JSON parse failures
      }
      throw new Error(message);
    }
  }, []);

  const refreshQueueCount = useCallback(async () => {
    const count = await getQueueCount();
    setQueueCount(count);
  }, []);

  const processQueue = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.onLine) return;
    const { flushed } = await flushQueue(sendIncident);
    if (flushed > 0) {
      setToast(`Sent ${flushed} queued log${flushed > 1 ? "s" : ""}.`);
      await refreshQueueCount();
    }
  }, [refreshQueueCount, sendIncident]);

  useEffect(() => {
    refreshQueueCount();
    processQueue();

    const handleOnline = () => {
      processQueue();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        processQueue();
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [processQueue, refreshQueueCount]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);


  const handleStudentToggle = (studentId: string) => {
    if (!currentClass) return;
    setSelectedStudents((prev) => {
      if (isBulkMode) {
        return prev.includes(studentId)
          ? prev.filter((id) => id !== studentId)
          : [...prev, studentId];
      }
      return prev[0] === studentId ? [] : [studentId];
    });
  };

  const handleTypeSelect = (option: string) => {
    setType(option);
    setCurrentStepIndex((prev) => {
      const target = STEP_ORDER.indexOf("level");
      return prev < target ? target : prev;
    });
  };

  const handleLevelSelect = (option: string) => {
    setLevel(option);
    setCurrentStepIndex((prev) => {
      const target = STEP_ORDER.indexOf("category");
      return prev < target ? target : prev;
    });
  };

  const handleCategorySelect = (option: string) => {
    setCategory(option);
    setCurrentStepIndex((prev) => {
      const target = STEP_ORDER.indexOf("location");
      return prev < target ? target : prev;
    });
  };

  const handleLocationSelect = (option: string) => {
    setLocation(option);
    setCurrentStepIndex((prev) => {
      const target = STEP_ORDER.indexOf("action");
      return prev < target ? target : prev;
    });
  };

  const handleActionSelect = (option: string) => {
    setActionTaken(option);
    setCurrentStepIndex((prev) => {
      const target = STEP_ORDER.indexOf("note");
      return prev < target ? target : prev;
    });
  };

  const handleNext = useCallback(() => {
    setCurrentStepIndex((prev) => Math.min(prev + 1, maxUnlockedStep));
  }, [maxUnlockedStep]);

  const handleBack = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleDictation = useCallback(() => {
    if (isRecording) {
      dictationRef.current?.stop();
      dictationRef.current = null;
      setIsRecording(false);
      return;
    }

    const hasNativeDictation =
      typeof window !== "undefined" && !!window.TrackTallyNative?.startDictation;
    const isiOS =
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!hasNativeDictation && isiOS) {
      const textarea = noteRef.current;
      if (textarea) {
        textarea.focus();
        try {
          const length = textarea.value.length;
          textarea.setSelectionRange(length, length);
        } catch {
          // ignore selection errors
        }
      }
      setToast("Tap the keyboard mic to dictate.");
      return;
    }

    const controller = startDictation({
      onResult: (text) => {
        const cleaned = text.trim();
        if (cleaned) {
          setNote((prev) =>
            prev ? `${prev.trim()} ${cleaned}`.trim() : cleaned,
          );
          setToast("Dictation added");
        }
        dictationRef.current = null;
        setIsRecording(false);
      },
      onError: (error) => {
        setToast(error);
        dictationRef.current = null;
        setIsRecording(false);
      },
    });

    if (controller) {
      dictationRef.current = controller;
      setIsRecording(true);
    }
  }, [isRecording]);

  const handleTouchStartSwipe = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      swipeOrigin.current = {
        x: touch.clientX,
        y: touch.clientY,
      };
    },
    [],
  );

  const handleTouchEndSwipe = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      if (!swipeOrigin.current || event.changedTouches.length !== 1) {
        swipeOrigin.current = null;
        return;
      }
      const { x, y } = swipeOrigin.current;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - x;
      const dy = touch.clientY - y;
      swipeOrigin.current = null;

      if (Math.abs(dx) < 60 || Math.abs(dy) > 40) {
        return;
      }

      if (dx < 0 && currentStepIndex < maxUnlockedStep) {
        handleNext();
      } else if (dx > 0 && currentStepIndex > 0) {
        handleBack();
      }
    },
    [currentStepIndex, handleBack, handleNext, maxUnlockedStep],
  );

  const handleTouchCancelSwipe = useCallback(() => {
    swipeOrigin.current = null;
  }, []);

  const handleQuickFindChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuickFindTerm(value);
    const match = quickFindOptions.find(
      (option) => option.label.toLowerCase() === value.toLowerCase(),
    );
    if (!match) return;

    if (match.classId !== selectedClass) {
      setSelectedClass(match.classId);
    }

    setSelectedStudents([match.id]);
    setClassSearch("");
  };

  const handleSubmit = useCallback(async () => {
    if (!selectedStudents.length) {
      setToast("Pick at least one student.");
      setCurrentStepIndex(STEP_ORDER.indexOf("students"));
      return;
    }
    if (!type) {
      setToast("Choose incident or commendation.");
      setCurrentStepIndex(STEP_ORDER.indexOf("type"));
      return;
    }
    if (!level) {
      setToast("Select a level.");
      setCurrentStepIndex(STEP_ORDER.indexOf("level"));
      return;
    }
    if (!category) {
      setToast("Choose a category.");
      setCurrentStepIndex(STEP_ORDER.indexOf("category"));
      return;
    }
    if (!location) {
      setToast("Choose a location.");
      setCurrentStepIndex(STEP_ORDER.indexOf("location"));
      return;
    }
    if (!actionTaken) {
      setToast("Select an action.");
      setCurrentStepIndex(STEP_ORDER.indexOf("action"));
      return;
    }
    setIsSubmitting(true);

    const deviceInfo =
      typeof navigator !== "undefined" ? navigator.userAgent : undefined;

    if (!currentClass) {
      setToast("Select a class to log incidents.");
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
          level,
          category,
          location,
          actionTaken,
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
        lastError =
          error instanceof Error ? error.message : "Failed to send incident";
        await queueIncident(incident);
        queued += 1;
      }
    }

    await refreshQueueCount();
    setIsSubmitting(false);
    setNote("");

    if (sent && !queued) {
      setToast("Logged");
    } else if (sent && queued) {
      const queuedMsg = `Queued ${queued} log${queued === 1 ? "" : "s"} offline.`;
      setToast(lastError ? `${lastError} ${queuedMsg}` : `Logged ${sent}, ${queuedMsg}`);
    } else if (queued) {
      const queuedMsg = `Queued ${queued} log${queued === 1 ? "" : "s"} offline.`;
      setToast(lastError ? `${lastError} ${queuedMsg}` : queuedMsg);
    }

    processQueue();

    setCurrentStepIndex(0);
    setSelectedStudents([]);
    setIsBulkMode(false);
    setType("");
    setLevel("");
    setCategory("");
    setLocation("");
    setActionTaken("");
    setQuickFindTerm("");
    setClassSearch("");
  }, [
    actionTaken,
    category,
    currentClass,
    level,
    location,
    note,
    processQueue,
    refreshQueueCount,
    type,
    selectedStudents,
    sendIncident,
  ]);

  useEffect(() => {
    if (!stepPanelRef.current) return;
    const focusable = stepPanelRef.current.querySelector<HTMLElement>(
      "button, input, textarea, select",
    );
    focusable?.focus();
  }, [currentStep]);

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

  const renderStepContent = (): JSX.Element => {
    switch (currentStep) {
      case "students":
        return (
          <>
            <section>
              <p className={styles.sectionTitle}>Quick find</p>
              <div className={styles.searchGroup}>
                <input
                  type="text"
                  className={styles.searchField}
                  list="tracktally-quick-find"
                  placeholder="Type a name to jump to a student"
                  value={quickFindTerm}
                  onChange={handleQuickFindChange}
                  autoComplete="off"
                />
                <datalist id="tracktally-quick-find">
                  {quickFindOptions.map((option) => (
                    <option key={`${option.classId}-${option.id}`} value={option.label} />
                  ))}
                </datalist>
              </div>
            </section>

            <section>
              <p className={styles.sectionTitle}>Class roster</p>
              <select
                className={styles.select}
                value={selectedClass}
                onChange={(event) => {
                  setSelectedClass(event.target.value);
                  setSelectedStudents([]);
                  setCurrentStepIndex(0);
                }}
              >
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </section>

            <section>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.4rem",
                }}
              >
                <p className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                  Students
                </p>
                {selectedStudents.length > 0 && (
                  <span className={styles.selectionCount}>
                    {selectedStudents.length} selected
                  </span>
                )}
              </div>
              <div className={styles.toggle}>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${
                    isBulkMode ? styles.toggleActive : ""
                  }`}
                  onClick={() => setIsBulkMode((prev) => !prev)}
                  aria-pressed={isBulkMode}
                  aria-label="Toggle bulk select"
                />
                Bulk select
              </div>
              <input
                type="text"
                className={styles.searchField}
                placeholder="Filter this class"
                value={classSearch}
                onChange={(event) => setClassSearch(event.target.value)}
                aria-label="Filter students in this class"
              />
              <div className={styles.studentScroll}>
                {classFilteredStudents.length === 0 ? (
                  <p className={styles.emptyState}>No students match that search.</p>
                ) : (
                  <div className={styles.studentGrid}>
                    {classFilteredStudents.map((student) => {
                      const isActive = selectedStudents.includes(student.id);
                      return (
                        <button
                          key={student.id}
                          type="button"
                          className={`${styles.chip} ${
                            isActive ? styles.chipSelected : ""
                          }`}
                          onClick={() => handleStudentToggle(student.id)}
                        >
                          {student.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </>
        );
      case "type":
        return (
          <section>
            <p className={styles.sectionTitle}>Record type</p>
            <div className={styles.chipGroup}>
              <button
                type="button"
                className={`${styles.chip} ${
                  type === "incident" ? styles.chipSelected : ""
                }`}
                onClick={() => handleTypeSelect("incident")}
              >
                Incident
              </button>
              <button
                type="button"
                className={`${styles.chip} ${
                  type === "commendation" ? styles.chipSelected : ""
                }`}
                onClick={() => handleTypeSelect("commendation")}
              >
                Commendation
              </button>
            </div>
          </section>
        );
      case "level":
        return (
          <section>
            <p className={styles.sectionTitle}>
              {type === "commendation" ? "Impact" : "Level"}
            </p>
            <div className={styles.chipGroup}>
              {(type === "commendation"
                ? incidentOptions.commendationLevels || []
                : incidentOptions.levels
              ).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.chip} ${
                    level === option ? styles.chipSelected : ""
                  }`}
                  onClick={() => handleLevelSelect(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>
        );
      case "category":
        return (
          <section>
            <p className={styles.sectionTitle}>
              {type === "commendation" ? "Recognition type" : "Category"}
            </p>
            <div className={styles.chipGroup}>
              {(type === "commendation"
                ? incidentOptions.commendationCategories || []
                : incidentOptions.categories
              ).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.chip} ${
                    category === option ? styles.chipSelected : ""
                  }`}
                  onClick={() => handleCategorySelect(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>
        );
      case "location":
        return (
          <section>
            <p className={styles.sectionTitle}>Location</p>
            <div className={styles.chipGroup}>
              {incidentOptions.locations.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.chip} ${
                    location === option ? styles.chipSelected : ""
                  }`}
                  onClick={() => handleLocationSelect(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>
        );
      case "action":
        return (
          <section>
            <p className={styles.sectionTitle}>Action taken</p>
            <div className={styles.chipGroup}>
              {incidentOptions.actions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.chip} ${
                    actionTaken === option ? styles.chipSelected : ""
                  }`}
                  onClick={() => handleActionSelect(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>
        );
      case "note":
        return (
          <section>
            <p className={styles.sectionTitle}>Note</p>
            <div className={styles.noteRow}>
              <textarea
                ref={noteRef}
                className={styles.textarea}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional details"
                autoCapitalize="sentences"
                autoCorrect="on"
              />
              <button
                type="button"
                className={styles.micButton}
                onClick={handleDictation}
                aria-pressed={isRecording}
              >
                {isRecording ? "Stop" : "Mic"}
              </button>
            </div>
          </section>
        );
      default:
        return <></>;
    }
  };

  if (!authConfigured) {
    return (
      <main className={styles.authWrapper}>
        <section className={styles.authCard}>
          <h1 className={styles.authTitle}>TrackTally</h1>
          <p className={styles.authText}>
            Authentication is not configured. Add the following environment variables to
            `.env.local` and restart the dev server:
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.2rem",
              textAlign: "left",
              color: "#0f172a",
            }}
          >
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

  if (status === "authenticated" && classes.length === 0) {
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
            {role === "superadmin"
              ? "Super Admin"
              : role === "admin"
                ? "Admin"
                : "Teacher"}{" "}
            - {userEmail || "Unknown user"}
          </span>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            {(role === "admin" || role === "superadmin") && (
              <a href="/admin" className={styles.userAction} style={{ textDecoration: "none" }}>
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

        {queueCount > 0 && (
          <div className={styles.banner}>
            {queueCount} log{queueCount === 1 ? "" : "s"} waiting for signal.
          </div>
        )}

        <div className={styles.stepIndicator}>
          <div className={styles.stepCount}>
            Step {currentStepIndex + 1} of {stepCount}
          </div>
          <div className={styles.stepTitle}>{STEP_TITLES[currentStep]}</div>
          <p className={styles.stepDescription}>{getStepDescription(currentStep, type)}</p>
        </div>

        <div
          key={currentStep}
          className={styles.stepPanel}
          ref={stepPanelRef}
        >
          {renderStepContent()}
        </div>

        <div className={styles.stepNav}>
          {currentStepIndex > 0 && (
            <button
              type="button"
              className={styles.stepButton}
              onClick={handleBack}
              disabled={isSubmitting}
            >
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
          <button
            type="button"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Log Incident"}
          </button>
        )}
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </main>
  );
}
