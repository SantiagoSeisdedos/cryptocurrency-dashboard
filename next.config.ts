import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

let withBundleAnalyzer: (config: NextConfig) => NextConfig = (config) => config;

try {
  withBundleAnalyzer = (config) =>
    bundleAnalyzer({
      enabled: process.env.ANALYZE === "true",
    })(config);
} catch {
  // Optional dependency; ignore when not installed
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.coingecko.com",
      },
      {
        protocol: "https",
        hostname: "coin-images.coingecko.com",
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
