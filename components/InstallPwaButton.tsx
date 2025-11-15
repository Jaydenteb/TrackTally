"use client";

import { useState } from "react";
import { usePwaInstall } from "./PwaInstallProvider";
import styles from "../app/page.module.css";

type InstallPwaButtonProps = {
  className?: string;
};

export function InstallPwaButton({ className }: InstallPwaButtonProps) {
  const { canInstall, requestInstall } = usePwaInstall();
  const [isPrompting, setIsPrompting] = useState(false);

  if (!canInstall) {
    return null;
  }

  const handleInstall = async () => {
    if (isPrompting) return;
    setIsPrompting(true);
    try {
      await requestInstall();
    } finally {
      setIsPrompting(false);
    }
  };

  const buttonClass = className ? `${styles.installButton} ${className}` : styles.installButton;

  return (
    <button type="button" className={buttonClass} onClick={handleInstall} disabled={isPrompting}>
      <span aria-hidden="true">⬇️</span>
      {isPrompting ? "Preparing..." : "Install app"}
    </button>
  );
}
