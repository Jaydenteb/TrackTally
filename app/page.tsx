import Link from "next/link";
import { auth } from "../auth";

type Role = "teacher" | "admin" | "superadmin";

function getDashboardPath(role: Role | undefined): string {
  if (role === "superadmin") return "/super-admin";
  if (role === "admin") return "/admin";
  return "/teacher";
}

export default async function HomePage() {
  const session = await auth();
  const role = (session?.user as any)?.role as Role | undefined;
  const isAuthenticated = !!session;

  const dashboardPath = getDashboardPath(role);

  const primaryCtaHref = isAuthenticated ? dashboardPath : "/teacher";
  const primaryCtaLabel = isAuthenticated ? "Go to your dashboard" : "Open the incident logger";

  const secondaryCtaHref = "/login";
  const secondaryCtaLabel = isAuthenticated
    ? "Switch account"
    : "Sign in with your school Google account";

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "3rem 1.25rem 4rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background:
          "radial-gradient(circle at top left, rgba(109, 60, 255, 0.12) 0%, rgba(51, 208, 245, 0.15) 40%, rgba(255, 255, 255, 0.6) 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          display: "flex",
          flexDirection: "column",
          gap: "3.5rem",
        }}
      >
        {/* Hero */}
        <section
          aria-labelledby="hero-heading"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.7fr) minmax(0, 1.3fr)",
            gap: "2.5rem",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.35rem 0.85rem",
                borderRadius: 999,
                background:
                  "linear-gradient(120deg, rgba(51,208,245,0.18), rgba(109,60,255,0.18))",
                color: "#0f172a",
                fontSize: "0.78rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                width: "fit-content",
              }}
            >
              <span>TrackTally™</span>
              <span style={{ opacity: 0.7 }}>Behaviour incident logging</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <h1
                id="hero-heading"
                style={{
                  margin: 0,
                  fontSize: "2.1rem",
                  lineHeight: 1.1,
                  fontWeight: 700,
                  color: "#0b1220",
                }}
              >
                Weekly behaviour tracking for busy classrooms that takes seconds, not minutes.
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  lineHeight: 1.6,
                  color: "#42557a",
                  maxWidth: "36rem",
                }}
              >
                TrackTally™ is a mobile-first incident logger for schools. Teachers tap a student,
                choose a level and category, optionally dictate a note, and it syncs straight to
                Google Sheets and a secure database for reporting.
              </p>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginTop: "0.25rem",
              }}
            >
              <Link
                href={primaryCtaHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  padding: "0.75rem 1.4rem",
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(135deg, #0f766e, #14b8a6)",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "0.98rem",
                  textDecoration: "none",
                  boxShadow: "0 12px 30px -20px rgba(13, 148, 136, 0.9)",
                }}
              >
                {primaryCtaLabel}
              </Link>
              <Link
                href={secondaryCtaHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  padding: "0.7rem 1.3rem",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.35)",
                  background: "rgba(255,255,255,0.9)",
                  color: "#0f172a",
                  fontWeight: 500,
                  fontSize: "0.95rem",
                  textDecoration: "none",
                }}
              >
                {secondaryCtaLabel}
              </Link>
            </div>
            <p
              style={{
                margin: "0.75rem 0 0",
                fontSize: "0.85rem",
                color: "#64748b",
              }}
            >
              Access is restricted to approved school Google Workspace domains. To onboard a new
              school or request access, email{" "}
              <a
                href="mailto:support@spelltally.com"
                style={{ color: "#0f766e", textDecoration: "underline" }}
              >
                support@spelltally.com
              </a>
              .
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
              padding: "1.3rem 1.4rem",
              borderRadius: 24,
              background: "rgba(255,255,255,0.9)",
              boxShadow: "0 18px 40px -28px rgba(15,23,42,0.45)",
              border: "1px solid rgba(148,163,184,0.35)",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              Built for real classrooms
            </h2>
            <ul
              style={{
                margin: 0,
                paddingLeft: "1.1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
                fontSize: "0.95rem",
                color: "#475569",
              }}
            >
              <li>Tap‑first logger UI with bulk student selection and quick level/category chips.</li>
              <li>Offline queueing so incidents aren&apos;t lost when Wi‑Fi drops out.</li>
              <li>
                Admin console for classes, rosters, teacher access, and school‑specific incident
                options.
              </li>
              <li>Incidents write to both Google Sheets and a Postgres database for reliable history.</li>
            </ul>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          aria-labelledby="features-heading"
          style={{
            padding: "2.5rem 1.25rem",
            borderRadius: 24,
            background: "rgba(255,255,255,0.92)",
            boxShadow: "0 20px 45px -32px rgba(15,23,42,0.55)",
          }}
        >
          <div
            style={{
              maxWidth: 960,
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <h2
                id="features-heading"
                style={{
                  margin: 0,
                  fontSize: "1.6rem",
                  fontWeight: 700,
                  color: "#0b1220",
                }}
              >
                Features for teachers and school leaders
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.98rem",
                  color: "#42557a",
                  maxWidth: "40rem",
                }}
              >
                TrackTally is opinionated enough to stay fast in the classroom, but flexible enough
                for different school behaviour policies.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "1.25rem",
                marginTop: "0.75rem",
              }}
            >
              {[
                {
                  title: "Teacher-first workflows",
                  body: "Open straight to your current class, tap a student, choose a level and category, and you’re done in under 30 seconds.",
                },
                {
                  title: "Admin console for rosters",
                  body: "Create and archive classes, import CSVs, assign homeroom and specialist teachers, and manage student details from one place.",
                },
                {
                  title: "Offline and mobile friendly",
                  body: "Works on phones and tablets with indexed offline storage and automatic retry when connectivity returns.",
                },
                {
                  title: "Data you can trust",
                  body: "Every incident is stored in a database and appended to Google Sheets so you can audit, export, and analyse over time.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  style={{
                    padding: "1.1rem 1.1rem",
                    borderRadius: 18,
                    background: "#f8fafc",
                    border: "1px solid rgba(148,163,184,0.4)",
                    boxShadow: "0 6px 18px -14px rgba(15,23,42,0.35)",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "#0f172a",
                    }}
                  >
                    {card.title}
                  </h3>
                  <p
                    style={{
                      margin: "0.55rem 0 0",
                      fontSize: "0.92rem",
                      color: "#475569",
                      lineHeight: 1.5,
                    }}
                  >
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section
          id="integrations"
          aria-labelledby="integrations-heading"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          <div>
            <h2
              id="integrations-heading"
              style={{
                margin: 0,
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "#0b1220",
              }}
            >
              Google Workspace & Sheets integration
            </h2>
            <p
              style={{
                margin: "0.4rem 0 0",
                fontSize: "0.96rem",
                color: "#42557a",
                maxWidth: "40rem",
              }}
            >
              TrackTally uses Google authentication and a dedicated Sheets integration so incidents
              stay tied to your existing school tools without extra logins.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1.25rem",
            }}
          >
            <div
              style={{
                padding: "1.1rem 1.2rem",
                borderRadius: 18,
                background: "#ffffff",
                border: "1px solid rgba(148,163,184,0.45)",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                Scopes requested
              </h3>
              <ul
                style={{
                  margin: "0.55rem 0 0",
                  paddingLeft: "1.1rem",
                  fontSize: "0.9rem",
                  color: "#475569",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                }}
              >
                <li>Google sign‑in via OAuth with domain restriction per school.</li>
                <li>Service account access to a single incident log spreadsheet.</li>
                <li>No access to student emails or classroom content beyond what you configure.</li>
              </ul>
            </div>

            <div
              style={{
                padding: "1.1rem 1.2rem",
                borderRadius: 18,
                background: "#ffffff",
                border: "1px solid rgba(148,163,184,0.45)",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                Data handling
              </h3>
              <ul
                style={{
                  margin: "0.55rem 0 0",
                  paddingLeft: "1.1rem",
                  fontSize: "0.9rem",
                  color: "#475569",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                }}
              >
                <li>Incidents are stored in Postgres and mirrored into Google Sheets.</li>
                <li>
                  Each school is isolated by organization; teachers only access their own classes.
                </li>
                <li>You can revoke API access at any time from your Google admin console.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Privacy & Security */}
        <section
          id="security"
          aria-labelledby="security-heading"
          style={{
            padding: "2.25rem 1.25rem 2.5rem",
            borderRadius: 24,
            background: "#0f172a",
            color: "#e2e8f0",
          }}
        >
          <div
            style={{
              maxWidth: 960,
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: "1.75rem",
            }}
          >
            <div>
              <h2
                id="security-heading"
                style={{
                  margin: 0,
                  fontSize: "1.6rem",
                  fontWeight: 700,
                  color: "#e5e7eb",
                }}
              >
                Privacy & security for school data
              </h2>
              <p
                style={{
                  margin: "0.45rem 0 0",
                  fontSize: "0.96rem",
                  color: "#cbd5f5",
                  maxWidth: "40rem",
                }}
              >
                TrackTally is designed for school environments with clear boundaries around who can
                log incidents, who can view them, and how long data sticks around.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "1.25rem",
              }}
            >
              <div
                style={{
                  padding: "1.1rem 1.2rem",
                  borderRadius: 18,
                  background: "rgba(15,23,42,0.85)",
                  border: "1px solid rgba(148,163,184,0.45)",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "#e5e7eb",
                  }}
                >
                  Data protection
                </h3>
                <ul
                  style={{
                    margin: "0.55rem 0 0",
                    paddingLeft: "1.1rem",
                    fontSize: "0.9rem",
                    color: "#cbd5f5",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  <li>Google sign‑in with domain restrictions per school.</li>
                  <li>Role‑based access for teachers, admins, and super admins.</li>
                  <li>Audit logging of key admin actions for traceability.</li>
                </ul>
              </div>

              <div
                style={{
                  padding: "1.1rem 1.2rem",
                  borderRadius: 18,
                  background: "rgba(15,23,42,0.85)",
                  border: "1px solid rgba(148,163,184,0.45)",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "#e5e7eb",
                  }}
                >
                  Compliance & trust
                </h3>
                <ul
                  style={{
                    margin: "0.55rem 0 0",
                    paddingLeft: "1.1rem",
                    fontSize: "0.9rem",
                    color: "#cbd5f5",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  <li>Designed with education privacy expectations in mind.</li>
                  <li>Clear separation of data per school organization.</li>
                  <li>Backups and restore procedures documented for operators.</li>
                </ul>
              </div>
            </div>

            <div
              style={{
                marginTop: "0.5rem",
                padding: "0.9rem 1.2rem",
                borderRadius: 18,
                background: "rgba(16,185,129,0.12)",
                border: "1px solid rgba(34,197,94,0.35)",
                color: "#bbf7d0",
                fontSize: "0.9rem",
              }}
            >
              For security questionnaires or detailed deployment questions, reach out to{" "}
              <a
                href="mailto:support@spelltally.com"
                style={{ color: "#6ee7b7", textDecoration: "underline" }}
              >
                support@spelltally.com
              </a>
              .
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section
          aria-labelledby="closing-heading"
          style={{
            paddingTop: "0.5rem",
          }}
        >
          <div
            style={{
              padding: "1.75rem 1.5rem",
              borderRadius: 24,
              background: "#f8fafc",
              border: "1px solid rgba(148,163,184,0.4)",
              display: "flex",
              flexDirection: "column",
              gap: "0.8rem",
              alignItems: "flex-start",
            }}
          >
            <h2
              id="closing-heading"
              style={{
                margin: 0,
                fontSize: "1.4rem",
                fontWeight: 700,
                color: "#0b1220",
              }}
            >
              Ready to take behaviour tracking off the clipboard?
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "0.96rem",
                color: "#475569",
                maxWidth: "36rem",
              }}
            >
              TrackTally slots into your existing Google Workspace setup so teachers can log
              incidents quickly and leaders can see patterns over time.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginTop: "0.25rem",
              }}
            >
              <Link
                href={primaryCtaHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  padding: "0.7rem 1.4rem",
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(135deg, #0f766e, #14b8a6)",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  textDecoration: "none",
                  boxShadow: "0 12px 30px -20px rgba(13, 148, 136, 0.9)",
                }}
              >
                {primaryCtaLabel}
              </Link>
              <Link
                href="/teacher"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  padding: "0.7rem 1.3rem",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.35)",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: 500,
                  fontSize: "0.95rem",
                  textDecoration: "none",
                }}
              >
                View teacher logger
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
