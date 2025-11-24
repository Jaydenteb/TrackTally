export function SiteFooter() {
  return (
    <footer style={{ borderTop: "1px solid #e5e7eb", background: "#f8fafc" }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "16px 24px",
        fontSize: 12,
        color: "#475569",
      }}
    >
        <div>ABN 96 110 054 130 · TebTally™</div>
        <div style={{ marginTop: 6 }}>
          <a
            href="/privacy"
            style={{ color: "#0ea5e9", textDecoration: "none", marginRight: 12 }}
          >
            Privacy Policy
          </a>
          <a href="/terms" style={{ color: "#0ea5e9", textDecoration: "none" }}>
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
}
