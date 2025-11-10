import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { SuperAdminDashboard } from "../../components/SuperAdmin/SuperAdminDashboard";

export default async function SuperAdminPage() {
  const session = await auth();
  if (!session || session.user?.role !== "superadmin") {
    redirect("/");
  }
  return (
    <main style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
      <SuperAdminDashboard />
    </main>
  );
}
