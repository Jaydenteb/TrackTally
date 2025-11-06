import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { redirect } from "next/navigation";
import { getIncidentRetentionDays } from "../../../lib/settings";
import { IncidentControls } from "../../../components/admin/IncidentControls";

export const runtime = "nodejs";

export default async function AdminIncidentsPage() {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    redirect("/login?callbackUrl=/admin/incidents");
  }

  const incidents = await prisma.incident.findMany({
    orderBy: { timestamp: "desc" },
    take: 100,
    include: {
      student: true,
      classroom: true,
    },
  });
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
      <div style={{ width: "min(1100px, 100%)", display: "grid", gap: "1rem" }}>
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
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#0f172a" }}>Recent Incidents</h1>
          <nav style={{ display: "flex", gap: "0.5rem" }}>
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

        <section style={{ background: "white", borderRadius: "16px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.92rem" }}>
              <thead style={{ background: "#ecfeff" }}>
                <tr>
                  {[
                    "Time",
                    "Student",
                    "Level",
                    "Category",
                    "Location",
                    "Action",
                    "Class",
                    "By",
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
                {incidents.map((it) => (
                  <tr key={it.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "0.55rem 0.75rem", whiteSpace: "nowrap" }}>
                      {new Date(it.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: "0.55rem 0.75rem" }}>
                      {it.studentName}
                    </td>
                    <td style={{ padding: "0.55rem 0.75rem" }}>{it.level}</td>
                    <td style={{ padding: "0.55rem 0.75rem" }}>{it.category}</td>
                    <td style={{ padding: "0.55rem 0.75rem" }}>{it.location}</td>
                    <td style={{ padding: "0.55rem 0.75rem" }}>{it.actionTaken ?? ""}</td>
                    <td style={{ padding: "0.55rem 0.75rem" }}>
                      {it.classroom?.name ?? it.classCode ?? ""}
                    </td>
                    <td style={{ padding: "0.55rem 0.75rem" }}>{it.teacherEmail}</td>
                  </tr>
                ))}
                {incidents.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: "1rem", color: "#64748b" }}>
                      No incidents yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
