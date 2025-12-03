"use client";

import { cn } from "@/lib/utils";
import styles from "./LoadingSpinner.module.css";

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "primary" | "white" | "muted";
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  color = "primary",
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(styles.spinner, styles[size], styles[color], className)}
      role="status"
      aria-label="Loading"
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle
          className={styles.track}
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className={styles.arc}
          d="M12 2C6.48 2 2 6.48 2 12"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
  children: React.ReactNode;
}

export function LoadingOverlay({ isLoading, text, children }: LoadingOverlayProps) {
  return (
    <div className={styles.overlayWrapper}>
      {children}
      {isLoading && (
        <div className={styles.overlay}>
          <div className={styles.overlayContent}>
            <LoadingSpinner size="lg" />
            {text && <p className={styles.overlayText}>{text}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
