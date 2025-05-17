import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "eiln001dwwce9eb0.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
