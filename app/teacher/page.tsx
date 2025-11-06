import { LoggerApp } from "../../components/LoggerApp";
import { authConfigured, missingAuthEnvVars } from "../../auth";

export default function TeacherLoggerPage() {
  return (
    <LoggerApp
      authConfigured={authConfigured}
      missingEnv={missingAuthEnvVars}
      redirectAdmin={false}
    />
  );
}
