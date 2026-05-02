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
  const [user, setUser]         = useState<any>(null);
  const [profile, setProfile]   = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang]         = useState<LangCode>('en');
  const supabase = createBrowserClient();

  // Auth + profile (includes role)
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        const { data: p } = await supabase
          .from('profiles')
          .select('username, avatar_url, role')
          .eq('id', data.user.id)
          .single();
        setProfile(p);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setUser(s?.user ?? null);
      if (s?.user) {
        const { data: p } = await supabase
          .from('profiles')
          .select('username, avatar_url, role')
          .eq('id', s.user.id)
          .single();
        setProfile(p);
      } else {
        setProfile(null);
      }
    });
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
    const h = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener('df:langchange', h);
    return () => window.removeEventListener('df:langchange', h);
  }, []);

  const t = getTranslations(lang);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setMenuOpen(false);
  };

  const navLinks = [
    { href: '/recipes',    label: t.nav.recipes },
    { href: '/meal-plan',  label: t.nav.mealPlan },
    { href: '/pricing',    label: t.nav.beChef },
  ];

  // Determine dashboard link based on role
  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'MODERATOR';
  const isChef  = profile?.role === 'CHEF';
  const dashboardHref  = isAdmin ? '/admin' : isChef ? '/chef/dashboard' : '/profile';
  const dashboardLabel = isAdmin ? '⚙️ Admin' : isChef ? 'Dashboard' : 'Profile';

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

              {user ? (
                <>
                  <NotificationBell />

                  {/* Dashboard / Admin / Profile link */}
                  <Link
                    href={dashboardHref}
                    className={`btn btn-ghost btn-sm${isAdmin ? ' text-primary' : ''}`}
                    style={isAdmin ? { color: 'var(--primary)', fontWeight: 700 } : {}}
                  >
                    {dashboardLabel}
                  </Link>

                  {/* User avatar dropdown */}
                  <UserMenu
                    profile={profile}
                    isAdmin={isAdmin}
                    isChef={isChef}
                    onSignOut={handleSignOut}
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

      {/* Mobile drawer */}
      <nav className={`mobile-nav${menuOpen ? ' open' : ''}`}>
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
            <Link href={dashboardHref} className="nav-link" onClick={() => setMenuOpen(false)}>
              {dashboardLabel}
            </Link>
            <Link href="/profile" className="nav-link" onClick={() => setMenuOpen(false)}>
              My profile
            </Link>
            <Link href="/profile/settings" className="nav-link" onClick={() => setMenuOpen(false)}>
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="btn btn-outline w-full"
              style={{ marginTop: 12 }}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/auth/signin" className="nav-link" onClick={() => setMenuOpen(false)}>
              {t.nav.signIn}
            </Link>
            <Link
              href="/auth/signup"
              className="btn btn-primary w-full"
              style={{ marginTop: 12 }}
              onClick={() => setMenuOpen(false)}
            >
              {t.nav.getStarted}
            </Link>
          </>
        )}
      </nav>
    </>
  );
}

// ── User avatar dropdown ──────────────────────────────────────────────────────
function UserMenu({
  profile, isAdmin, isChef, onSignOut,
}: {
  profile: any;
  isAdmin: boolean;
  isChef:  boolean;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const el = document.getElementById('user-menu-wrap');
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const initial = profile?.username?.[0]?.toUpperCase() ?? '?';

  return (
    <div id="user-menu-wrap" style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: isAdmin ? 'var(--primary)' : 'var(--dark)',
          color: 'white', border: 'none', cursor: 'pointer',
          fontSize: '0.85rem', fontWeight: 700,
          display: 'grid', placeItems: 'center',
          overflow: 'hidden',
        }}
        aria-label="User menu"
      >
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : initial
        }
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'white', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-xl)',
          minWidth: 200, overflow: 'hidden', zIndex: 500,
        }}>
          {/* User info */}
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--border-light)',
            background: 'var(--bg)',
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              {profile?.username ?? 'User'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {isAdmin ? '⚙️ Administrator' : isChef ? '👨‍🍳 Chef' : '👤 Member'}
            </div>
          </div>

          {/* Menu items */}
          <div style={{ padding: '6px 0' }}>
            <MenuItem href="/profile"          icon="👤" label="My profile"   onClick={() => setOpen(false)} />
            <MenuItem href="/profile/settings" icon="⚙️" label="Settings"     onClick={() => setOpen(false)} />
            <MenuItem href="/profile/saved"    icon="♥"  label="Saved recipes" onClick={() => setOpen(false)} />

            {isChef && (
              <MenuItem href="/chef/dashboard" icon="📊" label="Chef dashboard" onClick={() => setOpen(false)} />
            )}

            {isAdmin && (
              <>
                <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />
                <MenuItem href="/admin"            icon="🏠" label="Admin overview"  onClick={() => setOpen(false)} isHighlight />
                <MenuItem href="/admin/homepage"   icon="🎛️" label="Homepage sections" onClick={() => setOpen(false)} isHighlight />
                <MenuItem href="/admin/partners"   icon="🤝" label="Partners"         onClick={() => setOpen(false)} isHighlight />
                <MenuItem href="/admin/moderation" icon="🛡️" label="Moderation"       onClick={() => setOpen(false)} isHighlight />
              </>
            )}

            <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />

            <button
              onClick={onSignOut}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 16px',
                fontSize: '0.88rem', color: '#dc2626',
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left',
                transition: 'background var(--duration) var(--ease)',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fef2f2'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
            >
              🚪 Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href, icon, label, onClick, isHighlight,
}: {
  href: string; icon: string; label: string;
  onClick: () => void; isHighlight?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px', fontSize: '0.88rem',
        color: isHighlight ? 'var(--primary)' : 'var(--text)',
        textDecoration: 'none',
        transition: 'background var(--duration) var(--ease)',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
    >
      <span style={{ width: 18, textAlign: 'center' }}>{icon}</span>
      {label}
    </Link>
  );
}
