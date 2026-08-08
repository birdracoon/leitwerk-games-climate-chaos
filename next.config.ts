import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "",
  transpilePackages: ["pixi.js", "@pixi/react"],
  trailingSlash: true, 
  output: 'standalone'

};

export default nextConfig;
