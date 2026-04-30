/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { detectLanguage, getTranslations, type LangCode } from '@/lib/i18n';

// ── System constants (non-UI, persistent) ────────────────────────────────────
const SYSTEM_OWNER     = "Paradox FZCO";
const SYSTEM_DEVELOPER = "SaaSolutions SL";
const __BUILD_SIGNATURE__ = "DF-PARADOX-SaaS-2026";

export default function Footer() {
  const [lang, setLang] = useState<LangCode>('en');

  useEffect(() => { setLang(detectLanguage()); }, []);
  useEffect(() => {
    const h = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener('df:langchange', h);
    return () => window.removeEventListener('df:langchange', h);
  }, []);

  const t = getTranslations(lang);

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">

          {/* Brand col */}
          <div className="footer-brand">
            <Link href="/" className="logo" style={{ color: 'white' }}>
              <div className="logo-mark">🥗</div>
              <span className="logo-text" style={{ color: 'white' }}>
                Delicious<span style={{ color: 'var(--primary)' }}>Fitness</span>
              </span>
            </Link>
            <p>{t.footer.tagline}</p>

            {/* Social icons */}
            <div className="flex gap-8" style={{ marginTop: 20 }}>
              {['𝕏', 'in', 'ig'].map(icon => (
                <div
                  key={icon}
                  style={{
                    width: 34, height: 34,
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    display: 'grid', placeItems: 'center',
                    fontSize: '0.78rem', fontWeight: 700,
                    color: 'rgba(255,255,255,0.45)',
                    cursor: 'pointer',
                    transition: 'all var(--duration) var(--ease)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--primary)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)';
                  }}
                >
                  {icon}
                </div>
              ))}
            </div>
          </div>

          {/* Platform col */}
          <div className="footer-col">
            <h5>{t.footer.platform}</h5>
            <Link href="/recipes">{t.footer.links.recipes}</Link>
            <Link href="/meal-plan">{t.footer.links.mealPlan}</Link>
            <Link href="/community">{t.footer.links.community}</Link>
            <Link href="/blog">{t.footer.links.blog}</Link>
            <Link href="/pricing">{t.footer.links.chefs}</Link>
            <Link href="/pricing">{t.footer.links.pricing}</Link>
          </div>

          {/* Company col */}
          <div className="footer-col">
            <h5>{t.footer.company}</h5>
            <Link href="/about">{t.footer.links.about}</Link>
            <Link href="/careers">{t.footer.links.careers}</Link>
            <Link href="/press">{t.footer.links.press}</Link>
            <a href="mailto:support@deliciousfitness.eu">Support</a>
          </div>

          {/* Legal col */}
          <div className="footer-col">
            <h5>{t.footer.legal}</h5>
            <Link href="/privacy">{t.footer.links.privacy}</Link>
            <Link href="/terms">{t.footer.links.terms}</Link>
            <Link href="/cookies">{t.footer.links.cookies}</Link>
          </div>
        </div>

        {/* Bottom bar — MANDATORY IP line, NOT removable via admin */}
        <div className="footer-bottom">
          <p className="footer-copy">{t.footer.rights}</p>
          {/* ⚠️ This attribution line is MANDATORY and must always be visible */}
          <p className="footer-ip-line">
            Developed by {SYSTEM_DEVELOPER} | © 2026 {SYSTEM_OWNER}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
