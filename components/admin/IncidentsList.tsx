"use client";

import { useState, useEffect } from "react";

type Incident = {
  id: string;
  timestamp: string;
  studentName: string;
  level: string;
  category: string;
  location: string;
  actionTaken: string | null;
  teacherEmail: string;
  classCode: string | null;
  type: string;
  classroom?: {
    name: string;
  } | null;
};

type Class = {
  id: string;
  name: string;
};

export function IncidentsList() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [incidentsRes, classesRes] = await Promise.all([
          fetch("/api/admin/incidents?limit=500", { cache: "no-store" }),
          fetch("/api/admin/classes", { cache: "no-store" }),
        ]);

        if (!incidentsRes.ok || !classesRes.ok) {
          throw new Error("Failed to load data");
        }

        const incidentsData = await incidentsRes.json();
        const classesData = await classesRes.json();

        setIncidents(incidentsData.data || []);
        setClasses(classesData.data || []);
      } catch (err) {
        console.error("Load error:", err);
        setError("Failed to load incidents");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  // Filter incidents
  const filteredIncidents = incidents.filter((incident) => {
    // Search filter
    if (
      searchTerm &&
      !incident.studentName.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    // Class filter
    if (selectedClass && incident.classroom?.name !== selectedClass) {
      return false;
    }

    // Level filter
    if (selectedLevel && incident.level !== selectedLevel) {
      return false;
    }

    // Type filter
    if (selectedType && incident.type !== selectedType) {
      return false;
    }

    // Category filter
    if (
      selectedCategory &&
      !incident.category.toLowerCase().includes(selectedCategory.toLowerCase())
    ) {
      return false;
    }

    // Date range filter
    const incidentDate = new Date(incident.timestamp);
    if (startDate && incidentDate < new Date(startDate)) {
      return false;
    }
    if (endDate && incidentDate > new Date(endDate + "T23:59:59")) {
      return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedIncidents = filteredIncidents.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedClass("");
    setSelectedLevel("");
    setSelectedType("");
    setSelectedCategory("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const uniqueLevels = Array.from(new Set(incidents.map((i) => i.level)));
  const uniqueCategories = Array.from(new Set(incidents.map((i) => i.category)));

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
        Loading incidents...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "#ef4444",
          background: "#fef2f2",
          borderRadius: "12px",
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {/* Filters */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "1.25rem",
          boxShadow: "0 25px 55px -40px rgba(15,23,42,0.35)",
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
          <h2 style={{ margin: 0, fontSize: "1rem", color: "#0f172a" }}>Filters</h2>
          <button
            onClick={handleClearFilters}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "8px",
              border: "1px solid #cbd5f5",
              background: "white",
              color: "#64748b",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Clear all
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "0.75rem",
          }}
        >
          <input
            type="text"
            placeholder="Search student name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "0.5rem",
              borderRadius: "8px",
              border: "1px solid #cbd5f5",
              fontSize: "0.875rem",
            }}
          />

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            style={{
              padding: "0.5rem",
              borderRadius: "8px",
              border: "1px solid #cbd5f5",
              fontSize: "0.875rem",
            }}
          >
            <option value="">All classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.name}>
                {cls.name}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              padding: "0.5rem",
              borderRadius: "8px",
              border: "1px solid #cbd5f5",
              fontSize: "0.875rem",
            }}
          >
            <option value="">All types</option>
            <option value="incident">Incident</option>
            <option value="commendation">Commendation</option>
          </select>

          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            style={{
              padding: "0.5rem",
              borderRadius: "8px",
              border: "1px solid #cbd5f5",
              fontSize: "0.875rem",
            }}
          >
            <option value="">All levels</option>
            {uniqueLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Filter by category..."
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: "0.5rem",
              borderRadius: "8px",
              border: "1px solid #cbd5f5",
              fontSize: "0.875rem",
            }}
          />

          <input
            type="date"
            placeholder="Start date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: "0.5rem",
              borderRadius: "8px",
              border: "1px solid #cbd5f5",
              fontSize: "0.875rem",
            }}
          />

          <input
            type="date"
            placeholder="End date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              padding: "0.5rem",
              borderRadius: "8px",
              border: "1px solid #cbd5f5",
              fontSize: "0.875rem",
            }}
          />
        </div>

        <div
          style={{
            marginTop: "0.75rem",
            fontSize: "0.875rem",
            color: "#64748b",
          }}
        >
          Showing {filteredIncidents.length} of {incidents.length} incidents
        </div>
      </div>

      {/* Table */}
      <section style={{ background: "white", borderRadius: "16px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.92rem" }}>
            <thead style={{ background: "#ecfeff" }}>
              <tr>
                {[
                  "Time",
                  "Student",
                  "Type",
                  "Level",
                  "Category",
                  "Location",
                  "Action",
                  "Class",
                ].map((h) => (
                  <th
                    key={h}
                    style={{ textAlign: "left", padding: "0.6rem 0.75rem", color: "#0f172a" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedIncidents.map((it) => (
                <tr key={it.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "0.55rem 0.75rem", whiteSpace: "nowrap" }}>
                    {new Date(it.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: "0.55rem 0.75rem" }}>{it.studentName}</td>
                  <td style={{ padding: "0.55rem 0.75rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        background:
                          it.type === "commendation" ? "#d1fae5" : "#fef3c7",
                        color: it.type === "commendation" ? "#065f46" : "#92400e",
                      }}
                    >
                      {it.type === "commendation" ? "✓" : "⚠"} {it.type}
                    </span>
                  </td>
                  <td style={{ padding: "0.55rem 0.75rem" }}>{it.level}</td>
                  <td style={{ padding: "0.55rem 0.75rem" }}>{it.category}</td>
                  <td style={{ padding: "0.55rem 0.75rem" }}>{it.location}</td>
                  <td style={{ padding: "0.55rem 0.75rem" }}>{it.actionTaken ?? ""}</td>
                  <td style={{ padding: "0.55rem 0.75rem" }}>
                    {it.classroom?.name ?? it.classCode ?? ""}
                  </td>
                </tr>
              ))}
              {paginatedIncidents.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "1rem", color: "#64748b", textAlign: "center" }}>
                    No incidents match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.5rem",
            padding: "1rem",
          }}
        >
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: "1px solid #cbd5f5",
              background: currentPage === 1 ? "#f1f5f9" : "white",
              color: currentPage === 1 ? "#94a3b8" : "#0f172a",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
            }}
          >
            Previous
          </button>
          <span style={{ color: "#64748b", fontSize: "0.875rem" }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: "1px solid #cbd5f5",
              background: currentPage === totalPages ? "#f1f5f9" : "white",
              color: currentPage === totalPages ? "#94a3b8" : "#0f172a",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
