import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { LmsExportView } from "../../../components/admin/LmsExportView";

export const metadata = {
  title: "LMS Export - TrackTally",
};

export default async function LmsExportPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role !== "admin" && session.user?.role !== "superadmin") {
    redirect("/");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fafc 0%, #e0f2fe 100%)",
        padding: "2rem 1rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <LmsExportView />
    </main>
  );
}
