import type { NextConfig } from "next";

const basePath = process.env.GITHUB_ACTIONS === "true" ? "/pdf-breeze" : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
