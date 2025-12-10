"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const callbackUrl = searchParams.get("callbackUrl") || "/teacher";
  const error = searchParams.get("error");
  const refresh = searchParams.get("refresh");

  // Loading state for sign-in button
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Ref to prevent duplicate navigation
  const hasNavigated = useRef(false);

  // Only auto-redirect if ALREADY authenticated (no signIn trigger)
  // Use window.location.href for hard redirect to avoid React state issues
  useEffect(() => {
    if (status === "authenticated" && session?.user && !hasNavigated.current) {
      hasNavigated.current = true;
      window.location.href = callbackUrl;
    }
  }, [status, session, callbackUrl]);

  // Handle refresh=1 case (from trial/upgrade flow) - this IS auto
  useEffect(() => {
    if (refresh === "1" && status === "unauthenticated") {
      signIn("tebtally", { callbackUrl });
    }
  }, [refresh, status, callbackUrl]);

  const handleSignIn = () => {
    setIsSigningIn(true);
    signIn("tebtally", { callbackUrl });
  };

  // Loading state
  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow text-center">
          <h1 className="text-2xl font-bold mb-4">TrackTally</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
          <h1 className="text-2xl font-bold text-center mb-4">TrackTally</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-center">
              {error === "AccessDenied"
                ? "Your account isn't allowed. Access is limited to approved domains."
                : "Sign-in failed. Please try again."}
            </p>
          </div>
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className={`w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 ${
              isSigningIn ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isSigningIn ? "Signing in..." : "Try Again"}
          </button>
        </div>
      </main>
    );
  }

  // Authenticated - show redirecting (auto-redirect handles this)
  if (status === "authenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow text-center">
          <h1 className="text-2xl font-bold mb-4">TrackTally</h1>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </main>
    );
  }

  // Unauthenticated - show sign-in button (NO auto-trigger)
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow text-center">
        <h1 className="text-2xl font-bold mb-4">TrackTally</h1>
        <p className="text-gray-600 mb-6">Sign in to continue</p>
        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className={`w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 ${
            isSigningIn ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isSigningIn ? "Signing in..." : "Sign in with TebTally"}
        </button>
      </div>
    </main>
  );
}

function LoadingFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow text-center">
        <h1 className="text-2xl font-bold mb-4">TrackTally</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginContent />
    </Suspense>
  );
}
