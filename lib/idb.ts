"use client";

import { IDBPDatabase, openDB } from "idb";

const DB_NAME = "tracktally";
const STORE_NAME = "offline-incidents";
const DB_VERSION = 1;

type IncidentPayload = {
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

type TrackTallyDB = {
  [STORE_NAME]: {
    key: string;
    value: IncidentPayload;
  };
};

let dbPromise: Promise<IDBPDatabase<TrackTallyDB>> | null = null;

function ensureBrowser() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

async function getDb() {
  if (!ensureBrowser()) throw new Error("IndexedDB is not available.");

  if (!dbPromise) {
    dbPromise = openDB<TrackTallyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }

  return dbPromise;
}

export async function queueIncident(payload: IncidentPayload) {
  if (!ensureBrowser()) return;
  const db = await getDb();
  await db.put(STORE_NAME, payload, payload.uuid);
}

export async function getQueueCount(): Promise<number> {
  if (!ensureBrowser()) return 0;
  const db = await getDb();
  return (await db.getAllKeys(STORE_NAME)).length;
}

export async function flushQueue(
  sender: (payload: IncidentPayload) => Promise<void>,
): Promise<{ flushed: number; failed: number }> {
  if (!ensureBrowser()) return { flushed: 0, failed: 0 };
  const db = await getDb();
  const allKeys = await db.getAllKeys(STORE_NAME);
  let flushed = 0;
  let failed = 0;

  for (const key of allKeys) {
    const stringKey = String(key);
    const payload = await db.get(STORE_NAME, stringKey);
    if (!payload) continue;

    try {
      await sender(payload);
      await db.delete(STORE_NAME, stringKey);
      flushed += 1;
    } catch (error) {
      console.error("Failed to flush queued incident", error);
      failed += 1;
    }
  }

  return { flushed, failed };
}
