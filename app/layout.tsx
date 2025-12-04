import "./globals.css";
import { ServiceWorkerRegister } from "../components/ServiceWorkerRegister";
import { AuthProvider } from "../components/AuthProvider";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { PwaInstallProvider } from "../components/PwaInstallProvider";
import type { Metadata } from "next";

const APP_NAME = "TrackTally™";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Quickly log student behaviour incidents to TrackTally™.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0d9488" />
        <meta name="application-name" content={APP_NAME} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content={APP_NAME} />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
      </head>
      <body>
        <ErrorBoundary>
          <AuthProvider>
            <PwaInstallProvider>
              <ServiceWorkerRegister />
              {children}
            </PwaInstallProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
