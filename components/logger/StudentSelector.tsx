"use client";

import { ChangeEvent, useMemo, useState } from "react";
import type { Student, ClassData } from "../../hooks";
import styles from "../../app/page.module.css";

type QuickFindOption = {
  id: string;
  studentId: string;
  name: string;
  classId: string;
  classLabel: string;
  label: string;
};

type Props = {
  classes: ClassData[];
  selectedClass: string;
  currentClass: ClassData | null;
  selectedStudents: string[];
  allStudents: Array<{
    id: string;
    studentId: string;
    name: string;
    classId: string;
    classLabel: string;
  }>;
  isBulkMode: boolean;
  onSelectClass: (classId: string) => void;
  onToggleStudent: (studentId: string) => void;
  onToggleBulkMode: () => void;
  onStudentSelected: (studentId: string, classId: string) => void;
};

export function StudentSelector({
  classes,
  selectedClass,
  currentClass,
  selectedStudents,
  allStudents,
  isBulkMode,
  onSelectClass,
  onToggleStudent,
  onToggleBulkMode,
  onStudentSelected,
}: Props) {
  const [classSearch, setClassSearch] = useState("");
  const [quickFindTerm, setQuickFindTerm] = useState("");

  const quickFindOptions: QuickFindOption[] = useMemo(
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

  const handleQuickFindChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuickFindTerm(value);
    const match = quickFindOptions.find(
      (option) => option.label.toLowerCase() === value.toLowerCase(),
    );
    if (!match) return;

    onStudentSelected(match.id, match.classId);
    setClassSearch("");
  };

  const handleClassChange = (classId: string) => {
    onSelectClass(classId);
    setClassSearch("");
  };

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
            aria-label="Search all students by name"
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
          onChange={(event) => handleClassChange(event.target.value)}
          aria-label="Select class"
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
            onClick={onToggleBulkMode}
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
            <div className={styles.studentGrid} role="group" aria-label="Students list">
              {classFilteredStudents.map((student) => {
                const isActive = selectedStudents.includes(student.id);
                return (
                  <button
                    key={student.id}
                    type="button"
                    className={`${styles.chip} ${
                      isActive ? styles.chipSelected : ""
                    }`}
                    onClick={() => onToggleStudent(student.id)}
                    aria-pressed={isActive}
                    aria-label={`${isActive ? "Deselect" : "Select"} ${student.name}`}
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
}
