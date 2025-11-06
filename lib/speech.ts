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
  }
}

export function startDictation({
  onResult,
  onError,
}: DictationCallbacks): DictationController {
  if (typeof window === "undefined") return null;

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
