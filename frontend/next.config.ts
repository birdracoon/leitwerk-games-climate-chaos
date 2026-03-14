import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/climate-chaos",
  transpilePackages: ["pixi.js", "@pixi/react"],
  trailingSlash: true, 
  output: 'standalone'

};

export default nextConfig;
