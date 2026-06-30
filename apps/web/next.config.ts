import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages are shipped as TypeScript source, so Next must transpile them.
  transpilePackages: ['@helios/shared', '@helios/database', '@helios/jobs'],
};

export default nextConfig;
