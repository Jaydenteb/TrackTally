"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { MetricCard } from "./MetricCard";

type SummaryData = {
  totalIncidents: number;
  last7Days: number;
  previous7Days: number;
  weekOverWeekChange: string;
  uniqueStudents: number;
  avgPerStudent: string;
  incidentsByType: Array<{ type: string; count: number }>;
  incidentsByLevel: Array<{ level: string; count: number }>;
};

type TimelineData = Array<{
  date: string;
  dateLabel: string;
  total: number;
  incident: number;
  commendation: number;
}>;

type TopItemsData = {
  topCategories: Array<{ name: string; count: number }>;
  topLocations: Array<{ name: string; count: number }>;
};

const COLORS = ["#6d3cff", "#33d0f5", "#7a58ff", "#23e6e0", "#ff9d6c"];

export function AnalyticsDashboard() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [timeline, setTimeline] = useState<TimelineData>([]);
  const [topItems, setTopItems] = useState<TopItemsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        setError(null);

        const [summaryRes, timelineRes, topItemsRes] = await Promise.all([
          fetch("/api/admin/analytics/summary", { cache: "no-store" }),
          fetch("/api/admin/analytics/timeline?days=30", { cache: "no-store" }),
          fetch("/api/admin/analytics/top-items?limit=5", { cache: "no-store" }),
        ]);

        if (!summaryRes.ok || !timelineRes.ok || !topItemsRes.ok) {
          throw new Error("Failed to fetch analytics data");
        }

        const [summaryData, timelineData, topItemsData] = await Promise.all([
          summaryRes.json(),
          timelineRes.json(),
          topItemsRes.json(),
        ]);

        setSummary(summaryData.data);
        setTimeline(timelineData.data);
        setTopItems(topItemsData.data);
      } catch (err) {
        console.error("Analytics load error:", err);
        setError("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }

    void loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
        Loading analytics...
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
          margin: "2rem",
        }}
      >
        {error}
      </div>
    );
  }

  if (!summary || !topItems) {
    return null;
  }

  const weekChange = parseInt(summary.weekOverWeekChange, 10);
  const isIncrease = weekChange > 0;

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: "1.9rem", color: "#0f172a" }}>
          Analytics Dashboard
        </h1>
        <p style={{ margin: "0.5rem 0 0", color: "#475569" }}>
          Behavior insights for your organization (last 30 days)
        </p>
      </div>

      {/* Key Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <MetricCard
          title="Total Incidents"
          value={summary.totalIncidents}
          subtitle="Last 30 days"
        />
        <MetricCard
          title="This Week"
          value={summary.last7Days}
          subtitle="Last 7 days"
          trend={`${Math.abs(weekChange)}% vs previous week`}
          trendUp={isIncrease}
        />
        <MetricCard
          title="Students"
          value={summary.uniqueStudents}
          subtitle="With incidents"
        />
        <MetricCard
          title="Avg per Student"
          value={summary.avgPerStudent}
          subtitle="Incidents per student"
        />
      </div>

      {/* Incidents Over Time */}
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "1.5rem",
          boxShadow: "0 6px 20px rgba(24, 34, 72, 0.12)",
        }}
      >
        <h2 style={{ margin: "0 0 1rem", fontSize: "1.25rem", color: "#0f172a" }}>
          Incidents Over Time
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dateLabel" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="incident"
              stroke="#6d3cff"
              strokeWidth={2}
              name="Incidents"
            />
            <Line
              type="monotone"
              dataKey="commendation"
              stroke="#10b981"
              strokeWidth={2}
              name="Commendations"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Two column layout for charts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {/* Incidents by Level */}
        <div
          style={{
            background: "white",
            borderRadius: "20px",
            padding: "1.5rem",
            boxShadow: "0 6px 20px rgba(24, 34, 72, 0.12)",
          }}
        >
          <h2 style={{ margin: "0 0 1rem", fontSize: "1.25rem", color: "#0f172a" }}>
            Incidents by Level
          </h2>
          {summary.incidentsByLevel.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={summary.incidentsByLevel}
                  dataKey="count"
                  nameKey="level"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {summary.incidentsByLevel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: "#94a3b8", textAlign: "center", padding: "2rem 0" }}>
              No data available
            </p>
          )}
        </div>

        {/* Top Categories */}
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
          {topItems.topCategories.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topItems.topCategories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#94a3b8"
                  fontSize={12}
                  width={120}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#33d0f5" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: "#94a3b8", textAlign: "center", padding: "2rem 0" }}>
              No data available
            </p>
          )}
        </div>

        {/* Top Locations */}
        <div
          style={{
            background: "white",
            borderRadius: "20px",
            padding: "1.5rem",
            boxShadow: "0 6px 20px rgba(24, 34, 72, 0.12)",
          }}
        >
          <h2 style={{ margin: "0 0 1rem", fontSize: "1.25rem", color: "#0f172a" }}>
            Top Locations
          </h2>
          {topItems.topLocations.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topItems.topLocations} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#94a3b8"
                  fontSize={12}
                  width={120}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#7a58ff" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: "#94a3b8", textAlign: "center", padding: "2rem 0" }}>
              No data available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
