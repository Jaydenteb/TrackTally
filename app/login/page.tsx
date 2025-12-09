import { redirect } from "next/navigation";
import { auth, signIn, authConfigured, missingAuthEnvVars } from "../../auth";

async function handleSignIn(callbackUrl: string) {
  "use server";
  await signIn("tebtally", { redirectTo: callbackUrl });
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  // Show configuration error if auth is not configured
  if (!authConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
          <h1 className="text-2xl font-bold text-center mb-4">TrackTally</h1>
          <p className="text-gray-600 text-center mb-4">
            Authentication is not configured. Missing environment variables:
          </p>
          <ul className="list-disc pl-5 mb-4">
            {missingAuthEnvVars.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  const session = await auth();

  // If already authenticated, redirect to home
  if (session?.user) {
    redirect("/teacher");
  }

  // Get the callback URL from search params
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/teacher";

  // If there's an error, show error message instead of auto-redirect
  if (params.error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
          <h1 className="text-2xl font-bold text-center mb-4">TrackTally</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700 text-center">
              {params.error === "AccessDenied"
                ? "Your account isn't allowed. Access is limited to approved domains."
                : "Sign-in failed. Please try again."}
            </p>
          </div>
          <form action={handleSignIn.bind(null, callbackUrl)}>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Auto-submit form to trigger signin via Server Action
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow text-center">
        <h1 className="text-2xl font-bold mb-4">TrackTally</h1>
        <p className="text-gray-600 mb-4">Redirecting to sign in...</p>
        <form action={handleSignIn.bind(null, callbackUrl)}>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            Click here if not redirected
          </button>
        </form>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.forms[0].requestSubmit()`,
          }}
        />
      </div>
    </main>
  );
}
