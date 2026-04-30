/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';

// ── System constants ──────────────────────────────────────────────────────────
const SYSTEM_OWNER        = "Paradox FZCO";
const SYSTEM_DEVELOPER    = "SaaSolutions SL";
const __BUILD_SIGNATURE__ = "DF-PARADOX-SaaS-2026";

export const metadata: Metadata = {
  title: {
    template: '%s · Delicious Fitness',
    default:  'Delicious Fitness — The GitHub of Recipes',
  },
  description:
    'Structured, macro-accurate, multilingual recipes. Version-controlled. Community-driven. Chef-powered.',
  keywords: ['recipes', 'fitness', 'nutrition', 'macros', 'meal plan', 'healthy eating'],
  authors: [
    { name: SYSTEM_DEVELOPER },
    { name: SYSTEM_OWNER },
  ],
  creator:   SYSTEM_DEVELOPER,
  publisher: SYSTEM_OWNER,
  openGraph: {
    type:        'website',
    siteName:    'Delicious Fitness',
    title:       'Delicious Fitness — The GitHub of Recipes',
    description: 'Structured, macro-accurate, multilingual recipes. Community-driven.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
