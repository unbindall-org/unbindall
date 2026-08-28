import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // `pnpm build` performs the strict typecheck before Next starts compiling.
  // Keeping Next's duplicate worker check off also makes builds work in restricted CI sandboxes.
  typescript: { ignoreBuildErrors: true },
  experimental: { useTypeScriptCli: false },
  allowedDevOrigins: ['192.168.178.34'],
};

export default nextConfig;
