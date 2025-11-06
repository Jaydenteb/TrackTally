import { auth } from "../../auth";
import { redirect } from "next/navigation";
import { AdminDashboard } from "../../components/admin/AdminDashboard";

export default async function AdminPage() {
  const session = await auth();
  const allowedDomain = process.env.ALLOWED_GOOGLE_DOMAIN ?? "your approved domain";

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role !== "admin") {
    redirect("/");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        padding: "2.5rem 1.5rem 3rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <AdminDashboard domain={allowedDomain} />
    </main>
  );
}
