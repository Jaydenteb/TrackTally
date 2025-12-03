"use client";

import Link from "next/link";
import styles from "./Footer.module.css";

export interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`${styles.footer} ${className ?? ""}`}>
      <div className={styles.container}>
        <p className={styles.copyright}>
          &copy; {currentYear} TebTally. All rights reserved.
        </p>
        <div className={styles.links}>
          <Link href="/privacy" className={styles.link}>
            Privacy Policy
          </Link>
          <Link href="/terms" className={styles.link}>
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
