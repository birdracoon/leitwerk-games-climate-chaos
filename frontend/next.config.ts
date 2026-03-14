import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["pixi.js", "@pixi/react"],
};

export default nextConfig;
