"use client";

import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { type SidebarItem } from "./SidebarNav";
import styles from "./AppLayout.module.css";

export interface AppLayoutProps {
  children: ReactNode;
  navItems: SidebarItem[];
  userName?: string;
  userRole?: string;
  onSignOut?: () => void;
  showSidebar?: boolean;
  showFooter?: boolean;
  headerChildren?: ReactNode;
}

export function AppLayout({
  children,
  navItems,
  userName,
  userRole,
  onSignOut,
  showSidebar = true,
  showFooter = true,
  headerChildren,
}: AppLayoutProps) {
  return (
    <div className={styles.layout}>
      {showSidebar && <Sidebar items={navItems} />}
      <div className={styles.main}>
        <Header
          userName={userName}
          userRole={userRole}
          navItems={navItems}
          onSignOut={onSignOut}
        >
          {headerChildren}
        </Header>
        <main className={styles.content}>
          <div className={styles.container}>{children}</div>
        </main>
        {showFooter && <Footer />}
      </div>
    </div>
  );
}
