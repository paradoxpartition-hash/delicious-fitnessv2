/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';
import { detectLanguage, getTranslations, type LangCode } from '@/lib/i18n';

// ── System constants ──────────────────────────────────────────────────────────
const SYSTEM_OWNER        = "Paradox FZCO";
const SYSTEM_DEVELOPER    = "SaaSolutions SL";
const __BUILD_SIGNATURE__ = "DF-PARADOX-SaaS-2026";

// ── Default admin section visibility (LocalStorage key: df_homepage_sections) ─
const DEFAULT_SECTIONS = {
  hero:          true,
  features:      true,
  community:     true,
  supermarkets:  true,
  supplements:   true,
  trust:         true,
  builtBy:       true,
  cta:           true,
};

const SUPERMARKET_PARTNERS = [
  { icon: '🛒', name: 'Albert Heijn' },
  { icon: '🛒', name: 'Jumbo' },
  { icon: '🛒', name: 'Lidl' },
  { icon: '🛒', name: 'Aldi' },
  { icon: '🛒', name: 'Plus Supermarkt' },
  { icon: '🛒', name: 'Dirk' },
  { icon: '🛒', name: 'Hoogvliet' },
  { icon: '🛒', name: 'Spar' },
];

const SUPPLEMENT_PARTNERS = [
  { icon: '💊', name: 'Myprotein' },
  { icon: '💊', name: 'Body & Fit' },
  { icon: '💊', name: 'XXL Nutrition' },
  { icon: '💊', name: 'Bulk' },
  { icon: '💊', name: 'Optimum Nutrition' },
  { icon: '💊', name: 'Scitec' },
  { icon: '💊', name: 'Prozis' },
  { icon: '💊', name: 'IronMaxx' },
];

const FEATURES = [
  { icon: '🎯', key: 'feature1' },
  { icon: '🔀', key: 'feature2' },
  { icon: '🌍', key: 'feature3' },
  { icon: '🤖', key: 'feature4' },
  { icon: '👨‍🍳', key: 'feature5' },
  { icon: '🤝', key: 'feature6' },
] as const;

const TRUST_ITEMS = [
  { icon: '🆓', key: 'trust1' },
  { icon: '🔒', key: 'trust2' },
  { icon: '📈', key: 'trust3' },
  { icon: '🔌', key: 'trust4' },
] as const;

const STATS = [
  { value: '2,400+', key: 'heroStat1' },
  { value: '18,500+', key: 'heroStat2' },
  { value: '5',       key: 'heroStat3' },
  { value: '340+',    key: 'heroStat4' },
] as const;

// Duplicate arrays for infinite marquee
const superMx2 = [...SUPERMARKET_PARTNERS, ...SUPERMARKET_PARTNERS];
const suppMx2  = [...SUPPLEMENT_PARTNERS,  ...SUPPLEMENT_PARTNERS];

export default function HomePage() {
  const [lang, setLang]               = useState<LangCode>('en');
  const [sections, setSections]       = useState(DEFAULT_SECTIONS);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [recentRecipes, setRecentRecipes] = useState<any[]>([]);
  const supabase = createBrowserClient();

  // Language
  useEffect(() => { setLang(detectLanguage()); }, []);
  useEffect(() => {
    const h = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener('df:langchange', h);
    return () => window.removeEventListener('df:langchange', h);
  }, []);

  // Admin section toggles from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('df_homepage_sections');
      if (stored) setSections({ ...DEFAULT_SECTIONS, ...JSON.parse(stored) });
    } catch (_) {}
  }, []);

  // Fetch real community data
  useEffect(() => {
    // Fetch recent comments/posts as "community activity"
    supabase
      .from('recipe_comments')
      .select('id, content, created_at, profiles(username, avatar_url), recipes(title)')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => { if (data) setRecentPosts(data); });

    // Fetch recent published recipes
    supabase
      .from('recipes')
      .select('id, title, cached_macros, category, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => { if (data) setRecentRecipes(data); });
  }, []);

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.12 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [sections, lang]);

  const t = getTranslations(lang);

  return (
    <>
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      {sections.hero && (
        <section className="section" style={{
          background: 'linear-gradient(145deg, var(--dark) 0%, #0d1f0d 60%, #111 100%)',
          paddingTop: 96, paddingBottom: 96,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Dot grid */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(circle, rgba(34,197,94,0.12) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }} />
          {/* Glow */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 80% 60% at 15% 60%, rgba(34,197,94,0.14) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 80% 30%, rgba(255,122,0,0.07) 0%, transparent 60%)',
          }} />

          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ maxWidth: 720 }}>
              <div className="eyebrow reveal" style={{ color: 'var(--primary)', marginBottom: 20 }}>
                {t.home.heroEyebrow}
              </div>

              <h1 className="reveal reveal-delay-1" style={{
                color: 'white', fontSize: 'clamp(2.6rem, 6vw, 4.8rem)',
                fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em',
                marginBottom: 24, whiteSpace: 'pre-line',
              }}>
                {t.home.heroTitle}
              </h1>

              <p className="reveal reveal-delay-2" style={{
                color: 'rgba(255,255,255,0.58)', fontSize: '1.1rem',
                lineHeight: 1.7, marginBottom: 36, maxWidth: 560,
              }}>
                {t.home.heroSub}
              </p>

              <div className="flex flex-wrap gap-12 reveal reveal-delay-3">
                <Link href="/recipes" className="btn btn-primary btn-lg">
                  {t.home.heroCta} →
                </Link>
                <Link href="/auth/signup" className="btn btn-outline btn-lg" style={{ color: 'rgba(255,255,255,0.75)', borderColor: 'rgba(255,255,255,0.18)' }}>
                  {t.home.heroCtaSub}
                </Link>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-32 reveal reveal-delay-4" style={{ marginTop: 56 }}>
                {STATS.map(({ value, key }) => (
                  <div key={key}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: '2rem',
                      fontWeight: 800, color: 'white', lineHeight: 1,
                    }}>{value}</div>
                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                      {t.home[key as keyof typeof t.home]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      {sections.features && (
        <section className="section">
          <div className="container">
            <div className="section-head center reveal">
              <div className="eyebrow" style={{ justifyContent: 'center' }}>{t.home.featuresEyebrow}</div>
              <h2 className="section-headline">{t.home.featuresTitle}</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {FEATURES.map(({ icon, key }, i) => (
                <div
                  key={key}
                  className={`reveal reveal-delay-${(i % 4) + 1}`}
                  style={{
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-lg)', padding: '28px 24px',
                    transition: 'box-shadow var(--duration-md) var(--ease), transform var(--duration-md) var(--ease)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lg)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '';
                    (e.currentTarget as HTMLElement).style.transform = '';
                    (e.currentTarget as HTMLElement).style.borderColor = '';
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 'var(--r)',
                    background: 'var(--primary-50)',
                    display: 'grid', placeItems: 'center',
                    fontSize: '1.5rem', marginBottom: 16,
                  }}>{icon}</div>
                  <h3 style={{ fontSize: '1.05rem', marginBottom: 8 }}>
                    {t.home[`${key}Title` as keyof typeof t.home]}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                    {t.home[`${key}Desc` as keyof typeof t.home]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── ACTIVE COMMUNITY ──────────────────────────────────────────────── */}
      {sections.community && (
        <section className="section" style={{ background: 'var(--border-light)' }}>
          <div className="container">
            <div className="flex-between mb-48 flex-wrap gap-16 reveal">
              <div>
                <div className="eyebrow">{t.home.communityEyebrow}</div>
                <h2 className="section-headline" style={{ marginBottom: 6 }}>{t.home.communityTitle}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t.home.communitySub}</p>
              </div>
              <Link href="/community" className="btn btn-outline">{t.common.seeAll} →</Link>
            </div>

            {recentPosts.length > 0 ? (
              <div className="community-grid">
                {recentPosts.map((post, i) => (
                  <div key={post.id} className={`post-card reveal reveal-delay-${(i % 3) + 1}`}>
                    <div className="post-head">
                      <div className="avatar avatar-md">
                        {post.profiles?.avatar_url
                          ? <img src={post.profiles.avatar_url} alt="" />
                          : (post.profiles?.username?.[0] ?? '?').toUpperCase()
                        }
                      </div>
                      <div>
                        <div className="post-author-name">{post.profiles?.username ?? 'Anonymous'}</div>
                        <div className="post-author-meta">
                          {post.recipes?.title && `on "${post.recipes.title}" · `}
                          {new Date(post.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <p className="post-content" style={{ WebkitLineClamp: 3 }}>{post.content}</p>
                    <div className="post-actions">
                      <button className="post-action">❤️ Like</button>
                      <button className="post-action">💬 Reply</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Skeleton / empty state while loading */
              <div className="community-grid">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="post-card" style={{ minHeight: 160 }}>
                    <div className="flex gap-12 mb-12">
                      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div className="skeleton mb-8" style={{ height: 12, width: '60%' }} />
                        <div className="skeleton" style={{ height: 10, width: '40%' }} />
                      </div>
                    </div>
                    <div className="skeleton mb-8" style={{ height: 12 }} />
                    <div className="skeleton mb-8" style={{ height: 12, width: '80%' }} />
                    <div className="skeleton" style={{ height: 12, width: '60%' }} />
                  </div>
                ))}
              </div>
            )}

            {/* Recent recipes chip row */}
            {recentRecipes.length > 0 && (
              <div className="flex flex-wrap gap-8 reveal" style={{ marginTop: 32 }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Latest recipes:</span>
                {recentRecipes.map(r => (
                  <Link key={r.id} href={`/recipes/${r.id}`} className="filter-chip active" style={{ fontSize: '0.8rem' }}>
                    🍽️ {r.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── SUPERMARKET PARTNERS ──────────────────────────────────────────── */}
      {sections.supermarkets && (
        <section className="section-sm">
          <div className="container">
            <div className="section-head center reveal">
              <div className="eyebrow" style={{ justifyContent: 'center' }}>{t.home.supermarketEyebrow}</div>
              <h3 style={{ marginBottom: 0 }}>{t.home.supermarketTitle}</h3>
            </div>
          </div>
          <div className="marquee-outer reveal">
            <div className="marquee-track">
              {superMx2.map((p, i) => (
                <div key={i} className="partner-pill">
                  <span className="partner-icon">{p.icon}</span>
                  {p.name}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SUPPLEMENT PARTNERS ───────────────────────────────────────────── */}
      {sections.supplements && (
        <section className="section-xs" style={{ background: 'var(--border-light)' }}>
          <div className="container">
            <div className="section-head center reveal" style={{ marginBottom: 24 }}>
              <div className="eyebrow" style={{ justifyContent: 'center' }}>{t.home.supplementEyebrow}</div>
              <h3 style={{ marginBottom: 0 }}>{t.home.supplementTitle}</h3>
            </div>
          </div>
          <div className="marquee-outer reveal">
            <div className="marquee-track reverse">
              {suppMx2.map((p, i) => (
                <div key={i} className="partner-pill">
                  <span className="partner-icon">{p.icon}</span>
                  {p.name}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── TRUST SECTION ─────────────────────────────────────────────────── */}
      {sections.trust && (
        <section className="section">
          <div className="container">
            <div className="section-head center reveal">
              <div className="eyebrow" style={{ justifyContent: 'center' }}>{t.home.trustEyebrow}</div>
              <h2 className="section-headline">{t.home.trustTitle}</h2>
            </div>
            <div className="trust-grid">
              {TRUST_ITEMS.map(({ icon, key }, i) => (
                <div key={key} className={`trust-item reveal reveal-delay-${i + 1}`}>
                  <div className="trust-icon">{icon}</div>
                  <div className="trust-copy">
                    <h4>{t.home[`${key}Title` as keyof typeof t.home]}</h4>
                    <p>{t.home[`${key}Desc` as keyof typeof t.home]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── BUILT BY / OWNED BY ───────────────────────────────────────────── */}
      {sections.builtBy && (
        <section className="section-sm" style={{ background: 'var(--border-light)' }}>
          <div className="container">
            <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }} className="reveal">
              <h2 className="section-headline">{t.home.builtByTitle}</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: '1rem', lineHeight: 1.7 }}>
                {t.home.builtByDesc}
              </p>
              <div className="flex justify-center gap-32 flex-wrap">
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 6,
                  }}>{t.home.builtByDev}</div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '1.3rem',
                    fontWeight: 800, color: 'var(--dark)',
                  }}>{SYSTEM_DEVELOPER}</div>
                </div>
                <div style={{
                  width: 1, background: 'var(--border)', alignSelf: 'stretch',
                }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 6,
                  }}>{t.home.builtByOwner}</div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '1.3rem',
                    fontWeight: 800, color: 'var(--primary)',
                  }}>{SYSTEM_OWNER}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      {sections.cta && (
        <section className="section" style={{
          background: 'linear-gradient(135deg, var(--dark) 0%, #0a1f0a 100%)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 60% 70% at 50% 60%, rgba(34,197,94,0.12) 0%, transparent 70%)',
          }} />
          <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <div className="reveal">
              <h2 style={{ color: 'white', fontSize: 'clamp(2rem, 5vw, 3.2rem)', marginBottom: 16 }}>
                {t.home.ctaTitle}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', marginBottom: 36 }}>
                {t.home.ctaSub}
              </p>
              <div className="flex justify-center gap-12 flex-wrap">
                <Link href="/auth/signup" className="btn btn-primary btn-xl">
                  {t.home.ctaBtn}
                </Link>
                <Link href="/recipes" className="btn btn-outline btn-xl" style={{ color: 'rgba(255,255,255,0.65)', borderColor: 'rgba(255,255,255,0.2)' }}>
                  Browse recipes
                </Link>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem', marginTop: 16 }}>
                {t.home.ctaBtnSub}
              </p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
