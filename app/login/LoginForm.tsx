"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import styles from "./page.module.css";

type Props = {
  authConfigured: boolean;
  missingEnv: string[];
  allowedDomain?: string;
};

export function LoginForm({ authConfigured, missingEnv, allowedDomain }: Props) {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const error = params.get("error") ?? "";

  const errorMessage = useMemo(() => {
    if (!error) return "";
    const domainMsg = allowedDomain
      ? ` This app is limited to staff from ${allowedDomain}.`
      : " Access is limited to approved domains.";
    switch (error) {
      case "AccessDenied":
        return `Your Google account isn't allowed.${domainMsg}`;
      case "OAuthSignin":
      case "OAuthCallback":
      case "OAuthCreateAccount":
      case "OAuthAccountNotLinked":
      case "CallbackRouteError":
        return "Google sign-in failed. Please try again.";
      case "Configuration":
        return "Authentication is not fully configured. Please try again later.";
      default:
        return "We couldn't sign you in. Please try again.";
    }
  }, [error, allowedDomain]);

  const handleSignIn = () => {
    void signIn("google", { callbackUrl });
  };

  if (!authConfigured) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <h1 className={styles.title}>TrackTally™</h1>
          <p className={styles.subtitle}>
            Authentication is not configured. Add these environment variables to
            `.env.local` and restart the dev server:
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.2rem",
              textAlign: "left",
              color: "#0f172a",
            }}
          >
            {missingEnv.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className={styles.subtitle}>
            After configuring Google OAuth, revisit this page to sign in.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header>
          <h1 className={styles.title}>Sign in to TrackTally™</h1>
          <p className={styles.subtitle}>
            Use your school Google Workspace account to continue.
            {allowedDomain ? (
              <> Only staff from <strong>{allowedDomain}</strong> can access.</>
            ) : (
              <> Access is limited to approved staff users.</>
            )}
          </p>
        </header>
        {errorMessage && (
          <div className={styles.alert} role="alert" aria-live="polite">
            {errorMessage}
          </div>
        )}
        <button type="button" className={styles.button} onClick={handleSignIn} aria-label="Continue with Google">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.61 20.083h-1.982V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.651-.39-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.542 16.25 18.851 14 24 14c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.734 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.176 0 9.899-1.986 13.463-5.221l-6.204-5.238C29.132 35.884 26.68 37 24 37c-5.202 0-9.62-3.315-11.273-7.945l-6.522 5.022C9.577 39.556 16.308 44 24 44z"/>
              <path fill="#1976D2" d="M43.61 20.083H24v8h11.303a12.01 12.01 0 0 1-4.044 5.458l6.204 5.238C39.084 36.48 44 31.333 44 24c0-1.341-.138-2.651-.39-3.917z"/>
            </svg>
            <span>Continue with Google</span>
          </span>
        </button>
        <p className={styles.subtitle}>
          Trouble signing in? Contact your school&apos;s admin.
        </p>
      </section>
    </main>
  );
}
