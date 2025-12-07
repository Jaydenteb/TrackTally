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
        return `Your account isn't allowed.${domainMsg}`;
      case "OAuthSignin":
      case "OAuthCallback":
      case "OAuthCreateAccount":
      case "OAuthAccountNotLinked":
      case "CallbackRouteError":
        return "Sign-in failed. Please try again.";
      case "Configuration":
        return "Authentication is not fully configured. Please try again later.";
      default:
        return "We couldn't sign you in. Please try again.";
    }
  }, [error, allowedDomain]);

  const handleSignIn = () => {
    void signIn("tebtally", { callbackUrl });
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
            After configuring authentication, revisit this page to sign in.
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
            Sign in with your TebTally account to continue.
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
        <button type="button" className={styles.button} onClick={handleSignIn} aria-label="Continue with TebTally">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span>Continue with TebTally</span>
          </span>
        </button>
        <p className={styles.subtitle}>
          Trouble signing in? Contact your school&apos;s admin.
        </p>
      </section>
    </main>
  );
}
