"use client";

type DictationCallbacks = {
  onResult: (text: string) => void;
  onError: (error: string) => void;
};

type DictationController = {
  stop: () => void;
} | null;

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
    TrackTallyNative?: {
      startDictation: () => Promise<void> | void;
      stopDictation?: () => Promise<void> | void;
    };
  }
}

type NativeEventDetail = {
  event: "dictationPartial" | "dictationResult" | "dictationError";
  payload?: string;
};

function supportsNativeDictation() {
  return typeof window !== "undefined" && !!window.TrackTallyNative?.startDictation;
}

function startNativeDictation(callbacks: DictationCallbacks): DictationController {
  if (!supportsNativeDictation()) return null;
  const handler = (event: Event) => {
    if (!(event instanceof CustomEvent)) return;
    const detail = event.detail as NativeEventDetail;
    if (!detail || typeof detail.event !== "string") return;
    if (detail.event === "dictationResult") {
      const text = typeof detail.payload === "string" ? detail.payload.trim() : "";
      if (text) {
        callbacks.onResult(text);
      }
      return;
    }
    if (detail.event === "dictationError") {
      const message =
        typeof detail.payload === "string" && detail.payload.trim()
          ? detail.payload.trim()
          : "Dictation error";
      callbacks.onError(message);
    }
  };

  window.addEventListener("tracktally-native", handler as EventListener);

  try {
    const result = window.TrackTallyNative?.startDictation();
    if (result instanceof Promise) {
      result.catch((error) => {
        window.removeEventListener("tracktally-native", handler as EventListener);
        callbacks.onError(
          error instanceof Error ? error.message : "Unable to start dictation.",
        );
      });
    }
  } catch (error) {
    window.removeEventListener("tracktally-native", handler as EventListener);
    callbacks.onError(error instanceof Error ? error.message : "Unable to start dictation.");
    return null;
  }

  return {
    stop: () => {
      window.removeEventListener("tracktally-native", handler as EventListener);
      try {
        const stopResult = window.TrackTallyNative?.stopDictation?.();
        if (stopResult instanceof Promise) {
          stopResult.catch(() => {});
        }
      } catch {
        // ignore stop errors
      }
    },
  };
}

export function startDictation({
  onResult,
  onError,
}: DictationCallbacks): DictationController {
  if (typeof window === "undefined") return null;

  const nativeController = startNativeDictation({ onResult, onError });
  if (nativeController) {
    return nativeController;
  }

  const RecognitionCtor =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!RecognitionCtor) {
    onError("Speech recognition is not supported on this device.");
    return null;
  }

  const recognition: any = new RecognitionCtor();
  recognition.lang = "en-AU";
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 3;

  let captured = false;

  recognition.onresult = (event: any) => {
    const alternatives = event?.results?.[0];
    if (!alternatives) return;

    let best = "";
    let bestConfidence = -1;
    for (const alternative of alternatives) {
      const transcript = alternative?.transcript?.trim();
      const confidence =
        typeof alternative?.confidence === "number" ? alternative.confidence : 0;
      if (transcript && confidence >= bestConfidence) {
        best = transcript;
        bestConfidence = confidence;
      }
    }

    if (best) {
      captured = true;
      onResult(best);
    }
  };

  recognition.onerror = (event: any) => {
    const code = event?.error;
    if (code === "no-speech" || code === "aborted") {
      onError("No speech detected. Try again.");
    } else {
      onError(code ?? "Dictation error");
    }
  };

  recognition.onend = () => {
    if (!captured) {
      onError("No speech detected. Try again.");
    }
  };

  try {
    recognition.start();
  } catch (error) {
    onError(error instanceof Error ? error.message : "Could not start dictation");
    return null;
  }

  return {
    stop: () => recognition.stop(),
  };
}
