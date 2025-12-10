"use client";

import { type ReactNode } from "react";
import { signOut } from "next-auth/react";
import { AppLayout } from "../layout/AppLayout";
import type { SidebarItem } from "../layout/SidebarNav";

export interface AdminLayoutWrapperProps {
  children: ReactNode;
  userName?: string;
  isSuperAdmin?: boolean;
  impersonatedDomain?: string | null;
  hasLmsProvider?: boolean;
}

export function AdminLayoutWrapper({
  children,
  userName,
  isSuperAdmin = false,
  impersonatedDomain,
  hasLmsProvider = false,
}: AdminLayoutWrapperProps) {
  const buildHref = (base: string) => {
    if (!impersonatedDomain) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}impersonate=${encodeURIComponent(impersonatedDomain)}`;
  };

  const navItems: SidebarItem[] = [
    {
      name: "Dashboard",
      href: buildHref("/admin"),
      icon: "LayoutDashboard",
    },
    {
      name: "Analytics",
      href: buildHref("/admin/analytics"),
      icon: "BarChart3",
    },
    {
      name: "View Incidents",
      href: buildHref("/admin/incidents"),
      icon: "ClipboardList",
    },
    ...(hasLmsProvider
      ? [
          {
            name: "LMS Export",
            href: buildHref("/admin/lms-export"),
            icon: "FileText" as const,
          },
        ]
      : []),
    {
      name: "Log Incident",
      href: "/teacher",
      icon: "GraduationCap",
    },
  ];

  // Add super admin link if applicable
  if (isSuperAdmin) {
    navItems.push({
      name: "Super Admin",
      href: "/super-admin",
      icon: "Shield",
    });
  }

  return (
    <AppLayout
      navItems={navItems}
      userName={userName}
      onSignOut={() => signOut({ callbackUrl: "/" })}
    >
      {children}
    </AppLayout>
  );
}
