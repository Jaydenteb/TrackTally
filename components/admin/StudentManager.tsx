"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { ClassRecord, StudentRecord } from "./types";
import styles from "./StudentManager.module.css";

type Props = {
  classes: ClassRecord[];
  selectedClassId: string | null;
  students: StudentRecord[];
  onSelectClass: (id: string | null) => void;
  onCreateStudent: (payload: {
    studentId: string;
    firstName: string;
    lastName: string;
    classroomId?: string | null;
    guardians?: string | null;
  }) => void;
  onUpdateStudent: (id: string, patch: Record<string, unknown>) => void;
  onDeleteStudent: (id: string) => void;
};

export function StudentManager({
  classes,
  selectedClassId,
  students,
  onSelectClass,
  onCreateStudent,
  onUpdateStudent,
  onDeleteStudent,
}: Props) {
  const [localStudents, setLocalStudents] = useState<StudentRecord[]>(students);
  const [newStudent, setNewStudent] = useState({
    studentId: "",
    firstName: "",
    lastName: "",
    classroomId: selectedClassId || "",
    guardians: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    student: StudentRecord | null;
  }>({ open: false, student: null });

  useEffect(() => {
    setLocalStudents(students);
  }, [students]);

  useEffect(() => {
    if (selectedClassId) {
      setNewStudent((prev) => ({ ...prev, classroomId: selectedClassId }));
    }
  }, [selectedClassId]);

  function updateLocalStudent(id: string, patch: Partial<StudentRecord>) {
    setLocalStudents((current) =>
      current.map((student) => (student.id === id ? { ...student, ...patch } : student)),
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onCreateStudent({
      studentId: newStudent.studentId,
      firstName: newStudent.firstName,
      lastName: newStudent.lastName,
      classroomId: newStudent.classroomId || null,
      guardians: newStudent.guardians || null,
    });
    setNewStudent({
      studentId: "",
      firstName: "",
      lastName: "",
      classroomId: selectedClassId || "",
      guardians: "",
    });
  }

  const activeClasses = classes.filter((cls) => !cls.archived);

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Students</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.formField}>
          <span className={styles.label}>Student ID</span>
          <input
            required
            type="text"
            value={newStudent.studentId}
            onChange={(event) =>
              setNewStudent((prev) => ({ ...prev, studentId: event.target.value }))
            }
            placeholder="e.g. 12345"
            className={styles.input}
          />
        </label>
        <label className={styles.formField}>
          <span className={styles.label}>First name</span>
          <input
            required
            type="text"
            value={newStudent.firstName}
            onChange={(event) =>
              setNewStudent((prev) => ({ ...prev, firstName: event.target.value }))
            }
            placeholder="First name"
            className={styles.input}
          />
        </label>
        <label className={styles.formField}>
          <span className={styles.label}>Last name</span>
          <input
            required
            type="text"
            value={newStudent.lastName}
            onChange={(event) =>
              setNewStudent((prev) => ({ ...prev, lastName: event.target.value }))
            }
            placeholder="Last name"
            className={styles.input}
          />
        </label>
        <label className={styles.formField}>
          <span className={styles.label}>Assign to class</span>
          <select
            value={newStudent.classroomId}
            onChange={(event) =>
              setNewStudent((prev) => ({ ...prev, classroomId: event.target.value }))
            }
            className={styles.select}
          >
            <option value="">Unassigned</option>
            {activeClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.formField}>
          <span className={styles.label}>Guardian emails (optional)</span>
          <input
            type="text"
            value={newStudent.guardians}
            onChange={(event) =>
              setNewStudent((prev) => ({ ...prev, guardians: event.target.value }))
            }
            placeholder="parent@email.com"
            className={styles.input}
          />
        </label>
        <div className={styles.submitWrapper}>
          <Button type="submit">Add student</Button>
        </div>
      </form>

      <div className={styles.filterBar}>
        <select
          value={selectedClassId ?? ""}
          onChange={(event) => onSelectClass(event.target.value || null)}
          className={styles.filterSelect}
        >
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} {cls.archived ? "(archived)" : ""}
            </option>
          ))}
        </select>
        {selectedClassId && (
          <span className={styles.studentCount}>
            {localStudents.length} students in{" "}
            {classes.find((cls) => cls.id === selectedClassId)?.name ?? ""}
          </span>
        )}
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableHeader}>
              <th className={styles.th}>Student</th>
              <th className={styles.th}>Student ID</th>
              <th className={styles.th}>Guardians</th>
              <th className={styles.th}>Notes</th>
              <th className={styles.th}>Class</th>
              <th className={styles.th}>Active</th>
              <th className={styles.thRight}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {localStudents.map((student) => (
              <tr key={student.id} className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.nameFields}>
                    <input
                      value={student.firstName}
                      onChange={(event) => {
                        updateLocalStudent(student.id, { firstName: event.target.value });
                        onUpdateStudent(student.id, { firstName: event.target.value });
                      }}
                      className={styles.cellInput}
                    />
                    <input
                      value={student.lastName}
                      onChange={(event) => {
                        updateLocalStudent(student.id, { lastName: event.target.value });
                        onUpdateStudent(student.id, { lastName: event.target.value });
                      }}
                      className={styles.cellInput}
                    />
                  </div>
                </td>
                <td className={styles.td}>
                  <input
                    value={student.studentId}
                    onChange={(event) => {
                      updateLocalStudent(student.id, { studentId: event.target.value });
                      onUpdateStudent(student.id, { studentId: event.target.value });
                    }}
                    className={styles.cellInput}
                  />
                </td>
                <td className={styles.td}>
                  <textarea
                    rows={2}
                    value={student.guardians ?? ""}
                    placeholder="guardian emails"
                    onChange={(event) => {
                      updateLocalStudent(student.id, { guardians: event.target.value });
                      onUpdateStudent(student.id, { guardians: event.target.value || null });
                    }}
                    className={styles.cellTextarea}
                  />
                </td>
                <td className={styles.td}>
                  <textarea
                    rows={2}
                    value={student.notes ?? ""}
                    onChange={(event) => {
                      updateLocalStudent(student.id, { notes: event.target.value });
                      onUpdateStudent(student.id, { notes: event.target.value || null });
                    }}
                    className={styles.cellTextarea}
                  />
                </td>
                <td className={styles.td}>
                  <select
                    value={student.classroomId ?? ""}
                    onChange={(event) => {
                      updateLocalStudent(student.id, { classroomId: event.target.value });
                      onUpdateStudent(student.id, {
                        classroomId: event.target.value || null,
                      });
                    }}
                    className={styles.cellSelect}
                  >
                    <option value="">Unassigned</option>
                    {activeClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={styles.td}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={student.active}
                      onChange={(event) => {
                        updateLocalStudent(student.id, { active: event.target.checked });
                        onUpdateStudent(student.id, { active: event.target.checked });
                      }}
                    />
                    Active
                  </label>
                </td>
                <td className={styles.tdRight}>
                  <div className={styles.actions}>
                    <Button
                      href={`/admin/students/${student.id}`}
                      variant="secondary"
                      size="sm"
                    >
                      View Profile
                    </Button>
                    <Button
                      onClick={() => setDeleteConfirm({ open: true, student })}
                      variant="danger"
                      size="sm"
                    >
                      Remove
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!localStudents.length && (
              <tr>
                <td colSpan={7} className={styles.emptyRow}>
                  No students for this class yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, student: null })}
        onConfirm={() => {
          if (deleteConfirm.student) {
            onDeleteStudent(deleteConfirm.student.id);
            setLocalStudents((current) =>
              current.filter((item) => item.id !== deleteConfirm.student?.id)
            );
          }
          setDeleteConfirm({ open: false, student: null });
        }}
        title={`Remove ${deleteConfirm.student?.firstName ?? ""} ${deleteConfirm.student?.lastName ?? ""}?`}
        description="This action cannot be undone. The student will be permanently removed from the system."
        confirmText="Remove"
        variant="danger"
      />
    </section>
  );
}
