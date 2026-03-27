import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hook/db", "@hook/trpc", "@hook/platform-adapters", "@hook/ai"],
};

export default nextConfig;
