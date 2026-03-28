import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.ngrok-free.dev"],
  webpack(config, { isServer, nextRuntime }) {
    // fs/path non sono disponibili nel bundle client né in Edge runtime
    if (!isServer || nextRuntime === "edge") {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
