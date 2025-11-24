"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { MetricCard } from "./MetricCard";

type Student = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  name: string;
  classroom: {
    id: string;
    name: string;
    code: string;
    teacher: {
      name: string;
      email: string;
    } | null;
  } | null;
};

type Incident = {
  id: string;
  timestamp: string;
  type: string;
  level: string;
  category: string;
  location: string;
  actionTaken: string | null;
  note: string | null;
  teacherEmail: string;
  classroom: {
    name: string;
  } | null;
};

type Stats = {
  totalIncidents: number;
  totalCommendations: number;
  last30Days: number;
  previous30Days: number;
  trend: string;
  byLevel: Array<{ level: string; count: number }>;
  topCategories: Array<{ category: string; count: number }>;
};

type ProfileData = {
  student: Student;
  incidents: Incident[];
  stats: Stats;
};

type Props = {
  studentId: string;
};

export function StudentProfile({ studentId }: Props) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "incident" | "commendation">("all");

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);

        const typeParam = typeFilter !== "all" ? `&type=${typeFilter}` : "";
        const response = await fetch(
          `/api/admin/students/${studentId}/incidents?days=90${typeParam}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error("Failed to load student profile");
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        console.error("Profile load error:", err);
        setError("Failed to load student profile");
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [studentId, typeFilter]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
        Loading student profile...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "#ef4444",
          background: "#fef2f2",
          borderRadius: "12px",
          margin: "2rem",
        }}
      >
        {error || "Student not found"}
      </div>
    );
  }

  const { student, incidents, stats } = data;
  const trendValue = parseInt(stats.trend, 10);
  const isIncrease = trendValue > 0;

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {/* Header */}
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "1.5rem",
          boxShadow: "0 6px 20px rgba(24, 34, 72, 0.12)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.9rem", color: "#0f172a" }}>
              {student.name}
            </h1>
            <p style={{ margin: "0.5rem 0 0", color: "#475569", fontSize: "1rem" }}>
              Student ID: {student.studentId}
              {student.classroom && (
                <>
                  {" • "}Class: {student.classroom.name}
                  {student.classroom.teacher && ` (${student.classroom.teacher.name})`}
                </>
              )}
            </p>
          </div>
          <a
            href="/admin/incidents"
            style={{
              padding: "0.55rem 0.85rem",
              borderRadius: "10px",
              border: "1px solid #0f766e",
              color: "#0f766e",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Back to Incidents
          </a>
        </div>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <MetricCard
          title="Total Incidents"
          value={stats.totalIncidents}
          subtitle="All time"
        />
        <MetricCard
          title="Commendations"
          value={stats.totalCommendations}
          subtitle="Positive recognition"
        />
        <MetricCard
          title="Last 30 Days"
          value={stats.last30Days}
          subtitle="Recent incidents"
          trend={trendValue !== 0 ? `${Math.abs(trendValue)}% vs previous month` : undefined}
          trendUp={isIncrease}
        />
      </div>

      {/* Category Breakdown */}
      {stats.topCategories.length > 0 && (
        <div
          style={{
            background: "white",
            borderRadius: "20px",
            padding: "1.5rem",
            boxShadow: "0 6px 20px rgba(24, 34, 72, 0.12)",
          }}
        >
          <h2 style={{ margin: "0 0 1rem", fontSize: "1.25rem", color: "#0f172a" }}>
            Top Categories
          </h2>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {stats.topCategories.map((item, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.75rem",
                  background: "#f8fafc",
                  borderRadius: "8px",
                }}
              >
                <span style={{ fontWeight: 500, color: "#0f172a" }}>{item.category}</span>
                <span style={{ fontWeight: 600, color: "#6d3cff" }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "1rem 1.25rem",
          boxShadow: "0 6px 20px rgba(24, 34, 72, 0.12)",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, color: "#64748b", fontSize: "0.875rem" }}>Filter:</span>
          {["all", "incident", "commendation"].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type as any)}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "8px",
                border: typeFilter === type ? "2px solid #0f766e" : "1px solid #cbd5f5",
                background: typeFilter === type ? "#ecfeff" : "white",
                color: typeFilter === type ? "#0f766e" : "#64748b",
                cursor: "pointer",
                fontWeight: typeFilter === type ? 600 : 500,
                fontSize: "0.875rem",
              }}
            >
              {type === "all" ? "All" : type === "incident" ? "Incidents" : "Commendations"}
            </button>
          ))}
          <span style={{ marginLeft: "auto", color: "#64748b", fontSize: "0.875rem" }}>
            {incidents.length} records (last 90 days)
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "1.5rem",
          boxShadow: "0 6px 20px rgba(24, 34, 72, 0.12)",
        }}
      >
        <h2 style={{ margin: "0 0 1.5rem", fontSize: "1.25rem", color: "#0f172a" }}>
          Behavior Timeline
        </h2>

        {incidents.length === 0 ? (
          <p style={{ color: "#94a3b8", textAlign: "center", padding: "2rem 0" }}>
            No records found for this period
          </p>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {incidents.map((incident) => (
              <div
                key={incident.id}
                style={{
                  padding: "1rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  borderLeft: `4px solid ${incident.type === "commendation" ? "#10b981" : incident.level === "Major" ? "#ef4444" : "#f59e0b"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        background: incident.type === "commendation" ? "#d1fae5" : "#fef3c7",
                        color: incident.type === "commendation" ? "#065f46" : "#92400e",
                        marginRight: "0.5rem",
                      }}
                    >
                      {incident.type === "commendation" ? "✓ Commendation" : "⚠ Incident"}
                    </span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        background: "#f1f5f9",
                        color: "#0f172a",
                      }}
                    >
                      {incident.level}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
                    {format(new Date(incident.timestamp), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>

                <div style={{ display: "grid", gap: "0.25rem" }}>
                  <div style={{ fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>
                    {incident.category}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
                    Location: {incident.location}
                    {incident.classroom && ` • Class: ${incident.classroom.name}`}
                  </div>
                  {incident.actionTaken && (
                    <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
                      Action: {incident.actionTaken}
                    </div>
                  )}
                  {incident.note && (
                    <div
                      style={{
                        marginTop: "0.5rem",
                        padding: "0.75rem",
                        background: "#f8fafc",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                        color: "#475569",
                      }}
                    >
                      {incident.note}
                    </div>
                  )}
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                    Logged by {incident.teacherEmail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
