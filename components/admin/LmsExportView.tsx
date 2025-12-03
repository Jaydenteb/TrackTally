"use client";

import { useEffect, useState } from "react";
import { transformIncident, LMS_PROVIDER_LABELS } from "../../lib/lms-templates";
import type { Incident } from "@prisma/client";
import type { IncidentForExport } from "../../lib/lms-templates";

type Organization = {
  id: string;
  name: string;
  lmsProvider: "TRACKTALLY" | "SIMON" | null;
};

type ApiResponse = {
  ok: boolean;
  data?: {
    organization: Organization;
    incidents: Incident[];
  };
  error?: string;
};

export function LmsExportView() {
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [transformedData, setTransformedData] = useState<Partial<IncidentForExport> | null>(null);
  const [impersonatedDomain, setImpersonatedDomain] = useState<string | null>(null);

  useEffect(() => {
    // Capture ?domain= or ?impersonate= from the current URL (super admin impersonation support)
    const params = new URLSearchParams(window.location.search);
    const domainParam = params.get("domain") ?? params.get("impersonate");
    setImpersonatedDomain(domainParam);

    async function loadData() {
      try {
        const query = domainParam ? `?domain=${encodeURIComponent(domainParam)}` : "";
        const response = await fetch(`/api/admin/lms-export${query}`, { cache: "no-store" });
        const result: ApiResponse = await response.json();

        if (result.ok && result.data) {
          setOrganization(result.data.organization);
          setIncidents(result.data.incidents);
          if (result.data.incidents.length > 0) {
            setSelectedIncident(result.data.incidents[0]);
          }
        }
      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  useEffect(() => {
    if (selectedIncident && organization?.lmsProvider) {
      const transformed = transformIncident(
        selectedIncident,
        organization.lmsProvider as "TRACKTALLY" | "SIMON",
      );
      setTransformedData(transformed);
    }
  }, [selectedIncident, organization]);

  if (loading) {
    return (
      <div style={{ maxWidth: "1200px", width: "100%" }}>
        <div
          style={{
            background: "white",
            padding: "2rem",
            borderRadius: "20px",
            boxShadow: "0 25px 55px -40px rgba(15,23,42,0.35)",
            textAlign: "center",
          }}
        >
          Loading...
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div style={{ maxWidth: "1200px", width: "100%" }}>
        <div
          style={{
            background: "white",
            padding: "2rem",
            borderRadius: "20px",
            boxShadow: "0 25px 55px -40px rgba(15,23,42,0.35)",
          }}
        >
          <h1 style={{ margin: 0, color: "#0f172a" }}>Organization not found</h1>
        </div>
      </div>
    );
  }

  const provider = organization.lmsProvider || "TRACKTALLY";
  const impersonationLabel = impersonatedDomain ? ` (Impersonating ${impersonatedDomain})` : "";

  return (
    <div style={{ maxWidth: "1200px", width: "100%", display: "grid", gap: "1.5rem" }}>
      {/* Header */}
      <header
        style={{
          background: "white",
          padding: "1.5rem",
          borderRadius: "20px",
          boxShadow: "0 25px 55px -40px rgba(15,23,42,0.35)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.9rem", color: "#0f172a" }}>
          LMS Export Preview
        </h1>
        <p style={{ margin: "0.5rem 0 0", color: "#475569" }}>
          View how TrackTally incidents appear in{" "}
          <strong>{LMS_PROVIDER_LABELS[provider]}</strong> format
        </p>
      </header>

      {/* Provider Info */}
      <div
        style={{
          background: provider === "SIMON" ? "#ecfeff" : "#f0fdfa",
          padding: "1rem 1.25rem",
          borderRadius: "14px",
          border: `2px solid ${provider === "SIMON" ? "#06b6d4" : "#10b981"}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.5rem" }}>
            {provider === "SIMON" ? "🏫" : "📊"}
          </span>
          <div>
            <div style={{ fontWeight: 600, color: "#0f172a" }}>
              {organization.name}
            </div>
            <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Using {LMS_PROVIDER_LABELS[provider]}
            </div>
          </div>
        </div>
      </div>

      {/* Incident Selector */}
      {incidents.length > 0 ? (
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "20px",
            boxShadow: "0 25px 55px -40px rgba(15,23,42,0.35)",
          }}
        >
          <label style={{ display: "grid", gap: "0.5rem" }}>
            <span style={{ fontWeight: 600, color: "#0f172a" }}>
              Select Incident to Preview
            </span>
            <select
              value={selectedIncident?.id || ""}
              onChange={(e) => {
                const incident = incidents.find((inc) => inc.id === e.target.value);
                setSelectedIncident(incident || null);
              }}
              style={{
                padding: "0.75rem",
                borderRadius: "12px",
                border: "1px solid #cbd5f5",
                background: "white",
                fontSize: "0.95rem",
              }}
            >
              {incidents.map((incident) => (
                <option key={incident.id} value={incident.id}>
                  {new Date(incident.timestamp).toLocaleString()} - {incident.studentName} -{" "}
                  {incident.category} ({incident.type})
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div
          style={{
            background: "white",
            padding: "2rem",
            borderRadius: "20px",
            boxShadow: "0 25px 55px -40px rgba(15,23,42,0.35)",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#64748b", margin: 0 }}>
            No incidents found. Log some incidents to see the LMS export preview.
          </p>
        </div>
      )}

      {/* Transformed Data Display */}
      {transformedData && selectedIncident && (
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "20px",
            boxShadow: "0 25px 55px -40px rgba(15,23,42,0.35)",
            display: "grid",
            gap: "1rem",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.3rem", color: "#0f172a" }}>
              {provider} Format
            </h2>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "#64748b" }}>
              How this incident appears in {LMS_PROVIDER_LABELS[provider]}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {Object.entries(transformedData).map(([key, value]) => {
              // Determine if this is a default value
              const isDefault =
                provider === "SIMON" &&
                [
                  "time",
                  "status",
                  "followUpRequired",
                  "followUpNotes",
                  "perceivedMotivation",
                  "instigatorIds",
                  "affectedStudentIds",
                  "affectedStaffIds",
                  "notifyRoleCodes",
                  "notifyStaffIds",
                  "detentionAdded",
                ].includes(key);

              let displayValue: string;
              if (value === null) {
                displayValue = "null";
              } else if (value === undefined) {
                displayValue = "undefined";
              } else if (typeof value === "boolean") {
                displayValue = value ? "true" : "false";
              } else if (value instanceof Date) {
                displayValue = value.toLocaleString();
              } else if (Array.isArray(value)) {
                displayValue = value.length === 0 ? "[]" : JSON.stringify(value);
              } else {
                displayValue = String(value);
              }

              return (
                <div
                  key={key}
                  style={{
                    background: isDefault ? "#fffbeb" : "#f8fafc",
                    padding: "0.75rem",
                    borderRadius: "10px",
                    border: isDefault ? "1px solid #fbbf24" : "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "0.25rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {key}
                    {isDefault && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          background: "#fef3c7",
                          color: "#92400e",
                          padding: "0.1rem 0.4rem",
                          borderRadius: "4px",
                        }}
                      >
                        default
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "0.9rem",
                      color: "#0f172a",
                      wordBreak: "break-word",
                    }}
                  >
                    {displayValue}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Export JSON Button */}
          <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={() => {
                const json = JSON.stringify(transformedData, null, 2);
                const blob = new Blob([json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `incident-${selectedIncident.id}-${provider.toLowerCase()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              style={{
                padding: "0.65rem 1.25rem",
                borderRadius: "12px",
                border: "none",
                background: "#0f766e",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              Download as JSON
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(transformedData, null, 2));
              }}
              style={{
                padding: "0.65rem 1.25rem",
                borderRadius: "12px",
                border: "1px solid #cbd5f5",
                background: "white",
                color: "#0f766e",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              Copy JSON
            </button>
          </div>
        </div>
      )}

      {/* Back Link */}
      <div style={{ textAlign: "center" }}>
        <a
          href="/admin"
          style={{
            color: "#0f766e",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          ← Back to Admin Dashboard
        </a>
      </div>
    </div>
  );
}
