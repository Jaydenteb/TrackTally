"use client";

import { FormEvent, useState } from "react";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { ClassRecord, TeacherRecord } from "./types";
import styles from "./TeacherManager.module.css";

type Props = {
  classes: ClassRecord[];
  teachers: TeacherRecord[];
  onCreate: (payload: {
    email: string;
    displayName?: string | null;
    role: "teacher" | "admin";
    isSpecialist: boolean;
    classroomIds: string[];
  }) => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
};

export function TeacherManager({ classes, teachers, onCreate, onUpdate, onDelete }: Props) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"teacher" | "admin">("teacher");
  const [isSpecialist, setIsSpecialist] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    teacher: TeacherRecord | null;
  }>({ open: false, teacher: null });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onCreate({
      email,
      displayName: displayName || undefined,
      role,
      isSpecialist,
      classroomIds: selectedClasses,
    });
    setEmail("");
    setDisplayName("");
    setRole("teacher");
    setIsSpecialist(false);
    setSelectedClasses([]);
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Teachers & Staff</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.formField}>
          <span className={styles.label}>Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={styles.input}
          />
        </label>
        <label className={styles.formField}>
          <span className={styles.label}>Display name</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className={styles.input}
          />
        </label>
        <label className={styles.formField}>
          <span className={styles.label}>Role</span>
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value === "admin" ? "admin" : "teacher")
            }
            className={styles.select}
          >
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className={styles.formField}>
          <span className={styles.label}>Specialist classes</span>
          <select
            multiple
            value={selectedClasses}
            onChange={(event) =>
              setSelectedClasses(
                Array.from(event.target.selectedOptions).map((option) => option.value),
              )
            }
            className={styles.selectMultiple}
          >
            {classes
              .filter((cls) => !cls.archived)
              .map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
          </select>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isSpecialist}
              onChange={(event) => setIsSpecialist(event.target.checked)}
            />
            Mark as specialist
          </label>
        </label>
        <div className={styles.submitWrapper}>
          <button type="submit" className={styles.submitButton}>
            Add teacher
          </button>
        </div>
      </form>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableHeader}>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>Email</th>
              <th className={styles.th}>Role</th>
              <th className={styles.th}>Specialist classes</th>
              <th className={styles.th}>Active</th>
              <th className={styles.thRight}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => (
              <tr key={teacher.id} className={styles.tr}>
                <td className={styles.tdName}>
                  {teacher.displayName ?? "—"}
                </td>
                <td className={styles.tdEmail}>
                  {teacher.email}
                </td>
                <td className={styles.td}>
                  <select
                    value={teacher.role === "admin" ? "admin" : "teacher"}
                    onChange={(event) =>
                      onUpdate(teacher.id, { role: event.target.value as "admin" | "teacher" })
                    }
                    className={styles.cellSelect}
                  >
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className={styles.td}>
                  <div className={styles.specialistCell}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={teacher.isSpecialist}
                        onChange={(event) =>
                          onUpdate(teacher.id, { isSpecialist: event.target.checked })
                        }
                      />
                      Specialist
                    </label>
                    <select
                      multiple
                      value={teacher.specialistClasses.map((cls) => cls.id)}
                      onChange={(event) =>
                        onUpdate(teacher.id, {
                          classroomIds: Array.from(event.target.selectedOptions).map(
                            (option) => option.value,
                          ),
                        })
                      }
                      className={styles.cellSelectMultiple}
                    >
                      {classes
                        .filter((cls) => !cls.archived)
                        .map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </td>
                <td className={styles.td}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={teacher.active}
                      onChange={(event) =>
                        onUpdate(teacher.id, { active: event.target.checked })
                      }
                    />
                    Active
                  </label>
                </td>
                <td className={styles.tdRight}>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteConfirm({ open: true, teacher })}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, teacher: null })}
        onConfirm={() => {
          if (deleteConfirm.teacher) {
            onDelete(deleteConfirm.teacher.id);
          }
          setDeleteConfirm({ open: false, teacher: null });
        }}
        title={`Remove ${deleteConfirm.teacher?.displayName ?? deleteConfirm.teacher?.email ?? "teacher"}?`}
        description="They will lose access to TrackTally. This action cannot be undone."
        confirmText="Remove"
        variant="danger"
      />
    </section>
  );
}
