import "./globals.css";
import { ServiceWorkerRegister } from "../components/ServiceWorkerRegister";
import { AuthProvider } from "../components/AuthProvider";
import type { Metadata } from "next";

const APP_NAME = "TrackTally";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Quickly log student behaviour incidents to TrackTally.",
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0d9488" />
      </head>
      <body>
        <AuthProvider>
          <ServiceWorkerRegister />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
