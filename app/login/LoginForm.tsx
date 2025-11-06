"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import styles from "./page.module.css";

type Props = {
  authConfigured: boolean;
  missingEnv: string[];
};

export function LoginForm({ authConfigured, missingEnv }: Props) {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";

  const handleSignIn = () => {
    void signIn("google", { callbackUrl });
  };

  if (!authConfigured) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <h1 className={styles.title}>TrackTally</h1>
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
          <h1 className={styles.title}>Sign in to TrackTally</h1>
          <p className={styles.subtitle}>
            Use your school Google Workspace account to continue. Only staff from the
            approved domain can access this pilot.
          </p>
        </header>
        <button type="button" className={styles.button} onClick={handleSignIn}>
          Continue with Google
        </button>
        <div className={styles.alert}>Access limited to your school Google Workspace.</div>
      </section>
    </main>
  );
}
