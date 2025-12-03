"use client";

import { useId } from "react";
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from "./Modal";
import { Button } from "./Button";
import styles from "./ConfirmDialog.module.css";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnBackdrop={!isLoading}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <ModalHeader onClose={onClose} showCloseButton={!isLoading}>
        <div className={styles.iconWrapper}>
          {variant === "danger" && (
            <div className={styles.dangerIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 9V13M12 17H12.01M12 3L2 21H22L12 3Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
          {variant === "warning" && (
            <div className={styles.warningIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>
        <ModalTitle id={titleId}>{title}</ModalTitle>
        {description && <ModalDescription id={descriptionId}>{description}</ModalDescription>}
      </ModalHeader>
      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          variant={variant === "danger" ? "danger" : "primary"}
          onClick={handleConfirm}
          disabled={isLoading}
        >
          {isLoading ? "Please wait..." : confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
