import { auth } from "../../auth";
import { redirect } from "next/navigation";
import { AdminDashboard } from "../../components/admin/AdminDashboard";
import { AdminLayoutWrapper } from "../../components/admin/AdminLayoutWrapper";

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
  const isSuperAdmin = session.user?.role === "superadmin";
  const userName = session.user?.name ?? session.user?.email ?? "Admin";

  return (
    <AdminLayoutWrapper
      userName={userName}
      userRole={isSuperAdmin ? "Super Admin" : "Admin"}
      isSuperAdmin={isSuperAdmin}
      impersonatedDomain={impersonatedDomain}
    >
      <AdminDashboard
        domain={organizationDomain}
        impersonatedDomain={impersonatedDomain}
        isSuperAdminView={isSuperAdmin}
        role={session.user?.role ?? "admin"}
        currentPath="/admin"
        initialOrganization={{
          name: impersonatedDomain ? null : organizationName,
          domain: impersonatedDomain ?? organizationDomain,
        }}
      />
    </AdminLayoutWrapper>
  );
}
