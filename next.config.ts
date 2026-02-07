import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  devIndicators: false,
  images: {
    domains: ["https://ewpkkezzspacdgmjtozg.supabase.co"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ewpkkezzspacdgmjtozg.supabase.co",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
