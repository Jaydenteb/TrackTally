"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "../ui/Modal";
import { ClassRecord, TeacherRecord } from "./types";
import styles from "./ClassManager.module.css";

type Props = {
  classes: ClassRecord[];
  teachers: TeacherRecord[];
  onCreate: (payload: { name: string; code: string; homeroomTeacherId?: string | null }) => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => void;
  onUpdateSpecialists: (id: string, teacherIds: string[]) => void;
  onUploadRoster: (
    id: string,
    file: File,
    mapping: { studentId: string; firstName: string; lastName: string; guardians?: string },
  ) => void;
  onDelete: (id: string) => void;
};

const headerNormalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const HEADER_SUGGESTIONS: Record<string, "studentId" | "firstName" | "lastName" | "guardians"> = {
  studentid: "studentId",
  student_id: "studentId",
  student: "studentId",
  id: "studentId",
  firstname: "firstName",
  first_name: "firstName",
  givenname: "firstName",
  preferred: "firstName",
  preferredname: "firstName",
  preferredfirstname: "firstName",
  preferredfirst: "firstName",
  lastname: "lastName",
  last_name: "lastName",
  surname: "lastName",
  guardians: "guardians",
  guardianemails: "guardians",
  guardiansemail: "guardians",
  parentemails: "guardians",
  parentemail: "guardians",
};

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values.map((cell) => cell.replace(/^"|"$/g, "").trim());
}

type ImportConfig = {
  classId: string;
  file: File;
  headers: string[];
  mapping: { studentId: string; firstName: string; lastName: string; guardians?: string };
};

export function ClassManager({
  classes,
  teachers,
  onCreate,
  onUpdate,
  onUpdateSpecialists,
  onUploadRoster,
  onDelete,
}: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [homeroomTeacherId, setHomeroomTeacherId] = useState<string | null>(null);
  const [importConfig, setImportConfig] = useState<ImportConfig | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    classItem: ClassRecord | null;
  }>({ open: false, classItem: null });

  const specialistTeachers = useMemo(
    () => teachers.filter((teacher) => teacher.active),
    [teachers],
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onCreate({
      name,
      code,
      homeroomTeacherId,
    });
    setName("");
    setCode("");
    setHomeroomTeacherId(null);
  }

  function buildDefaultMapping(headers: string[]) {
    const map: ImportConfig["mapping"] = {
      studentId: "",
      firstName: "",
      lastName: "",
      guardians: "",
    };

    headers.forEach((header) => {
      const key = HEADER_SUGGESTIONS[headerNormalise(header)];
      if (key && !(map as any)[key]) {
        (map as any)[key] = header;
      }
    });

    if (!map.studentId && headers[0]) map.studentId = headers[0];
    if (!map.firstName && headers[1]) map.firstName = headers[1];
    if (!map.lastName && headers[2]) map.lastName = headers[2];

    return map;
  }

  function handleRosterFile(classId: string, file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = typeof reader.result === "string" ? reader.result : "";
        const firstLine = content
          .replace(/^\uFEFF/, "")
          .split(/\r?\n/)
          .find((line) => line.trim());
        if (!firstLine) {
          setCsvError("CSV is empty. Please select a file with student data.");
          return;
        }
        const headers = splitCsvLine(firstLine).filter(Boolean);
        if (!headers.length) {
          setCsvError("Could not read CSV headers. Please ensure the file has a header row.");
          return;
        }
        const mapping = buildDefaultMapping(headers);
        setImportConfig({ classId, file, headers, mapping });
      } catch (error) {
        console.error("Failed to read CSV", error);
        setCsvError("Could not read CSV file. Please check the file format.");
      }
    };
    reader.onerror = () => {
      console.error("Failed to read CSV", reader.error);
      setCsvError("Could not read CSV file. Please try again.");
    };
    reader.readAsText(file);
  }

  function updateMapping(key: keyof ImportConfig["mapping"], value: string) {
    setImportConfig((prev) =>
      prev ? { ...prev, mapping: { ...prev.mapping, [key]: value } } : prev,
    );
  }

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2 className={styles.title}>Classes</h2>
        <span className={styles.activeCount}>
          Active: {classes.filter((cls) => !cls.archived).length}
        </span>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.formField}>
          <span className={styles.label}>Class name</span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={styles.input}
          />
        </label>
        <label className={styles.formField}>
          <span className={styles.label}>Code</span>
          <input
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className={styles.input}
          />
        </label>
        <label className={styles.formField}>
          <span className={styles.label}>Homeroom teacher</span>
          <select
            value={homeroomTeacherId ?? ""}
            onChange={(event) => setHomeroomTeacherId(event.target.value || null)}
            className={styles.select}
          >
            <option value="">Unassigned</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.displayName ?? teacher.email}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.submitWrapper}>
          <button type="submit" className={styles.submitButton}>
            Create class
          </button>
        </div>
      </form>

      <div className={styles.classList}>
        {classes.map((cls) => (
          <div
            key={cls.id}
            className={cls.archived ? styles.classCardArchived : styles.classCard}
          >
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.className}>
                  {cls.name} <span className={styles.classCode}>({cls.code})</span>
                </h3>
                <p className={styles.studentCount}>
                  {cls.studentCount} active students
                </p>
              </div>
              <div className={styles.cardActions}>
                <button
                  type="button"
                  onClick={() => onUpdate(cls.id, { archived: !cls.archived })}
                  className={styles.archiveButton}
                >
                  {cls.archived ? "Unarchive" : "Archive"}
                </button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteConfirm({ open: true, classItem: cls })}
                >
                  Delete class
                </Button>
                <label className={styles.importLabel}>
                  Import CSV
                  <input
                    type="file"
                    accept=".csv"
                    className={styles.hiddenInput}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        handleRosterFile(cls.id, file);
                      }
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            <div className={styles.cardForm}>
              <label className={styles.formField}>
                <span className={styles.label}>Homeroom teacher</span>
                <select
                  value={cls.homeroomTeacher?.id ?? ""}
                  onChange={(event) =>
                    onUpdate(cls.id, { homeroomTeacherId: event.target.value || null })
                  }
                  className={styles.cardSelect}
                >
                  <option value="">Unassigned</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.displayName ?? teacher.email}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.formField}>
                <span className={styles.label}>Specialist staff</span>
                <select
                  multiple
                  value={cls.specialistTeachers.map((teacher) => teacher.id)}
                  onChange={(event) =>
                    onUpdateSpecialists(
                      cls.id,
                      Array.from(event.target.selectedOptions).map((option) => option.value),
                    )
                  }
                  className={styles.cardSelectMultiple}
                >
                  {specialistTeachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.displayName ?? teacher.email}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>

      {importConfig && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <header>
              <h3 className={styles.modalTitle}>
                Map CSV columns
              </h3>
              <p className={styles.modalDescription}>
                Choose which columns correspond to TrackTally fields.
              </p>
            </header>

            {(["studentId", "firstName", "lastName", "guardians"] as const).map((field) => (
              <label key={field} className={styles.formField}>
                <span className={styles.label}>
                  {field === "studentId"
                    ? "Student ID"
                    : field === "firstName"
                    ? "First name"
                    : field === "lastName"
                    ? "Last name"
                    : "Guardian contacts (optional)"}
                </span>
                <select
                  value={importConfig.mapping[field] ?? ""}
                  onChange={(event) => updateMapping(field, event.target.value)}
                  className={styles.modalSelect}
                >
                  <option value="">
                    {field === "guardians" ? "Skip guardians column" : "Select column"}
                  </option>
                  {importConfig.headers.map((header) => (
                    <option key={`${field}-${header}`} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setImportConfig(null)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const mapping = importConfig.mapping;
                  if (!mapping.studentId || !mapping.firstName || !mapping.lastName) {
                    setMappingError("Please map student ID, first name, and last name before importing.");
                    return;
                  }
                  setMappingError(null);
                  const sanitized: {
                    studentId: string;
                    firstName: string;
                    lastName: string;
                    guardians?: string;
                  } = {
                    studentId: mapping.studentId,
                    firstName: mapping.firstName,
                    lastName: mapping.lastName,
                  };
                  if (mapping.guardians) sanitized.guardians = mapping.guardians;
                  onUploadRoster(importConfig.classId, importConfig.file, sanitized);
                  setImportConfig(null);
                }}
                className={styles.importButton}
              >
                Import roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Error Modal */}
      <Modal isOpen={!!csvError} onClose={() => setCsvError(null)} size="sm">
        <ModalHeader onClose={() => setCsvError(null)}>
          <ModalTitle>CSV Import Error</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className={styles.errorText}>{csvError}</p>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setCsvError(null)}>OK</Button>
        </ModalFooter>
      </Modal>

      {/* Mapping Error Modal */}
      <Modal isOpen={!!mappingError} onClose={() => setMappingError(null)} size="sm">
        <ModalHeader onClose={() => setMappingError(null)}>
          <ModalTitle>Missing Fields</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className={styles.errorText}>{mappingError}</p>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setMappingError(null)}>OK</Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, classItem: null })}
        onConfirm={() => {
          if (deleteConfirm.classItem) {
            onDelete(deleteConfirm.classItem.id);
          }
          setDeleteConfirm({ open: false, classItem: null });
        }}
        title={`Delete ${deleteConfirm.classItem?.name ?? "class"}?`}
        description="This will remove staff access to this class. Students will remain in the system but will be unassigned."
        confirmText="Delete"
        variant="danger"
      />
    </section>
  );
}
