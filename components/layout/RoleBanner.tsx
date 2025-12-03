"use client";

import { useState, useEffect } from "react";
import styles from "./RoleBanner.module.css";

interface RoleBannerProps {
  role: "teacher" | "admin" | "superadmin";
  organizationName?: string;
  organizationDomain?: string | null;
  isImpersonating?: boolean;
  availableOrganizations?: Array<{ id: string; name: string; domain: string }>;
  onOrganizationChange?: (domain: string) => void;
}

export function RoleBanner({
  role,
  organizationName,
  organizationDomain,
  isImpersonating = false,
  availableOrganizations = [],
  onOrganizationChange,
}: RoleBannerProps) {
  // Super admin viewing another school
  if (role === "superadmin" && isImpersonating && availableOrganizations.length > 0) {
    return (
      <div className={styles.superAdminBanner}>
        <div className={styles.bannerContent}>
          <span className={styles.icon}>🔍</span>
          <div className={styles.info}>
            <strong>Super Admin Mode</strong>
            <span className={styles.viewing}>
              Viewing: {organizationName} ({organizationDomain})
            </span>
          </div>
          {onOrganizationChange && availableOrganizations.length > 1 && (
            <select
              className={styles.orgSelector}
              value={organizationDomain || ""}
              onChange={(e) => onOrganizationChange(e.target.value)}
              aria-label="Switch organization"
            >
              {availableOrganizations.map((org) => (
                <option key={org.id} value={org.domain}>
                  {org.name} ({org.domain})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    );
  }

  // Regular admin or teacher - show subtle org info
  if (organizationName) {
    return (
      <div className={styles.orgBanner}>
        <div className={styles.bannerContent}>
          <span className={styles.roleLabel}>
            {role === "admin" ? "Admin Dashboard" : "Incident Logger"}
          </span>
          <span className={styles.separator}>•</span>
          <span className={styles.orgName}>{organizationName}</span>
          {organizationDomain && (
            <span className={styles.orgDomain}>({organizationDomain})</span>
          )}
        </div>
      </div>
    );
  }

  return null;
}
