import { auth } from "../../auth";
import { redirect } from "next/navigation";
import { AdminDashboard } from "../../components/admin/AdminDashboard";

type Props = {
  searchParams?: {
    impersonate?: string;
  };
};

function sanitizeDomain(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.hostname.toLowerCase();
  } catch {
    return trimmed.replace(/^https?:\/\//, "").split("/")[0];
  }
}

export default async function AdminPage({ searchParams }: Props) {
  const session = await auth();
  const allowedDomain = process.env.ALLOWED_GOOGLE_DOMAIN ?? "your approved domain";

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role !== "admin" && session.user?.role !== "superadmin") {
    redirect("/");
  }

  const impersonatedDomain =
    session.user?.role === "superadmin" ? sanitizeDomain(searchParams?.impersonate) : null;
  const organizationName = session.user?.organizationName ?? null;
  const organizationDomain = session.user?.organizationDomain ?? allowedDomain;

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
      <AdminDashboard
        domain={organizationDomain}
        impersonatedDomain={impersonatedDomain}
        isSuperAdminView={session.user?.role === "superadmin"}
        initialOrganization={{
          name: impersonatedDomain ? null : organizationName,
          domain: impersonatedDomain ?? organizationDomain,
        }}
      />
    </main>
  );
}
