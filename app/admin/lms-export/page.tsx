import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { LmsExportView } from "../../../components/admin/LmsExportView";
import { AdminLayoutWrapper } from "../../../components/admin/AdminLayoutWrapper";

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

export const metadata = {
  title: "LMS Export - TrackTally",
};

export default async function LmsExportPage({ searchParams }: Props) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role !== "admin" && session.user?.role !== "superadmin") {
    redirect("/");
  }

  const impersonatedDomain =
    session.user?.role === "superadmin" ? sanitizeDomain(searchParams?.impersonate) : null;
  const isSuperAdmin = session.user?.role === "superadmin";
  const userName = session.user?.name ?? session.user?.email ?? "Admin";

  return (
    <AdminLayoutWrapper
      userName={userName}
      isSuperAdmin={isSuperAdmin}
      impersonatedDomain={impersonatedDomain}
      hasLmsProvider={true}
    >
      <LmsExportView />
    </AdminLayoutWrapper>
  );
}
