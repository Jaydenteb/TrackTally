"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";
import { SidebarNav, type SidebarItem } from "./SidebarNav";
import styles from "./MobileNav.module.css";

export interface MobileNavProps {
  items: SidebarItem[];
}

export function MobileNav({ items }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  return (
    <>
      {/* Hamburger Button - only visible on mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className={styles.menuButton}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
      >
        <Menu className={styles.menuIcon} />
      </button>

      {/* Mobile Navigation Drawer */}
      {mounted && isOpen && createPortal(
        <div className={styles.overlay} role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className={styles.backdrop}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div className={styles.drawer}>
            <div className={styles.drawerContent}>
              {/* Header */}
              <div className={styles.drawerHeader}>
                <BrandLogo />
                <button
                  onClick={() => setIsOpen(false)}
                  className={styles.closeButton}
                  aria-label="Close navigation menu"
                >
                  <X className={styles.closeIcon} />
                </button>
              </div>

              {/* Navigation Items */}
              <div className={styles.navWrapper}>
                <SidebarNav items={items} />
              </div>

              {/* Footer */}
              <div className={styles.drawerFooter}>
                <p className={styles.footerText}>
                  TrackTally helps schools monitor student behaviour and celebrate achievements.
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
