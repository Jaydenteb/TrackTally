"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

type IncidentWithRelations = {
  id: string;
  uuid: string;
  timestamp: string;
  type: string;
  studentId: string | null;
  studentName: string;
  classroomId: string | null;
  classCode: string | null;
  teacherEmail: string;
  level: string;
  category: string;
  location: string;
  actionTaken: string | null;
  note: string | null;
  device: string | null;
  student: {
    firstName: string;
    lastName: string;
  } | null;
  classroom: {
    name: string;
    code: string;
  } | null;
};

type IncidentStats = {
  total: number;
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  thisWeek: number;
  lastWeek: number;
  changePercent: number;
};

type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type Filters = {
  dateFrom: string;
  dateTo: string;
  studentId: string;
  teacherEmail: string;
  classroomId: string;
  level: string;
  category: string;
  type: string;
  page: number;
  limit: number;
  sortBy: "timestamp" | "studentName" | "level" | "category";
  sortOrder: "asc" | "desc";
};

type Props = {
  domain: string;
  impersonatedDomain?: string | null;
  isSuperAdminView?: boolean;
  organizationName?: string | null;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed?.error) throw new Error(parsed.error);
    } catch {
      // ignore
    }
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json();
}

export function IncidentsViewer({
  domain,
  impersonatedDomain,
  isSuperAdminView = false,
  organizationName,
}: Props) {
  const [incidents, setIncidents] = useState<IncidentWithRelations[]>([]);
  const [stats, setStats] = useState<IncidentStats | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [exportingState, setExportingState] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({
    dateFrom: "",
    dateTo: "",
    studentId: "",
    teacherEmail: "",
    classroomId: "",
    level: "",
    category: "",
    type: "",
    page: 1,
    limit: 50,
    sortBy: "timestamp",
    sortOrder: "desc",
  });

  const buildUrl = useCallback(
    (base: string, params: Record<string, string | number> = {}) => {
      const url = new URL(base, window.location.origin);
      if (impersonatedDomain) {
        url.searchParams.set("domain", impersonatedDomain);
      }
      Object.entries(params).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
      return url.toString();
    },
    [impersonatedDomain]
  );

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: filters.page,
        limit: filters.limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.studentId) params.studentId = filters.studentId;
      if (filters.teacherEmail) params.teacherEmail = filters.teacherEmail;
      if (filters.classroomId) params.classroomId = filters.classroomId;
      if (filters.level) params.level = filters.level;
      if (filters.category) params.category = filters.category;
      if (filters.type) params.type = filters.type;

      const response = await fetchJson<{
        ok: boolean;
        data: IncidentWithRelations[];
        pagination: PaginationInfo;
      }>(buildUrl("/api/admin/incidents", params));

      setIncidents(response.data ?? []);
      setPagination(response.pagination);
    } catch (err: unknown) {
      console.error("Failed to load incidents:", err);
      const message = err instanceof Error ? err.message : "Failed to load incidents";
      report(message);
    } finally {
      setLoading(false);
    }
  }, [filters, buildUrl]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.studentId) params.studentId = filters.studentId;
      if (filters.teacherEmail) params.teacherEmail = filters.teacherEmail;
      if (filters.classroomId) params.classroomId = filters.classroomId;
      if (filters.level) params.level = filters.level;
      if (filters.category) params.category = filters.category;
      if (filters.type) params.type = filters.type;

      const response = await fetchJson<{ ok: boolean; data: IncidentStats }>(
        buildUrl("/api/admin/incidents/stats", params)
      );

      setStats(response.data);
    } catch (err: unknown) {
      console.error("Failed to load stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, [filters, buildUrl]);

  useEffect(() => {
    void loadIncidents();
  }, [loadIncidents]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  function report(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(null), 3200);
  }

  const handleExport = async () => {
    if (exportingState) return;
    setExportingState(true);
    try {
      const params: Record<string, string | number> = {};
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.studentId) params.studentId = filters.studentId;
      if (filters.teacherEmail) params.teacherEmail = filters.teacherEmail;
      if (filters.classroomId) params.classroomId = filters.classroomId;
      if (filters.level) params.level = filters.level;
      if (filters.category) params.category = filters.category;
      if (filters.type) params.type = filters.type;

      const url = buildUrl("/api/admin/incidents/export", params);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const now = new Date();
      link.download = `incidents-${now.toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      report("Export successful!");
    } catch (err: unknown) {
      console.error("Export failed:", err);
      const message = err instanceof Error ? err.message : "Export failed";
      report(message);
    } finally {
      setExportingState(false);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? (typeof value === "number" ? value : Number(value)) : 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      studentId: "",
      teacherEmail: "",
      classroomId: "",
      level: "",
      category: "",
      type: "",
      page: 1,
      limit: 50,
      sortBy: "timestamp",
      sortOrder: "desc",
    });
  };

  const hasActiveFilters =
    filters.dateFrom ||
    filters.dateTo ||
    filters.studentId ||
    filters.teacherEmail ||
    filters.classroomId ||
    filters.level ||
    filters.category ||
    filters.type;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLevelColor = (level: string) => {
    const levelMap: Record<string, string> = {
      "Level 1": "#10b981",
      "Level 2": "#f59e0b",
      "Level 3": "#ef4444",
      "Level 4": "#dc2626",
    };
    return levelMap[level] ?? "#6b7280";
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem", width: "min(1200px, 100%)" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "0.75rem",
          background: "white",
          borderRadius: "20px",
          boxShadow: "0 25px 55px -40px rgba(15,23,42,0.35)",
          padding: "1.25rem 1.5rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", color: "#0f172a" }}>
            Incidents & Commendations
          </h1>
          {organizationName && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#64748b" }}>
              {organizationName}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link
            href={isSuperAdminView ? "/super-admin" : "/admin"}
            style={{
              padding: "0.5rem 1rem",
              background: "#f1f5f9",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#0f172a",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            Back to Admin
          </Link>
          <Link
            href="/teacher"
            style={{
              padding: "0.5rem 1rem",
              background: "#0ea5e9",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "white",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            Logger
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{
              padding: "0.5rem 1rem",
              background: "#f1f5f9",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#0f172a",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {message && (
        <div
          style={{
            padding: "1rem",
            background: "#0ea5e9",
            color: "white",
            borderRadius: "12px",
            textAlign: "center",
            fontWeight: 500,
          }}
        >
          {message}
        </div>
      )}

      {statsLoading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
          Loading statistics...
        </div>
      ) : stats ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "1.25rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "0.5rem" }}>
              Total Records
            </div>
            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#0f172a" }}>
              {stats.total}
            </div>
          </div>
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "1.25rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "0.5rem" }}>
              This Week
            </div>
            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#0f172a" }}>
              {stats.thisWeek}
            </div>
            {stats.lastWeek > 0 && (
              <div
                style={{
                  fontSize: "0.75rem",
                  marginTop: "0.25rem",
                  color: stats.changePercent > 0 ? "#ef4444" : "#10b981",
                }}
              >
                {stats.changePercent > 0 ? "+" : ""}
                {stats.changePercent.toFixed(0)}% vs last week
              </div>
            )}
          </div>
          {Object.keys(stats.byType).length > 1 && (
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "1.25rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "0.5rem" }}>
                By Type
              </div>
              {Object.entries(stats.byType).map(([type, count]) => (
                <div
                  key={type}
                  style={{ fontSize: "0.875rem", color: "#0f172a", marginTop: "0.25rem" }}
                >
                  {type}: {count}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "1.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a" }}>Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                padding: "0.375rem 0.75rem",
                background: "#f1f5f9",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "#0f172a",
                cursor: "pointer",
              }}
            >
              Clear All
            </button>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          <div>
            <label
              htmlFor="dateFrom"
              style={{ display: "block", fontSize: "0.875rem", color: "#64748b", marginBottom: "0.25rem" }}
            >
              From Date
            </label>
            <input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                fontSize: "0.875rem",
              }}
            />
          </div>
          <div>
            <label
              htmlFor="dateTo"
              style={{ display: "block", fontSize: "0.875rem", color: "#64748b", marginBottom: "0.25rem" }}
            >
              To Date
            </label>
            <input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                fontSize: "0.875rem",
              }}
            />
          </div>
          <div>
            <label
              htmlFor="type"
              style={{ display: "block", fontSize: "0.875rem", color: "#64748b", marginBottom: "0.25rem" }}
            >
              Type
            </label>
            <select
              id="type"
              value={filters.type}
              onChange={(e) => handleFilterChange("type", e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                fontSize: "0.875rem",
              }}
            >
              <option value="">All</option>
              <option value="incident">Incidents</option>
              <option value="commendation">Commendations</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="studentId"
              style={{ display: "block", fontSize: "0.875rem", color: "#64748b", marginBottom: "0.25rem" }}
            >
              Student ID
            </label>
            <input
              id="studentId"
              type="text"
              value={filters.studentId}
              onChange={(e) => handleFilterChange("studentId", e.target.value)}
              placeholder="Filter by student..."
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                fontSize: "0.875rem",
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
        <button
          onClick={handleExport}
          disabled={exportingState}
          style={{
            padding: "0.75rem 1.5rem",
            background: exportingState ? "#94a3b8" : "#10b981",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "white",
            cursor: exportingState ? "not-allowed" : "pointer",
          }}
        >
          {exportingState ? "Exporting..." : "Export to CSV"}
        </button>
      </div>

      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "1.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ margin: "0 0 1rem", fontSize: "1.25rem", color: "#0f172a" }}>
          Records ({pagination.total})
        </h2>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
            Loading incidents...
          </div>
        ) : incidents.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
            No incidents found. {hasActiveFilters && "Try adjusting your filters."}
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.75rem",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#64748b",
                      }}
                    >
                      Date
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.75rem",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#64748b",
                      }}
                    >
                      Type
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.75rem",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#64748b",
                      }}
                    >
                      Student
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.75rem",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#64748b",
                      }}
                    >
                      Level
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.75rem",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#64748b",
                      }}
                    >
                      Category
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.75rem",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#64748b",
                      }}
                    >
                      Teacher
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident) => (
                    <>
                      <tr
                        key={incident.id}
                        onClick={() =>
                          setExpandedRowId(expandedRowId === incident.id ? null : incident.id)
                        }
                        style={{
                          borderBottom: "1px solid #e2e8f0",
                          cursor: "pointer",
                          background: expandedRowId === incident.id ? "#f8fafc" : "transparent",
                        }}
                      >
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#0f172a" }}>
                          {formatDate(incident.timestamp)}
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                          <span
                            style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              background: incident.type === "commendation" ? "#dcfce7" : "#fee2e2",
                              color: incident.type === "commendation" ? "#166534" : "#991b1b",
                            }}
                          >
                            {incident.type}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#0f172a" }}>
                          {incident.student
                            ? `${incident.student.firstName} ${incident.student.lastName}`
                            : incident.studentName}
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                          <span
                            style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              background: `${getLevelColor(incident.level)}22`,
                              color: getLevelColor(incident.level),
                            }}
                          >
                            {incident.level}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#0f172a" }}>
                          {incident.category}
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#64748b" }}>
                          {incident.teacherEmail}
                        </td>
                      </tr>
                      {expandedRowId === incident.id && (
                        <tr key={`${incident.id}-details`}>
                          <td colSpan={6} style={{ padding: "1rem", background: "#f8fafc" }}>
                            <div style={{ display: "grid", gap: "0.75rem" }}>
                              <div>
                                <strong style={{ fontSize: "0.875rem", color: "#64748b" }}>
                                  Location:
                                </strong>{" "}
                                <span style={{ fontSize: "0.875rem", color: "#0f172a" }}>
                                  {incident.location}
                                </span>
                              </div>
                              {incident.actionTaken && (
                                <div>
                                  <strong style={{ fontSize: "0.875rem", color: "#64748b" }}>
                                    Action Taken:
                                  </strong>{" "}
                                  <span style={{ fontSize: "0.875rem", color: "#0f172a" }}>
                                    {incident.actionTaken}
                                  </span>
                                </div>
                              )}
                              {incident.note && (
                                <div>
                                  <strong style={{ fontSize: "0.875rem", color: "#64748b" }}>
                                    Note:
                                  </strong>{" "}
                                  <span style={{ fontSize: "0.875rem", color: "#0f172a" }}>
                                    {incident.note}
                                  </span>
                                </div>
                              )}
                              {incident.classroom && (
                                <div>
                                  <strong style={{ fontSize: "0.875rem", color: "#64748b" }}>
                                    Class:
                                  </strong>{" "}
                                  <span style={{ fontSize: "0.875rem", color: "#0f172a" }}>
                                    {incident.classroom.name} ({incident.classroom.code})
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginTop: "1.5rem",
                }}
              >
                <button
                  onClick={() => handleFilterChange("page", pagination.page - 1)}
                  disabled={pagination.page === 1}
                  style={{
                    padding: "0.5rem 1rem",
                    background: pagination.page === 1 ? "#f1f5f9" : "#0ea5e9",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: pagination.page === 1 ? "#94a3b8" : "white",
                    cursor: pagination.page === 1 ? "not-allowed" : "pointer",
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handleFilterChange("page", pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  style={{
                    padding: "0.5rem 1rem",
                    background: pagination.page === pagination.totalPages ? "#f1f5f9" : "#0ea5e9",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: pagination.page === pagination.totalPages ? "#94a3b8" : "white",
                    cursor: pagination.page === pagination.totalPages ? "not-allowed" : "pointer",
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
