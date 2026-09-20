import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "development" },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() { return [{ source: "/recruitos", destination: "/", permanent: true }]; },
  async headers() {
    return [
      ...["/dashboard/:path*", "/sign-in", "/sign-up", "/checkout/:path*", "/upload", "/auth/:path*", "/api/:path*"].map(source => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] })),
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
