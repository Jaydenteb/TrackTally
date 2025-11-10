"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

type Props = {
  state: string | null;
};

export function MobileAuthLauncher({ state }: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state) {
      setError("Missing state parameter.");
      return;
    }
    const callbackParams = new URLSearchParams({ state });
    const callbackUrl = `/api/mobile/auth/finish?${callbackParams.toString()}`;

    const timer = setTimeout(() => {
      void signIn("google", { callbackUrl }).catch((err) => {
        setError(err instanceof Error ? err.message : "Could not start sign-in.");
      });
    }, 10);

    return () => clearTimeout(timer);
  }, [state]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <section
        style={{
          maxWidth: 360,
          width: "100%",
          textAlign: "center",
          padding: "2rem",
          borderRadius: "1rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 35px rgba(15, 23, 42, 0.08)",
          backgroundColor: "#fff",
        }}
      >
        <h1 style={{ marginBottom: "0.75rem", fontSize: "1.5rem" }}>TrackTally</h1>
        {error ? (
          <>
            <p style={{ marginBottom: "1rem", color: "#b91c1c" }}>{error}</p>
            <p style={{ fontSize: "0.95rem", color: "#475569" }}>
              Close this window and try launching sign-in again from the TrackTally app.
            </p>
          </>
        ) : (
          <>
            <p style={{ marginBottom: "1rem", color: "#475569" }}>Opening Google sign-in…</p>
            <p style={{ fontSize: "0.95rem", color: "#94a3b8" }}>
              If nothing happens, close this tab and restart from the TrackTally mobile app.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
