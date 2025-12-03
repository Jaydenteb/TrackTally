import { useEffect, useState } from "react";
import styles from "./OptionManager.module.css";

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
    <section className={styles.section}>
      <header className={styles.header}>
        <h2 className={styles.title}>
          Incident options
        </h2>
        <p className={styles.description}>
          Update the chips teachers see in the logger. Enter one option per line.
        </p>
      </header>

      <div className={styles.optionsGrid}>
        {groupMeta.map((group) => (
          <div key={group.key} className={styles.optionGroup}>
            <label className={styles.label}>
              {group.label}
            </label>
            <textarea
              value={toTextareaValue(draft[group.key] ?? [])}
              onChange={(event) => handleChange(group.key, event.target.value)}
              rows={4}
              className={styles.textarea}
            />
            <span className={styles.help}>{group.help}</span>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !options}
          className={styles.saveButton}
        >
          {saving ? "Saving..." : "Save options"}
        </button>
      </div>
    </section>
  );
}
