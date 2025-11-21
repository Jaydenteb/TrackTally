import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { getIncidentRetentionDays } from "../../../lib/settings";
import { IncidentControls } from "../../../components/admin/IncidentControls";
import { IncidentsList } from "../../../components/admin/IncidentsList";

export const runtime = "nodejs";

export default async function AdminIncidentsPage() {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    redirect("/login?callbackUrl=/admin/incidents");
  }

  const retentionDays = await getIncidentRetentionDays();

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "1.5rem",
        display: "flex",
        justifyContent: "center",
        background: "#f8fafc",
      }}
    >
      <div style={{ width: "min(1400px, 100%)", display: "grid", gap: "1rem" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "white",
            padding: "1rem 1.25rem",
            borderRadius: "16px",
            boxShadow: "0 25px 55px -40px rgba(15,23,42,0.35)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#0f172a" }}>Incidents</h1>
          <nav style={{ display: "flex", gap: "0.5rem" }}>
            <a
              href="/admin/analytics"
              style={{
                display: "inline-flex",
                padding: "0.55rem 0.85rem",
                borderRadius: "10px",
                border: "1px solid #0f766e",
                color: "#0f766e",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Analytics
            </a>
            <a
              href="/admin"
              style={{
                display: "inline-flex",
                padding: "0.55rem 0.85rem",
                borderRadius: "10px",
                border: "1px solid #0f766e",
                color: "#0f766e",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Admin Home
            </a>
          </nav>
        </header>

        <IncidentControls initialRetention={retentionDays} />

        <IncidentsList />
      </div>
    </main>
  );
}
