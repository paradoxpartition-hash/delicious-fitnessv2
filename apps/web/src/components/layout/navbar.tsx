/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Navbar + UserDropdown
 *
 * Root causes fixed:
 * 1. Dashboard was inside dropdown AND as top button — removed from dropdown
 * 2. signOut only called supabase — now uses useAuth.signOut() which clears
 *    state, localStorage and redirects via window.location.replace('/')
 * 3. Menu labels were hardcoded — now use tm() from menu-i18n + lang state
 *    that updates on df:langchange event
 * 4. Dropdown did not close on navigation — fixed via usePathname effect
 * 5. supabase client was recreated each render — moved to useRef in useAuth
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAuth, ROLE_LABELS, ROLE_ICONS } from '@/hooks/use-auth';
import { tm } from '@/lib/menu-i18n';
import LanguageSwitcher from './language-switcher';
import NotificationBell from './notification-bell';
import { detectLanguage, getTranslations, type LangCode } from '@/lib/i18n';

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled,  setScrolled]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lang, setLang]            = useState<LangCode>('en');

  const { user, profile, isLoggedIn, isAdmin, dashboardHref, signOut } = useAuth();

  // Scroll shadow
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Language — subscribe to global change event
  useEffect(() => { setLang(detectLanguage()); }, []);
  useEffect(() => {
    const h = (e: Event) => setLang((e as CustomEvent).detail as LangCode);
    window.addEventListener('df:langchange', h);
    return () => window.removeEventListener('df:langchange', h);
  }, []);

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const t = getTranslations(lang);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href);

  const navLinks = [
    { href: '/recipes',   label: t.nav.recipes   },
    { href: '/meal-plan', label: t.nav.mealPlan   },
    { href: '/pricing',   label: t.nav.beChef     },
  ];

  return (
    <>
      <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <div className="container">
          <div className="header-inner">

            {/* Logo */}
            <Link href="/" className="logo">
              <div className="logo-mark">🥗</div>
              <span className="logo-text">Delicious<em>Fitness</em></span>
            </Link>

            {/* Desktop nav links */}
            <nav className="main-nav" aria-label="Main navigation">
              {navLinks.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`nav-link${isActive(l.href) ? ' active' : ''}`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* Right-side actions */}
            <div className="header-actions">
              <LanguageSwitcher onChange={setLang} />

              {isLoggedIn ? (
                <>
                  <NotificationBell />

                  {/* ── Dashboard button (TOP LEVEL — NOT in dropdown) ── */}
                  <Link
                    href={dashboardHref}
                    className="btn btn-ghost btn-sm"
                    style={isAdmin ? { color: 'var(--primary)', fontWeight: 700 } : {}}
                  >
                    {isAdmin ? '⚙️ Admin' : 'Dashboard'}
                  </Link>

                  {/* ── User dropdown ── */}
                  <UserDropdown
                    profile={profile}
                    isAdmin={isAdmin}
                    lang={lang}
                    onSignOut={signOut}
                  />
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
                className={`hamburger${mobileOpen ? ' open' : ''}`}
                onClick={() => setMobileOpen(o => !o)}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileOpen}
              >
                <span /><span /><span />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <nav
        className={`mobile-nav${mobileOpen ? ' open' : ''}`}
        aria-label="Mobile navigation"
      >
        {navLinks.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`nav-link${isActive(l.href) ? ' active' : ''}`}
          >
            {l.label}
          </Link>
        ))}
        <div className="divider-sm" />
        {isLoggedIn ? (
          <>
            <Link href={dashboardHref} className="nav-link">Dashboard</Link>
            <Link href="/profile"      className="nav-link">{tm('menu.profile', lang)}</Link>
            <Link href="/saved-recipes"className="nav-link">{tm('menu.savedRecipes', lang)}</Link>
            <Link href="/profile/settings" className="nav-link">{tm('menu.settings', lang)}</Link>
            <button
              onClick={signOut}
              className="btn btn-outline w-full"
              style={{ marginTop: 12 }}
            >
              {tm('menu.signOut', lang)}
            </button>
          </>
        ) : (
          <>
            <Link href="/auth/signin" className="nav-link">{t.nav.signIn}</Link>
            <Link href="/auth/signup" className="btn btn-primary w-full" style={{ marginTop: 12 }}>
              {t.nav.getStarted}
            </Link>
          </>
        )}
      </nav>
    </>
  );
}

// ─── UserDropdown ─────────────────────────────────────────────────────────────
interface DropdownProps {
  profile:   any;
  isAdmin:   boolean;
  lang:      LangCode;
  onSignOut: () => Promise<void>;
}

function UserDropdown({ profile, isAdmin, lang, onSignOut }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);
  const pathname        = usePathname();

  const role    = profile?.role ?? 'USER';
  const initial = profile?.username?.[0]?.toUpperCase() ?? '?';

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Keyboard: close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Menu items — Dashboard is NOT here (it's the top-level button)
  // Admin links shown inline if admin
  const menuItems = [
    { href: '/profile',          icon: '👤', key: 'menu.profile'      as const },
    { href: '/saved-recipes',    icon: '♥',  key: 'menu.savedRecipes' as const },
    { href: '/profile/settings', icon: '⚙️', key: 'menu.settings'     as const },
  ];

  const adminItems = isAdmin ? [
    { href: '/admin/homepage',   icon: '🎛️', label: 'Homepage sections' },
    { href: '/admin/partners',   icon: '🤝', label: 'Partners'          },
    { href: '/admin/moderation', icon: '🛡️', label: 'Moderation'        },
  ] : [];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Avatar trigger */}
      <button
        id="user-menu-button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Open user menu"
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: isAdmin ? 'var(--primary)' : 'var(--dark)',
          color: 'white', border: 'none', cursor: 'pointer',
          fontSize: '0.85rem', fontWeight: 700,
          display: 'grid', placeItems: 'center',
          overflow: 'hidden',
          outline: 'none',
        }}
        onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.35)')}
        onBlur={e  => (e.currentTarget.style.boxShadow = 'none')}
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.username ?? 'User'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : initial}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="menu"
          aria-labelledby="user-menu-button"
          style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-xl)',
            minWidth: 220, zIndex: 600,
            animation: 'slide-up 0.18s var(--ease-spring) both',
          }}
        >
          {/* ── HEADER: name + role ── */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-light)',
            background: 'var(--bg)',
            borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 3 }}>
              {profile?.username ?? 'User'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>{ROLE_ICONS[role] ?? '👤'}</span>
              <span>
                {tm('menu.role', lang)}: {ROLE_LABELS[role] ?? role}
              </span>
            </div>
          </div>

          {/* ── MENU ITEMS ── */}
          <div role="none" style={{ padding: '6px 0' }}>
            {menuItems.map(item => (
              <DropdownLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={tm(item.key, lang)}
                onClick={() => setOpen(false)}
              />
            ))}

            {/* Admin-only items */}
            {adminItems.length > 0 && (
              <>
                <div role="separator" style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />
                {adminItems.map(item => (
                  <DropdownLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    highlight
                    onClick={() => setOpen(false)}
                  />
                ))}
              </>
            )}

            <div role="separator" style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />

            {/* ── SIGN OUT ── */}
            <button
              role="menuitem"
              onClick={async () => { setOpen(false); await onSignOut(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 16px',
                fontSize: '0.88rem', color: '#dc2626',
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left',
                borderRadius: '0 0 var(--r-lg) var(--r-lg)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              onFocus={e    => (e.currentTarget.style.background = '#fef2f2')}
              onBlur={e     => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ width: 18, textAlign: 'center' }}>🚪</span>
              {tm('menu.signOut', lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dropdown link item ───────────────────────────────────────────────────────
function DropdownLink({
  href, icon, label, onClick, highlight = false,
}: {
  href: string; icon: string; label: string;
  onClick: () => void; highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', fontSize: '0.88rem',
        color: highlight ? 'var(--primary)' : 'var(--text)',
        textDecoration: 'none',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      onFocus={e    => (e.currentTarget.style.background = 'var(--bg)')}
      onBlur={e     => (e.currentTarget.style.background = 'none')}
    >
      <span style={{ width: 18, textAlign: 'center', fontSize: '1rem' }}>{icon}</span>
      {label}
    </Link>
  );
}
