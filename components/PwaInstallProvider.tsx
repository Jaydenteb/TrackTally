"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type InstallOutcome = "accepted" | "dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
};

type InstallContextValue = {
  canInstall: boolean;
  requestInstall: () => Promise<InstallOutcome | null>;
  dismissPrompt: () => void;
  isStandalone: boolean;
  isIosSafari: boolean;
};

const defaultContext: InstallContextValue = {
  canInstall: false,
  requestInstall: async () => null,
  dismissPrompt: () => {},
  isStandalone: false,
  isIosSafari: false,
};

const PwaInstallContext = createContext<InstallContextValue>(defaultContext);

const IOS_REGEX = /iphone|ipad|ipod/i;
const SAFARI_REGEX = /safari/i;
const OTHER_IOS_BROWSERS_REGEX = /crios|fxios|edgios/i;

const detectIosSafari = () => {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = IOS_REGEX.test(ua);
  if (!isIos) return false;
  const isSafari = SAFARI_REGEX.test(ua) && !OTHER_IOS_BROWSERS_REGEX.test(ua);
  return isSafari;
};

const detectStandalone = () => {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)")?.matches) return true;
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
};

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);

  useEffect(() => {
    setIsIosSafari(detectIosSafari());
    setIsStandalone(detectStandalone());

    const mediaQuery = window.matchMedia?.("(display-mode: standalone)");
    if (!mediaQuery) return;

    const handleChange = () => setIsStandalone(detectStandalone());

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
    };
  }, []);

  useEffect(() => {
    if (isStandalone && promptEvent) {
      setPromptEvent(null);
    }
  }, [isStandalone, promptEvent]);

  const requestInstall = useCallback(async () => {
    if (!promptEvent) return null;
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      return outcome;
    } finally {
      setPromptEvent(null);
    }
  }, [promptEvent]);

  const dismissPrompt = useCallback(() => setPromptEvent(null), []);

  const value = useMemo<InstallContextValue>(
    () => ({
      canInstall: Boolean(promptEvent) && !isStandalone,
      requestInstall,
      dismissPrompt,
      isStandalone,
      isIosSafari,
    }),
    [dismissPrompt, isStandalone, isIosSafari, promptEvent, requestInstall],
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export const usePwaInstall = () => useContext(PwaInstallContext);
