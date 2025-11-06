import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { authConfigured, missingAuthEnvVars } from "../../auth";

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}> 
      <LoginForm authConfigured={authConfigured} missingEnv={missingAuthEnvVars} />
    </Suspense>
  );
}
