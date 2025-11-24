import "./globals.css";
import { ServiceWorkerRegister } from "../components/ServiceWorkerRegister";
import { AuthProvider } from "../components/AuthProvider";
import { SiteFooter } from "../components/SiteFooter";
import { BrandLogo } from "../components/BrandLogo";
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
              <header
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 20,
                  background: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(6px)",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    maxWidth: 1100,
                    margin: "0 auto",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <BrandLogo href="/" />
                  <nav style={{ display: "flex", gap: 12 }}>
                    <a href="/teacher" style={{ color: "#0f172a", textDecoration: "none", fontWeight: 600 }}>
                      Logger
                    </a>
                    <a href="/admin" style={{ color: "#0f172a", textDecoration: "none", fontWeight: 600 }}>
                      Admin
                    </a>
                    <a href="/super-admin" style={{ color: "#0f172a", textDecoration: "none", fontWeight: 600 }}>
                      Super Admin
                    </a>
                  </nav>
                </div>
              </header>
              {children}
              <SiteFooter />
            </PwaInstallProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
