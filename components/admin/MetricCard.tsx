type MetricCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
};

export function MetricCard({ title, value, subtitle, trend, trendUp }: MetricCardProps) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "20px",
        padding: "1.5rem",
        boxShadow: "0 6px 20px rgba(24, 34, 72, 0.12)",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#64748b" }}>
        {title}
      </div>
      <div style={{ fontSize: "2rem", fontWeight: 700, color: "#0f172a" }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: "0.875rem", color: "#94a3b8" }}>
          {subtitle}
        </div>
      )}
      {trend && (
        <div
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: trendUp ? "#ef4444" : "#10b981",
          }}
        >
          {trendUp ? "↑" : "↓"} {trend}
        </div>
      )}
    </div>
  );
}
