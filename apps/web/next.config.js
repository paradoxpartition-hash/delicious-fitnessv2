/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile the workspace package so Next.js can resolve it
  transpilePackages: ['@df/shared-types'],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },

  experimental: {
    serverComponentsExternalPackages: [],
  },

  env: {
    NEXT_PUBLIC_BUILD_SIGNATURE:  'DF-PARADOX-SaaS-2026',
    NEXT_PUBLIC_SYSTEM_DEVELOPER: 'SaaSolutions SL',
    NEXT_PUBLIC_SYSTEM_OWNER:     'Paradox FZCO',
  },
};

module.exports = nextConfig;
