export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px 64px" }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>TrackTally™ Privacy Notice</h1>
      <p style={{ color: "#475569", marginBottom: 24 }}>
        This notice explains how TrackTally™ (a TebTally™ product) handles behaviour and student
        data for schools that use the service.
      </p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Data we collect</h2>
        <ul style={{ color: "#475569", lineHeight: 1.6 }}>
          <li>Behaviour and commendation entries (level, category, location, actions, notes).</li>
          <li>Student identifiers and names, class codes, and roster details provided by the school.</li>
          <li>Teacher/admin account details (email, role, organization) from Google sign-in.</li>
          <li>Timestamps, device/user agent, incident UUIDs, and audit logs for admin actions.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>How we use the data</h2>
        <ul style={{ color: "#475569", lineHeight: 1.6 }}>
          <li>To let staff log incidents and commendations and view summaries/exports.</li>
          <li>To operate leadership analytics (counts, trends, top categories/locations).</li>
          <li>To provide admin features (rosters, options, audit history) and support.</li>
          <li>To protect the service (auth checks, rate limits, abuse prevention).</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Where data is stored</h2>
        <ul style={{ color: "#475569", lineHeight: 1.6 }}>
          <li>Primary storage: our database (Postgres) per school organization.</li>
          <li>
            Exports: Google Sheets append of incident rows for easy reporting/import (shared only
            with the service account you configure).
          </li>
          <li>Hosting/subprocessors: Vercel (app hosting), database provider (e.g., Neon), Google APIs.</li>
          <li>Backups follow the hosting providers&apos; backup behavior; offline queues store pending items on the device until sent.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Access and sharing</h2>
        <ul style={{ color: "#475569", lineHeight: 1.6 }}>
          <li>Access is limited to the school organization and roles you configure (teacher/admin/super admin).</li>
          <li>No data is shared with third parties beyond the subprocessors named above.</li>
          <li>Audit logs record admin actions for accountability.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Retention and deletion</h2>
        <ul style={{ color: "#475569", lineHeight: 1.6 }}>
          <li>Data is retained while the school uses TrackTally™ or until the school requests removal.</li>
          <li>Schools may request exports and deletion; we will delete production data on confirmed school admin request.</li>
          <li>Backups and Google Sheets copies are subject to their respective retention policies.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Security</h2>
        <ul style={{ color: "#475569", lineHeight: 1.6 }}>
          <li>Google Workspace sign-in with allowed domains; roles scoped per organization.</li>
          <li>Transport encryption (HTTPS) and least-privilege service account access to Sheets.</li>
          <li>Rate limiting, audit logging, and organization scoping to keep schools separated.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Your responsibilities</h2>
        <ul style={{ color: "#475569", lineHeight: 1.6 }}>
          <li>Ensure only authorized school staff use TrackTally™.</li>
          <li>Keep Google Sheets sharing scoped to the service account and relevant staff.</li>
          <li>Follow local laws and school policies for handling student behaviour records.</li>
        </ul>
      </section>

      <section>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Contact</h2>
        <p style={{ color: "#475569", lineHeight: 1.6 }}>
          For privacy questions or data requests, contact your school admin or reach TebTally™ via
          tebtally.com/contact. Please include your school name and domain.
        </p>
      </section>
    </main>
  );
}
