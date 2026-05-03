/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAuth, ROLE_LABELS, ROLE_ICONS, type UserRole } from '@/hooks/use-auth';
import LanguageSwitcher from './language-switcher';
import NotificationBell from './notification-bell';
import { detectLanguage, getTranslations, type LangCode } from '@/lib/i18n';

export default function Navbar() {
  const pathname                   = usePathname();
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [lang, setLang]           = useState<LangCode>('en');
  const { user, profile, isLoggedIn, isAdmin, isChef, dashboardHref, signOut } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setLang(detectLanguage()); }, []);
  useEffect(() => {
    const h = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener('df:langchange', h);
    return () => window.removeEventListener('df:langchange', h);
  }, []);

  const t = getTranslations(lang);
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href);

  const navLinks = [
    { href: '/recipes',   label: t.nav.recipes },
    { href: '/meal-plan', label: t.nav.mealPlan },
    { href: '/pricing',   label: t.nav.beChef },
  ];

  return (
    <>
      <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <div className="container">
          <div className="header-inner">
            <Link href="/" className="logo" onClick={() => setMenuOpen(false)}>
              <div className="logo-mark">🥗</div>
              <span className="logo-text">Delicious<em>Fitness</em></span>
            </Link>

            <nav className="main-nav">
              {navLinks.map(l => (
                <Link key={l.href} href={l.href} className={`nav-link${isActive(l.href) ? ' active' : ''}`}>
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="header-actions">
              <LanguageSwitcher onChange={setLang} />
              {isLoggedIn ? (
                <>
                  <NotificationBell />
                  <Link
                    href={dashboardHref}
                    className="btn btn-ghost btn-sm"
                    style={isAdmin ? { color: 'var(--primary)', fontWeight: 700 } : {}}
                  >
                    {isAdmin ? '⚙️ Admin' : 'Dashboard'}
                  </Link>
                  <UserDropdown
                    profile={profile}
                    isAdmin={isAdmin}
                    isChef={isChef}
                    dashboardHref={dashboardHref}
                    onSignOut={signOut}
                  />
                </>
              ) : (
                <>
                  <Link href="/auth/signin" className="btn btn-ghost btn-sm">{t.nav.signIn}</Link>
                  <Link href="/auth/signup" className="btn btn-primary btn-sm">{t.nav.getStarted}</Link>
                </>
              )}
              <button
                className={`hamburger${menuOpen ? ' open' : ''}`}
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Toggle menu"
              >
                <span /><span /><span />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className={`mobile-nav${menuOpen ? ' open' : ''}`}>
        {navLinks.map(l => (
          <Link key={l.href} href={l.href} className={`nav-link${isActive(l.href) ? ' active' : ''}`} onClick={() => setMenuOpen(false)}>
            {l.label}
          </Link>
        ))}
        <div className="divider-sm" />
        {isLoggedIn ? (
          <>
            <Link href={dashboardHref}     className="nav-link" onClick={() => setMenuOpen(false)}>Dashboard</Link>
            <Link href="/profile"          className="nav-link" onClick={() => setMenuOpen(false)}>My profile</Link>
            <Link href="/saved-recipes"    className="nav-link" onClick={() => setMenuOpen(false)}>Saved recipes</Link>
            <Link href="/profile/settings" className="nav-link" onClick={() => setMenuOpen(false)}>Settings</Link>
            <button onClick={signOut} className="btn btn-outline w-full" style={{ marginTop: 12 }}>Sign out</button>
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

// ─── User dropdown component ──────────────────────────────────────────────────
function UserDropdown({ profile, isAdmin, isChef, dashboardHref, onSignOut }: {
  profile: any; isAdmin: boolean; isChef: boolean;
  dashboardHref: string; onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const role = (profile?.role ?? 'member') as UserRole;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Build menu items based on role — no inline checks in JSX
  const menuItems = [
    { href: dashboardHref,      icon: '📊', label: 'Dashboard',      show: true },
    { href: '/profile',         icon: '👤', label: 'My profile',      show: true },
    { href: '/saved-recipes',   icon: '♥',  label: 'Saved recipes',   show: true },
    { href: '/profile/settings',icon: '⚙️', label: 'Settings',        show: true },
    { href: '/chef/dashboard',  icon: '📈', label: 'Chef analytics',  show: isChef },
    { href: '/admin/homepage',  icon: '🎛️', label: 'Homepage',        show: isAdmin },
    { href: '/admin/partners',  icon: '🤝', label: 'Partners',        show: isAdmin },
    { href: '/admin/moderation',icon: '🛡️', label: 'Moderation',      show: isAdmin },
  ].filter(item => item.show);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="User menu"
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: isAdmin ? 'var(--primary)' : 'var(--dark)',
          color: 'white', border: 'none', cursor: 'pointer',
          fontSize: '0.85rem', fontWeight: 700,
          display: 'grid', placeItems: 'center', overflow: 'hidden',
        }}
      >
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (profile?.username?.[0]?.toUpperCase() ?? '?')
        }
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          background: 'white', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-xl)',
          minWidth: 220, zIndex: 600,
          animation: 'slide-up 0.2s var(--ease-spring) both',
        }}>
          {/* HEADER: name + role */}
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--border-light)',
            background: 'var(--bg)', borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
              {profile?.username ?? 'User'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>{ROLE_ICONS[role]}</span>
              <span>Role: {ROLE_LABELS[role]}</span>
            </div>
          </div>

          {/* MENU */}
          <div style={{ padding: '6px 0' }}>
            {menuItems.map((item, i) => {
              // Divider before admin items
              const showDivider = isAdmin && i === menuItems.findIndex(m => m.href === '/admin/homepage');
              return (
                <div key={item.href}>
                  {showDivider && <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />}
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 16px', fontSize: '0.88rem',
                      color: isAdmin && item.href.startsWith('/admin') ? 'var(--primary)' : 'var(--text)',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                  >
                    <span style={{ width: 18, textAlign: 'center' }}>{item.icon}</span>
                    {item.label}
                  </Link>
                </div>
              );
            })}

            <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />

            {/* SIGN OUT */}
            <button
              onClick={() => { setOpen(false); onSignOut(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 16px',
                fontSize: '0.88rem', color: '#dc2626',
                background: 'none', border: 'none', cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fef2f2'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
            >
              <span style={{ width: 18, textAlign: 'center' }}>🚪</span>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
