"use client";

import { useEffect, useCallback, useId, type ReactNode, type HTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import styles from "./Modal.module.css";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  size = "md",
  closeOnBackdrop = true,
  closeOnEscape = true,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) {
        onClose();
      }
    },
    [onClose, closeOnEscape]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
    >
      <div
        className={styles.backdrop}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div className={cn(styles.modal, styles[size])}>
        {children}
      </div>
    </div>,
    document.body
  );
}

export interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function ModalHeader({
  className,
  children,
  onClose,
  showCloseButton = true,
  ...props
}: ModalHeaderProps) {
  return (
    <div className={cn(styles.header, className)} {...props}>
      <div className={styles.headerContent}>{children}</div>
      {showCloseButton && onClose && (
        <button
          type="button"
          onClick={onClose}
          className={styles.closeButton}
          aria-label="Close modal"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M15 5L5 15M5 5L15 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export interface ModalTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export function ModalTitle({ className, children, ...props }: ModalTitleProps) {
  return (
    <h2 className={cn(styles.title, className)} {...props}>
      {children}
    </h2>
  );
}

export interface ModalDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export function ModalDescription({ className, children, ...props }: ModalDescriptionProps) {
  return (
    <p className={cn(styles.description, className)} {...props}>
      {children}
    </p>
  );
}

export interface ModalBodyProps extends HTMLAttributes<HTMLDivElement> {}

export function ModalBody({ className, children, ...props }: ModalBodyProps) {
  return (
    <div className={cn(styles.body, className)} {...props}>
      {children}
    </div>
  );
}

export interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {}

export function ModalFooter({ className, children, ...props }: ModalFooterProps) {
  return (
    <div className={cn(styles.footer, className)} {...props}>
      {children}
    </div>
  );
}
