"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IncidentOptionGroups, OptionManager } from "../admin/OptionManager";
import { LmsMappingPreview } from "./LmsMappingPreview";

type SchoolRecord = {
  id: string;
  name: string;
  domain: string;
  active: boolean;
  lmsProvider: "TRACKTALLY" | "SIMON" | null;
  updatedAt: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }
  return response.json();
}

export function SuperAdminDashboard() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [options, setOptions] = useState<IncidentOptionGroups | null>(null);
  const [savingOptions, setSavingOptions] = useState(false);
  const [form, setForm] = useState({ name: "", domain: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSchools = useCallback(async () => {
    try {
      const payload = await fetchJson<{ ok: boolean; data: SchoolRecord[] }>(
        "/api/super-admin/schools",
      );
      setSchools(payload.data ?? []);
      if (!selectedSchoolId && payload.data?.length) {
        setSelectedSchoolId(payload.data[0].id);
      }
    } catch (error) {
      console.error("Failed to load schools", error);
      setMessage("Could not load schools.");
    } finally {
      setLoading(false);
    }
  }, [selectedSchoolId]);

  useEffect(() => {
    void loadSchools();
  }, [loadSchools]);

  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === selectedSchoolId) ?? null,
    [schools, selectedSchoolId],
  );

  const loadOptions = useCallback(
    async (domain?: string) => {
      if (!domain) return;
      try {
        const payload = await fetchJson<{ ok: boolean; data: { options: IncidentOptionGroups } }>(
          `/api/admin/options?domain=${encodeURIComponent(domain)}`,
        );
        setOptions(payload.data?.options ?? null);
      } catch (error) {
        console.error("Failed to load options", error);
        setMessage("Could not load incident options.");
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedSchool?.domain) {
      void loadOptions(selectedSchool.domain);
    }
  }, [selectedSchool, loadOptions]);

  const handleAddSchool = async () => {
    if (!form.name.trim() || !form.domain.trim()) {
      setMessage("Name and domain are required.");
      return;
    }
    try {
      await fetchJson("/api/super-admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), domain: form.domain.trim() }),
      });
      setForm({ name: "", domain: "" });
      setMessage("School added.");
      await loadSchools();
    } catch (error: any) {
      setMessage(error?.message ?? "Could not add school.");
    }
  };

  const handleUpdateSchool = async (id: string, patch: Partial<SchoolRecord>) => {
    try {
      await fetchJson(`/api/super-admin/schools/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      setMessage("School updated.");
      await loadSchools();
    } catch (error: any) {
      setMessage(error?.message ?? "Could not update school.");
    }
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem", maxWidth: "1100px", width: "100%" }}>
      <header
        style={{
          background: "white",
          padding: "1.5rem",
          borderRadius: "20px",
          boxShadow: "0 25px 55px -40px rgba(15,23,42,0.35)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.9rem", color: "#0f172a" }}>Super Admin</h1>
        <p style={{ margin: "0.5rem 0 0", color: "#475569" }}>
          Manage schools, domains, and incident options across TrackTally.
        </p>
      </header>

      {message && (
        <div
          style={{
            background: "#f8fafc",
            padding: "0.8rem 1rem",
            borderRadius: "12px",
            border: "1px solid #cbd5f5",
            color: "#0f172a",
          }}
        >
          {message}
        </div>
      )}

      <section
        style={{
          background: "white",
          padding: "1.25rem 1.5rem",
          borderRadius: "20px",
          boxShadow: "0 25px 55px -40px rgba(15,23,42,0.35)",
          display: "grid",
          gap: "1rem",
        }}
      >
        <h2 style={{ margin: 0, color: "#0f172a" }}>Add school</h2>
        <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <input
            type="text"
            placeholder="School name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            style={{
              borderRadius: "12px",
              border: "1px solid #cbd5f5",
              padding: "0.75rem",
            }}
          />
          <input
            type="text"
            placeholder="Domain (e.g. school.edu)"
            value={form.domain}
            onChange={(event) => setForm((prev) => ({ ...prev, domain: event.target.value }))}
            style={{
              borderRadius: "12px",
              border: "1px solid #cbd5f5",
              padding: "0.75rem",
            }}
          />
          <button
            type="button"
            onClick={handleAddSchool}
            style={{
              borderRadius: "12px",
              border: "none",
              background: "#0f766e",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Add school
          </button>
        </div>
      </section>

      <section
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "1.25rem 1.5rem",
          boxShadow: "0 25px 55px -40px rgba(15,23,42,0.35)",
        }}
      >
        <h2 style={{ margin: 0, color: "#0f172a" }}>Schools</h2>
        {loading ? (
          <p style={{ color: "#475569" }}>Loading schools…</p>
        ) : schools.length === 0 ? (
          <p style={{ color: "#475569" }}>No schools configured yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
            {schools.map((school) => (
              <div
                key={school.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  padding: "0.85rem 1rem",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <strong>{school.name}</strong>
                  <div style={{ color: "#475569", fontSize: "0.9rem" }}>{school.domain}</div>
                  <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                    Updated {new Date(school.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedSchoolId(school.id)}
                    style={{
                      borderRadius: "10px",
                      border:
                        school.id === selectedSchoolId ? "2px solid #0f766e" : "1px solid #cbd5f5",
                      padding: "0.4rem 0.9rem",
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    {school.id === selectedSchoolId ? "Selected" : "Select"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateSchool(school.id, { active: !school.active })
                    }
                    style={{
                      borderRadius: "10px",
                      border: "1px solid #cbd5f5",
                      padding: "0.4rem 0.9rem",
                      background: school.active ? "#ecfeff" : "white",
                      cursor: "pointer",
                    }}
                  >
                    {school.active ? "Active" : "Inactive"}
                  </button>
                  <Link
                    href={`/admin?impersonate=${encodeURIComponent(school.domain)}`}
                    prefetch={false}
                    style={{
                      borderRadius: "10px",
                      border: "1px solid #0f766e",
                      padding: "0.4rem 0.9rem",
                      color: "#0f766e",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    Admin view
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedSchool && (
        <section
          style={{
            background: "white",
            borderRadius: "20px",
            padding: "1.25rem 1.5rem",
            boxShadow: "0 25px 55px -40px rgba(15,23,42,0.35)",
            display: "grid",
            gap: "1rem",
          }}
        >
          <h2 style={{ margin: 0, color: "#0f172a" }}>
            Manage {selectedSchool.name}
          </h2>
          <p style={{ margin: "-0.25rem 0 0.5rem", color: "#475569" }}>
            Domain: <strong>{selectedSchool.domain}</strong>{" "}
            <Link
              href={`/admin?impersonate=${encodeURIComponent(selectedSchool.domain)}`}
              prefetch={false}
              style={{ color: "#0f766e", fontWeight: 600 }}
            >
              Open school admin
            </Link>
          </p>
          <label style={{ display: "grid", gap: "0.4rem" }}>
            <span style={{ fontWeight: 600 }}>Display name</span>
            <input
              type="text"
              defaultValue={selectedSchool.name}
              onBlur={(event) =>
                handleUpdateSchool(selectedSchool.id, { name: event.target.value })
              }
              style={{
                borderRadius: "12px",
                border: "1px solid #cbd5f5",
                padding: "0.75rem",
              }}
            />
          </label>
          <label style={{ display: "grid", gap: "0.4rem" }}>
            <span style={{ fontWeight: 600 }}>Primary domain</span>
            <input
              type="text"
              defaultValue={selectedSchool.domain}
              onBlur={(event) =>
                handleUpdateSchool(selectedSchool.id, { domain: event.target.value })
              }
              style={{
                borderRadius: "12px",
                border: "1px solid #cbd5f5",
                padding: "0.75rem",
              }}
            />
          </label>
          <label style={{ display: "grid", gap: "0.4rem" }}>
            <span style={{ fontWeight: 600 }}>LMS Provider</span>
            <select
              value={selectedSchool.lmsProvider || "TRACKTALLY"}
              onChange={(event) =>
                handleUpdateSchool(selectedSchool.id, {
                  lmsProvider: event.target.value as "TRACKTALLY" | "SIMON"
                })
              }
              style={{
                borderRadius: "12px",
                border: "1px solid #cbd5f5",
                padding: "0.75rem",
                background: "white",
                cursor: "pointer",
              }}
            >
              <option value="TRACKTALLY">TrackTally (Default)</option>
              <option value="SIMON">SIMON LMS</option>
            </select>
            <span style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "-0.2rem" }}>
              {selectedSchool.lmsProvider === "SIMON"
                ? "Using SIMON Learning Management System field mapping"
                : "Using standard TrackTally incident tracking format"
              }
            </span>
          </label>
          {selectedSchool.lmsProvider && (
            <LmsMappingPreview
              provider={selectedSchool.lmsProvider as "TRACKTALLY" | "SIMON"}
            />
          )}
          <OptionManager
            options={options}
            saving={savingOptions}
            onSave={async (payload) => {
              if (!selectedSchool.domain) return;
              setSavingOptions(true);
              try {
                await fetchJson("/api/admin/options", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...payload, domain: selectedSchool.domain }),
                });
                await loadOptions(selectedSchool.domain);
                setMessage("Options updated.");
              } catch (error: any) {
                setMessage(error?.message ?? "Could not update options.");
              } finally {
                setSavingOptions(false);
              }
            }}
          />
        </section>
      )}
    </div>
  );
}
