"use client";

import { useRef, useCallback } from "react";
import styles from "../../app/page.module.css";
import { startDictation } from "../../lib/speech";

type Props = {
  note: string;
  isRecording: boolean;
  onNoteChange: (note: string) => void;
  onRecordingChange: (isRecording: boolean) => void;
  onToast: (message: string) => void;
};

export function NoteStep({
  note,
  isRecording,
  onNoteChange,
  onRecordingChange,
  onToast,
}: Props) {
  const noteRef = useRef<HTMLTextAreaElement | null>(null);
  const dictationRef = useRef<{ stop: () => void } | null>(null);

  const handleDictation = useCallback(() => {
    if (isRecording) {
      dictationRef.current?.stop();
      dictationRef.current = null;
      onRecordingChange(false);
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
      onToast("Tap the keyboard mic to dictate.");
      return;
    }

    const controller = startDictation({
      onResult: (text) => {
        const cleaned = text.trim();
        if (cleaned) {
          onNoteChange(note ? `${note.trim()} ${cleaned}`.trim() : cleaned);
          onToast("Dictation added");
        }
        dictationRef.current = null;
        onRecordingChange(false);
      },
      onError: (error) => {
        onToast(error);
        dictationRef.current = null;
        onRecordingChange(false);
      },
    });

    if (controller) {
      dictationRef.current = controller;
      onRecordingChange(true);
    }
  }, [isRecording, note, onNoteChange, onRecordingChange, onToast]);

  return (
    <section>
      <p className={styles.sectionTitle}>Note</p>
      <div className={styles.noteRow}>
        <textarea
          ref={noteRef}
          className={styles.textarea}
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
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
}
