import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "fluent-ffmpeg", "ffmpeg-static"],
};

export default nextConfig;
