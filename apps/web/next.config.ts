import type { NextConfig } from 'next';
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Workspace packages are shipped as TypeScript source, so Next must transpile them.
  transpilePackages: ['@solari/shared', '@solari/database', '@solari/jobs'],
  // We lint the repo with our own flat ESLint config (`pnpm lint`), so skip
  // Next's separate build-time lint pass.
  eslint: { ignoreDuringBuilds: true },
  // Security headers set at the app layer so they apply behind any edge proxy
  // (the production nginx doesn't add them; browsers ignore HSTS over plain
  // http, so local dev is unaffected).
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
  webpack: (config, { isServer }) => {
    // In a pnpm monorepo, Next bundles Prisma (it's re-exported by a transpiled
    // workspace package); this plugin copies the native query engine next to the
    // server bundle so it's found at runtime.
    if (isServer) {
      config.plugins = config.plugins ?? [];
      config.plugins.push(new PrismaPlugin());
    }
    return config;
  },
};

export default nextConfig;
