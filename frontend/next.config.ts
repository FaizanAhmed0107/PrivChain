import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["snarkjs", "circomlibjs"],
};

export default nextConfig;
