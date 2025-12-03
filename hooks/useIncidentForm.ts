import { useCallback, useEffect, useMemo, useState } from "react";

export type IncidentOptionGroups = {
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

export const DEFAULT_INCIDENT_OPTIONS: IncidentOptionGroups = {
  levels: [...LEVELS],
  categories: [...CATEGORIES],
  locations: [...LOCATIONS],
  actions: [...ACTIONS],
};

export const STEP_ORDER = [
  "students",
  "type",
  "level",
  "category",
  "location",
  "action",
  "note",
] as const;

export type StepKey = (typeof STEP_ORDER)[number];

export const STEP_TITLES: Record<StepKey, string> = {
  students: "Choose students",
  type: "Record type",
  level: "Pick level",
  category: "Tag category",
  location: "Set location",
  action: "Action taken",
  note: "Add context",
};

export const getStepDescription = (step: StepKey, recordType: string): string => {
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

export type IncidentFormState = {
  type: string;
  level: string;
  category: string;
  location: string;
  actionTaken: string;
  note: string;
};

export function useIncidentForm() {
  const [type, setType] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [actionTaken, setActionTaken] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [incidentOptions, setIncidentOptions] =
    useState<IncidentOptionGroups>(DEFAULT_INCIDENT_OPTIONS);

  // Load incident options from server
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
          commendationLevels:
            Array.isArray(data.commendationLevels) && data.commendationLevels.length
              ? data.commendationLevels
              : ["Notable", "Exceptional"],
          commendationCategories:
            Array.isArray(data.commendationCategories) && data.commendationCategories.length
              ? data.commendationCategories
              : ["Excellent work", "Helping others", "Leadership", "Improvement", "Positive attitude", "Kindness", "Responsibility", "Other"],
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

  const activeStepOrder = useMemo(() => {
    if (type === "commendation") {
      return ["students", "type", "category", "location", "note"] as const;
    }
    return STEP_ORDER;
  }, [type]);

  const resetForm = useCallback(() => {
    setType("");
    setLevel("");
    setCategory("");
    setLocation("");
    setActionTaken("");
    setNote("");
  }, []);

  const formState: IncidentFormState = {
    type,
    level,
    category,
    location,
    actionTaken,
    note,
  };

  return {
    // State
    type,
    level,
    category,
    location,
    actionTaken,
    note,
    incidentOptions,
    activeStepOrder,
    formState,

    // Setters
    setType,
    setLevel,
    setCategory,
    setLocation,
    setActionTaken,
    setNote,

    // Actions
    resetForm,
  };
}
