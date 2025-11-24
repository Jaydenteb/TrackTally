import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { StudentProfile } from "../../../../components/admin/StudentProfile";

type Props = {
  params: {
    id: string;
  };
};

export default async function StudentProfilePage({ params }: Props) {
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
        background: "#f1f5f9",
        padding: "2.5rem 1.5rem 3rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "min(1200px, 100%)" }}>
        <StudentProfile studentId={params.id} />
      </div>
    </main>
  );
}
