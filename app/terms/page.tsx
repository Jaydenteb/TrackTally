export default function TermsPage() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px 64px" }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>TrackTally™ Terms for Schools</h1>
      <p style={{ color: "#475569", marginBottom: 24 }}>
        These terms apply to schools using TrackTally™ (a TebTally™ product) to record and manage
        behaviour data.
      </p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>1) Roles and accounts</h2>
        <ul style={{ color: "#475569", lineHeight: 1.6 }}>
          <li>The school controls its behaviour data and manages who can access TrackTally™.</li>
          <li>TebTally™ operates the service as a processor to the school.</li>
          <li>Access is for authorized school staff only (teacher, admin, super admin roles).</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>2) Acceptable use</h2>
        <ul style={{ color: "#475569", lineHeight: 1.6 }}>
          <li>Use TrackTally™ only for legitimate school purposes related to student behaviour.</li>
          <li>Do not upload unlawful, offensive, or unrelated content.</li>
          <li>Do not attempt to bypass security, share accounts, or harvest other schools&apos; data.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>3) Data ownership and use</h2>
        <ul style={{ color: "#475569", lineHeight: 1.6 }}>
          <li>The school owns behaviour data. TebTally™ uses it only to provide, secure, and improve TrackTally™.</li>
          <li>Data is scoped per organization; staff should only access their school&apos;s records.</li>
          <li>Google Sheets exports are the school&apos;s responsibility to safeguard and share appropriately.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>4) Service availability and support</h2>
        <ul style={{ color: "#475569", lineHeight: 1.6 }}>
          <li>TrackTally™ is provided on a reasonable-effort basis; no guaranteed uptime.</li>
          <li>Contact TebTally™ via tebtally.com/contact for support requests.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>5) Privacy and security</h2>
        <ul style={{ color: "#475569", lineHeight: 1.6 }}>
          <li>Google Workspace sign-in with domain restrictions; roles enforced in-app.</li>
          <li>Behaviour data stored in Postgres; incident rows optionally mirrored to Google Sheets.</li>
          <li>Audit logging and rate limiting help protect the service; schools must manage roster access.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>6) Retention, exports, deletion</h2>
        <ul style={{ color: "#475569", lineHeight: 1.6 }}>
          <li>Data is retained while the school uses TrackTally™ unless the school requests deletion.</li>
          <li>Schools can request data export or deletion; we will act on confirmed admin requests.</li>
          <li>Google Sheets copies and backup snapshots are subject to their own retention settings.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>7) Disclaimers and limits</h2>
        <ul style={{ color: "#475569", lineHeight: 1.6 }}>
          <li>TrackTally™ is provided “as is.” We are not liable for indirect or consequential losses.</li>
          <li>The school remains responsible for lawful use of student data and for its own exports.</li>
        </ul>
      </section>

      <section>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>8) Changes and contact</h2>
        <ul style={{ color: "#475569", lineHeight: 1.6 }}>
          <li>We may update these terms; material changes will be communicated to school admins.</li>
          <li>Contact TebTally via tebtally.com/contact with questions.</li>
        </ul>
      </section>
    </main>
  );
}
