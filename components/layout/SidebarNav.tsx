"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Settings,
  BarChart3,
  FileText,
  Shield,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./SidebarNav.module.css";

const iconComponents: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  GraduationCap,
  Settings,
  BarChart3,
  FileText,
  Shield,
  ClipboardList,
};

export type SidebarIcon = keyof typeof iconComponents;

export interface SidebarItem {
  name: string;
  href: string;
  icon: SidebarIcon;
  badge?: string | number;
  disabled?: boolean;
}

export interface SidebarNavProps {
  items: SidebarItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      {items.map((item) => {
        const IconComponent = iconComponents[item.icon];
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        if (item.disabled) {
          return (
            <span
              key={item.href}
              className={cn(styles.link, styles.disabled)}
              aria-disabled="true"
            >
              {IconComponent && <IconComponent className={styles.icon} aria-hidden="true" />}
              <span className={styles.label}>{item.name}</span>
              {item.badge !== undefined && (
                <span className={styles.badge}>{item.badge}</span>
              )}
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(styles.link, isActive && styles.active)}
            aria-current={isActive ? "page" : undefined}
          >
            {IconComponent && <IconComponent className={styles.icon} aria-hidden="true" />}
            <span className={styles.label}>{item.name}</span>
            {item.badge !== undefined && (
              <span className={cn(styles.badge, isActive && styles.badgeActive)}>
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
