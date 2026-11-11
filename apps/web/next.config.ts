import type { NextConfig } from "next";
import path from "path";

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
  // Same-origin `/api/v1/*` is handled by `app/api/v1/[...path]/route.ts`
  // (rewrites break multipart research PDF uploads).
};

export default nextConfig;
