import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { authConfigured, missingAuthEnvVars } from "../../auth";

export default function LoginPage() {
  const allowedDomain = process.env.ALLOWED_GOOGLE_DOMAIN || "";
  return (
    <Suspense fallback={<div />}> 
      <LoginForm
        authConfigured={authConfigured}
        missingEnv={missingAuthEnvVars}
        allowedDomain={allowedDomain}
      />
    </Suspense>
  );
}
