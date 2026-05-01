/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
import Link from 'next/link';

const SYSTEM_OWNER     = "Paradox FZCO";
const SYSTEM_DEVELOPER = "SaaSolutions SL";

export default function AboutPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>About Delicious Fitness</h1>
          <p>The story behind the platform and the people who built it.</p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 800, marginInline: 'auto' }}>

          {/* Mission */}
          <div style={{ marginBottom: 56 }}>
            <div className="eyebrow" style={{ marginBottom: 16 }}>Our mission</div>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', marginBottom: 20 }}>
              Structured nutrition data,<br />like Git for recipes.
            </h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 16 }}>
              Delicious Fitness was built to solve a frustrating problem: most recipe platforms are
              cluttered, imprecise, and locked to one language. We wanted something different — a
              platform where recipes are structured data, macro-accurate by default, version-controlled
              like code, and accessible in any language.
            </p>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
              The result is a community-driven platform used by fitness enthusiasts, professional
              chefs, gym chains, and meal-prep services across Europe and beyond.
            </p>
          </div>

          {/* Stats */}
          <div className="stats-grid" style={{ marginBottom: 56 }}>
            {[
              { value: '2,400+',  label: 'Published recipes' },
              { value: '18,500+', label: 'Active members' },
              { value: '5',       label: 'Languages' },
              { value: '340+',    label: 'Verified chefs' },
            ].map(({ value, label }) => (
              <div key={label} className="stat-card">
                <div className="stat-number">{value}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>

          {/* Tech stack */}
          <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 'var(--r-xl)', padding: 36, marginBottom: 40,
          }}>
            <h3 style={{ marginBottom: 20 }}>Built with</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))',
              gap: 14,
            }}>
              {[
                { icon: '⚡', name: 'Next.js 14',   desc: 'App Router' },
                { icon: '🗄️', name: 'Supabase',     desc: 'Postgres + RLS + Auth' },
                { icon: '💳', name: 'Stripe',        desc: 'Payments' },
                { icon: '🤖', name: 'Groq / Gemini', desc: 'AI translation' },
                { icon: '🌍', name: 'Free AI APIs',  desc: 'Groq, Gemini, OpenRouter' },
                { icon: '📦', name: 'npm + Next.js', desc: 'Simple build pipeline' },
              ].map(({ icon, name, desc }) => (
                <div key={name} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '14px 16px',
                  background: 'var(--bg)', borderRadius: 'var(--r)',
                  border: '1px solid var(--border-light)',
                }}>
                  <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* IP */}
          <div style={{
            background: 'var(--dark)', color: 'white',
            borderRadius: 'var(--r-xl)', padding: 36, marginBottom: 40,
          }}>
            <h3 style={{ color: 'white', marginBottom: 20 }}>Intellectual Property</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
                  Developed by
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800, color: 'white' }}>
                  {SYSTEM_DEVELOPER}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
                  Owned by
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {SYSTEM_OWNER}
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.4)', marginTop: 20, lineHeight: 1.7 }}>
              2026 {SYSTEM_OWNER}. All intellectual property rights are owned exclusively by {SYSTEM_OWNER}.
              This platform was developed by {SYSTEM_DEVELOPER}. Unauthorized use is prohibited.
            </p>
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: 12 }}>Ready to start?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
              Join the community and start cooking smarter today.
            </p>
            <div className="flex justify-center gap-12 flex-wrap">
              <Link href="/auth/signup" className="btn btn-primary btn-lg">
                Create free account
              </Link>
              <Link href="/recipes" className="btn btn-outline btn-lg">
                Browse recipes
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
