function createSecurityHeaders() {
  const isDev = process.env.NODE_ENV !== "production";

  const scriptSrc = ["'self'", "'unsafe-inline'"];
  if (isDev) {
    scriptSrc.push("'unsafe-eval'");
  }

  return [
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: "geolocation=(), microphone=(), camera=()",
    },
    {
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        "img-src 'self' data:",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data:",
        `script-src ${scriptSrc.join(" ")}`,
        "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://id.tebtally.com",
        "frame-ancestors 'none'",
        "form-action 'self'",
      ].join("; "),
    },
  ];
}

const nextConfig = {
  async headers() {
    const securityHeaders = createSecurityHeaders();
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
