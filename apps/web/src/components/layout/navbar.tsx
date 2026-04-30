/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';
import LanguageSwitcher from './language-switcher';
import NotificationBell from './notification-bell';
import { detectLanguage, getTranslations, type LangCode } from '@/lib/i18n';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser]     = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang]     = useState<LangCode>('en');
  const supabase = createBrowserClient();

  // Auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Language
  useEffect(() => { setLang(detectLanguage()); }, []);
  useEffect(() => {
    const handler = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener('df:langchange', handler);
    return () => window.removeEventListener('df:langchange', handler);
  }, []);

  const t = getTranslations(lang);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
  };

  const navLinks = [
    { href: '/recipes',    label: t.nav.recipes },
    { href: '/meal-plan',  label: t.nav.mealPlan },
    { href: '/pricing',    label: t.nav.beChef },
  ];

  return (
    <>
      <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <div className="container">
          <div className="header-inner">

            {/* Logo */}
            <Link href="/" className="logo" onClick={() => setMenuOpen(false)}>
              <div className="logo-mark">🥗</div>
              <span className="logo-text">
                Delicious<em>Fitness</em>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="main-nav" aria-label="Main navigation">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link${isActive(link.href) ? ' active' : ''}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="header-actions">
              <LanguageSwitcher onChange={setLang} />
              {user && <NotificationBell />}

              {user ? (
                <>
                  <Link href="/chef/dashboard" className="btn btn-ghost btn-sm">Dashboard</Link>
                  <button onClick={handleSignOut} className="btn btn-outline btn-sm">Sign out</button>
                </>
              ) : (
                <>
                  <Link href="/auth/signin" className="btn btn-ghost btn-sm">
                    {t.nav.signIn}
                  </Link>
                  <Link href="/auth/signup" className="btn btn-primary btn-sm">
                    {t.nav.getStarted}
                  </Link>
                </>
              )}

              {/* Hamburger */}
              <button
                className={`hamburger${menuOpen ? ' open' : ''}`}
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
              >
                <span /><span /><span />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <nav className={`mobile-nav${menuOpen ? ' open' : ''}`} aria-label="Mobile navigation">
        {navLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link${isActive(link.href) ? ' active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        <div className="divider-sm" />
        {user ? (
          <>
            <Link href="/chef/dashboard" className="nav-link" onClick={() => setMenuOpen(false)}>Dashboard</Link>
            <button onClick={handleSignOut} className="btn btn-outline w-full" style={{ marginTop: 12 }}>Sign out</button>
          </>
        ) : (
          <>
            <Link href="/auth/signin" className="nav-link" onClick={() => setMenuOpen(false)}>{t.nav.signIn}</Link>
            <Link href="/auth/signup" className="btn btn-primary w-full" style={{ marginTop: 12 }} onClick={() => setMenuOpen(false)}>{t.nav.getStarted}</Link>
          </>
        )}
      </nav>
    </>
  );
}
