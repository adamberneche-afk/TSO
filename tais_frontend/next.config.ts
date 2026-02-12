import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
  // Allow environment variables to be used at build time
  env: {
    NEXT_PUBLIC_REGISTRY_URL: process.env.NEXT_PUBLIC_REGISTRY_URL,
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
    NEXT_PUBLIC_GENESIS_CONTRACT: process.env.NEXT_PUBLIC_GENESIS_CONTRACT,
  },
};

export default nextConfig;
