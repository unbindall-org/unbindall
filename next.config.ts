import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browser tests use an isolated build directory so they can run while a
  // developer has the regular `.next` server open in the same checkout.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  output: "standalone",
  poweredByHeader: false,
  // `pnpm build` performs the strict typecheck before Next starts compiling.
  // Keeping Next's duplicate worker check off also makes builds work in restricted CI sandboxes.
  typescript: { ignoreBuildErrors: true },
  experimental: { useTypeScriptCli: false },
  allowedDevOrigins: ['192.168.178.34'],
};

export default nextConfig;
