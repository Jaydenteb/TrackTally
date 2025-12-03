"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { SidebarNav, type SidebarItem } from "./SidebarNav";
import styles from "./Sidebar.module.css";

export interface SidebarProps {
  items: SidebarItem[];
  subscriptionStatus?: string;
}

export function Sidebar({ items, subscriptionStatus }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <BrandLogo />
      </div>
      <p className={styles.tagline}>
        Track student behaviour and celebrate achievements across your school.
      </p>
      <div className={styles.navWrapper}>
        <SidebarNav items={items} />
      </div>
      <div className={styles.footer}>
        <p className={styles.footerTitle}>Status</p>
        <p className={styles.footerStatus}>
          {subscriptionStatus ?? "Active"}
        </p>
      </div>
    </aside>
  );
}
