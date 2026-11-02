import type { NextConfig } from "next";

const supabase = process.env.SUPABASE_URL ?? "";
let supabaseOrigin = "";
try {
  if (supabase) supabaseOrigin = new URL(supabase).origin;
} catch {
  supabaseOrigin = "";
}

const connectSrc = ["'self'", "https://*.supabase.co", supabaseOrigin]
  .filter(Boolean)
  .join(" ");

const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src ${connectSrc}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const noStore = [
  { key: "Cache-Control", value: "private, no-store" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/portal/:path*", headers: noStore },
      { source: "/admin/:path*", headers: noStore },
      { source: "/api/:path*", headers: noStore },
      { source: "/auth/:path*", headers: noStore },
      { source: "/sign-in", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
