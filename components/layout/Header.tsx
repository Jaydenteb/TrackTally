"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MobileNav, type MobileNavProps } from "./MobileNav";
import { Button } from "@/components/ui/Button";
import styles from "./Header.module.css";

export interface HeaderProps {
  userName?: string;
  userRole?: string;
  navItems?: MobileNavProps["items"];
  onSignOut?: () => void;
  children?: ReactNode;
}

export function Header({
  userName,
  userRole,
  navItems = [],
  onSignOut,
  children,
}: HeaderProps) {
  return (
    <header className={cn("glass-panel", styles.header)}>
      <div className={styles.container}>
        {/* Mobile Nav Button */}
        {navItems.length > 0 && <MobileNav items={navItems} />}

        {/* Welcome Text */}
        <div className={styles.welcome}>
          <p className={styles.welcomeLabel}>Welcome back</p>
          <p className={styles.welcomeName}>{userName ?? "Teacher"}</p>
        </div>

        {/* Right side actions */}
        <div className={styles.actions}>
          {children}

          {/* Role Badge */}
          {userRole && (
            <span
              className={cn(
                styles.roleBadge,
                userRole.toLowerCase().includes("admin") && styles.adminBadge
              )}
            >
              {userRole}
            </span>
          )}

          {/* Sign Out */}
          {onSignOut && (
            <Button variant="ghost" size="sm" onClick={onSignOut}>
              Sign out
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
