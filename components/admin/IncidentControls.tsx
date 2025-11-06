"use client";

import { useState } from "react";

type Props = {
  initialRetention: number;
};

export function IncidentControls({ initialRetention }: Props) {
  const [retentionDays, setRetentionDays] = useState(initialRetention);
  const [inputValue, setInputValue] = useState(String(initialRetention));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function updateRetention(days: number) {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/incidents/retention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to update retention.");
      }

      const payload = await response.json();
      setRetentionDays(payload.days);
      setMessage(`Retention updated to ${payload.days} day${payload.days === 1 ? "" : "s"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update retention.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  return (
    <section
      style={{
        display: "grid",
        gap: "0.75rem",
        background: "white",
        borderRadius: "16px",
        padding: "1rem 1.25rem",
        boxShadow: "0 20px 45px -35px rgba(15,23,42,0.35)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a" }}>Controls</h2>
          <p style={{ margin: "0.35rem 0 0", color: "#475569", fontSize: "0.95rem" }}>
            Current retention: {retentionDays} day{retentionDays === 1 ? "" : "s"}. Export
            includes all incidents in the database.
          </p>
        </div>
        <a
          href="/api/admin/incidents/export"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.65rem 1rem",
            borderRadius: "12px",
            background: "#0f766e",
            color: "white",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Download CSV
        </a>
      </div>

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const parsed = Number.parseInt(inputValue, 10);
          if (!Number.isFinite(parsed) || parsed < 1 || parsed > 3650) {
            setMessage("Enter a value between 1 and 3650 days.");
            setTimeout(() => setMessage(null), 4000);
            return;
          }
          await updateRetention(parsed);
        }}
        style={{
          display: "flex",
          gap: "0.65rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label style={{ fontWeight: 600, color: "#0f172a" }}>
          Retention (days)
          <input
            type="number"
            min={1}
            max={3650}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            style={{
              marginLeft: "0.75rem",
              padding: "0.45rem 0.65rem",
              borderRadius: "10px",
              border: "1px solid #cbd5f5",
              width: "110px",
            }}
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "0.55rem 1rem",
            borderRadius: "10px",
            border: "none",
            background: "#0f172a",
            color: "white",
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving…" : "Update"}
        </button>
      </form>

      {message && (
        <div
          style={{
            background: "#ecfeff",
            color: "#0f766e",
            borderRadius: "10px",
            padding: "0.55rem 0.75rem",
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      )}
    </section>
  );
}
