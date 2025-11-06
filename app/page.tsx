import { LoggerApp } from "../components/LoggerApp";
import { authConfigured, missingAuthEnvVars } from "../auth";

export default function HomePage() {
  return <LoggerApp authConfigured={authConfigured} missingEnv={missingAuthEnvVars} />;
}
