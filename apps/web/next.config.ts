import type { NextConfig } from "next";
import path from "path";

/** Backend origin for same-origin `/api/v1` proxy (phones/LAN can't reach browser `localhost`). */
const API_ORIGIN = process.env.API_PROXY_ORIGIN ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@creatoros/shared"],
  // Phone / LAN access (http://192.168.x.x:3000) needs this or /_next and fetches break.
  allowedDevOrigins: [
    "192.168.1.12",
    "http://192.168.1.12:3000",
    "127.0.0.1",
    "localhost",
  ],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_ORIGIN}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
