import { useEffect, useState } from "react";

export type IncidentOptionGroups = {
  levels: string[];
  categories: string[];
  locations: string[];
  actions: string[];
  commendationLevels?: string[];
  commendationCategories?: string[];
};

const groupMeta: Array<{
  key: keyof IncidentOptionGroups;
  label: string;
  help: string;
}> = [
  { key: "levels", label: "Incident Levels", help: "e.g. Minor, Moderate, Major" },
  { key: "categories", label: "Incident Categories", help: "Behaviour tags teachers pick for negative incidents." },
  { key: "locations", label: "Locations", help: "Available places where incidents occur." },
  { key: "actions", label: "Actions taken", help: "Follow-up steps staff can record." },
  { key: "commendationLevels", label: "Commendation Levels", help: "e.g. Notable, Exceptional" },
  { key: "commendationCategories", label: "Commendation Categories", help: "Positive recognition types (e.g. Helping others, Leadership, Excellent work)." },
];

function toTextareaValue(values: string[]) {
  return values.join("\n");
}

function parseTextareaValue(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

type Props = {
  options: IncidentOptionGroups | null;
  saving: boolean;
  onSave: (options: IncidentOptionGroups) => Promise<void>;
};

export function OptionManager({ options, saving, onSave }: Props) {
  const [draft, setDraft] = useState<IncidentOptionGroups>({
    levels: [],
    categories: [],
    locations: [],
    actions: [],
    commendationLevels: [],
    commendationCategories: [],
  });

  useEffect(() => {
    if (options) {
      setDraft({
        ...options,
        commendationLevels: options.commendationLevels ?? [],
        commendationCategories: options.commendationCategories ?? [],
      });
    }
  }, [options]);

  const handleChange = (key: keyof IncidentOptionGroups, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [key]: parseTextareaValue(value),
    }));
  };

  const handleSubmit = async () => {
    await onSave(draft);
  };

  return (
    <section
      style={{
        background: "white",
        borderRadius: "20px",
        padding: "1.25rem 1.5rem",
        boxShadow: "0 25px 55px -40px rgba(15,23,42,0.35)",
      }}
    >
      <header style={{ marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#0f172a" }}>
          Incident options
        </h2>
        <p style={{ margin: "0.5rem 0 0", color: "#475569" }}>
          Update the chips teachers see in the logger. Enter one option per line.
        </p>
      </header>

      <div style={{ display: "grid", gap: "1rem" }}>
        {groupMeta.map((group) => (
          <div key={group.key} style={{ display: "grid", gap: "0.4rem" }}>
            <label style={{ fontWeight: 600, color: "#0f172a" }}>
              {group.label}
            </label>
            <textarea
              value={toTextareaValue(draft[group.key] ?? [])}
              onChange={(event) => handleChange(group.key, event.target.value)}
              rows={4}
              style={{
                width: "100%",
                borderRadius: "12px",
                border: "1px solid #cbd5f5",
                padding: "0.85rem",
                fontFamily: "inherit",
                fontSize: "0.95rem",
                resize: "vertical",
              }}
            />
            <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{group.help}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !options}
          style={{
            padding: "0.75rem 1.25rem",
            borderRadius: "12px",
            border: "none",
            background: saving || !options ? "#cbd5f5" : "#0f766e",
            color: "white",
            fontWeight: 600,
            cursor: saving || !options ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save options"}
        </button>
      </div>
    </section>
  );
}
