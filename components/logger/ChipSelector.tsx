"use client";

import styles from "../../app/page.module.css";

type Props = {
  title: string;
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
};

export function ChipSelector({ title, options, selected, onSelect }: Props) {
  return (
    <section aria-labelledby={`chip-selector-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <p
        id={`chip-selector-${title.toLowerCase().replace(/\s+/g, "-")}`}
        className={styles.sectionTitle}
      >
        {title}
      </p>
      <div className={styles.chipGroup} role="radiogroup" aria-label={title}>
        {options.map((option) => {
          const isSelected = selected === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`${styles.chip} ${isSelected ? styles.chipSelected : ""}`}
              onClick={() => onSelect(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </section>
  );
}
