import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { Browser } from "@capacitor/browser";

const SERVER_BASE = "https://tracktally-staging.vercel.app";

declare global {
  interface Window {
    TrackTallyNative?: {
      startDictation: () => Promise<void> | void;
      stopDictation: () => Promise<void> | void;
      openAuthSession: () => Promise<void>;
    };
  }
}

const emit = (event: string, payload?: unknown) => {
  window.dispatchEvent(
    new CustomEvent("tracktally-native", {
      detail: { event, payload },
    }),
  );
};

async function ensureSpeechPermission() {
  const status = await SpeechRecognition.checkPermission();
  if (status.permission === "granted") return;
  await SpeechRecognition.requestPermission();
}

function supportsNativePlatform() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function openAuthSession() {
  const response = await fetch(`${SERVER_BASE}/api/mobile/auth/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ redirectPath: "/teacher" }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to start mobile auth.");
  }
  const data = await response.json();
  await Browser.open({
    url: data.authUrl,
    presentationStyle: "popover",
  });
}

async function startDictation() {
  if (!supportsNativePlatform()) return;
  await ensureSpeechPermission();
  SpeechRecognition.removeAllListeners();

  SpeechRecognition.addListener("partialResults", (result) => {
    const text = (result.matches && result.matches[0]) || "";
    emit("dictationPartial", text);
  });

  SpeechRecognition.addListener("result", (result) => {
    const text = (result.matches && result.matches[0]) || "";
    emit("dictationResult", text);
  });

  SpeechRecognition.addListener("error", (error: any) => {
    const message =
      typeof error?.message === "string" ? error.message : "Dictation error";
    emit("dictationError", message);
  });

  await SpeechRecognition.start({
    locale: "en-AU",
    partialResults: true,
    popup: false,
  });
}

async function stopDictation() {
  try {
    await SpeechRecognition.stop();
  } finally {
    SpeechRecognition.removeAllListeners();
  }
}

window.TrackTallyNative = {
  startDictation,
  stopDictation,
  openAuthSession,
};
