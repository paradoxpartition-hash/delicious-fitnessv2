/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // PRESERVED: existing image domains
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },

  // Preserve existing experimental flags
  experimental: {
    serverComponentsExternalPackages: ['@node-rs/argon2'],
  },

  // Build info
  env: {
    NEXT_PUBLIC_BUILD_SIGNATURE: 'DF-PARADOX-SaaS-2026',
    NEXT_PUBLIC_SYSTEM_DEVELOPER: 'SaaSolutions SL',
    NEXT_PUBLIC_SYSTEM_OWNER: 'Paradox FZCO',
  },
};

module.exports = nextConfig;
