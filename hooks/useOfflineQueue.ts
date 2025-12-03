import { useCallback, useEffect, useState } from "react";
import { flushQueue, getQueueCount, queueIncident } from "../lib/idb";

export type IncidentPayload = {
  type?: string;
  studentId: string;
  studentName: string;
  level: string;
  category: string;
  location: string;
  actionTaken?: string;
  note?: string;
  classCode?: string;
  device?: string;
  uuid: string;
  timestamp?: string;
};

export function useOfflineQueue() {
  const [queueCount, setQueueCount] = useState(0);

  const sendIncident = useCallback(async (payload: IncidentPayload) => {
    let response: Response;
    try {
      response = await fetch("/api/log-incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Network error while sending incident.",
      );
    }

    if (!response.ok) {
      let message = "Failed to send incident";
      try {
        const data = await response.json();
        if (data?.error) message = data.error;
      } catch {
        // ignore JSON parse failures
      }
      throw new Error(message);
    }
  }, []);

  const refreshQueueCount = useCallback(async () => {
    const count = await getQueueCount();
    setQueueCount(count);
  }, []);

  const processQueue = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.onLine) return;
    const { flushed } = await flushQueue(sendIncident);
    if (flushed > 0) {
      await refreshQueueCount();
      return flushed;
    }
    return 0;
  }, [refreshQueueCount, sendIncident]);

  const addToQueue = useCallback(async (incident: IncidentPayload) => {
    await queueIncident(incident);
    await refreshQueueCount();
  }, [refreshQueueCount]);

  // Initial load and event listeners
  useEffect(() => {
    refreshQueueCount();
    processQueue();

    const handleOnline = () => {
      processQueue();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        processQueue();
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [processQueue, refreshQueueCount]);

  return {
    queueCount,
    sendIncident,
    addToQueue,
    processQueue,
    refreshQueueCount,
  };
}
