"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // Ensure any dev SWs are cleaned up so stale caches don't cause 404s.
      navigator.serviceWorker?.getRegistrations?.().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      return;
    }

    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw");
      } catch (error) {
        console.error("Service worker registration failed", error);
      }
    };

    register();
  }, []);

  return null;
}
