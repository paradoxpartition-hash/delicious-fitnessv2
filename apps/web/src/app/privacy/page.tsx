/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
export default function PrivacyPage() {
  const sections = [
    {
      title: '1. Who we are',
      body: 'Delicious Fitness is operated by Paradox FZCO and developed by SaaSolutions SL. This Privacy Policy explains how we collect, use, and protect your personal data when you use our platform.',
    },
    {
      title: '2. Data we collect',
      body: 'We collect data you provide directly: your email address, username, and any content you post (recipes, comments, community posts). We also collect usage data including page views and interactions, processed by Supabase on infrastructure located in the EU.',
    },
    {
      title: '3. How we use your data',
      body: 'We use your data to: provide and improve the platform; send transactional emails (account confirmation, password reset); process payments via Stripe; and analyse platform usage to improve features. We never sell your data to third parties.',
    },
    {
      title: '4. Data storage and security',
      body: 'Your data is stored on Supabase (PostgreSQL) with row-level security enabled. All connections are encrypted via TLS. Payment data is handled exclusively by Stripe and is never stored on our servers.',
    },
    {
      title: '5. Cookies',
      body: 'We use only necessary cookies for authentication (Supabase session cookie) and your language preference (stored in localStorage). We do not use advertising or tracking cookies.',
    },
    {
      title: '6. Your rights (GDPR)',
      body: 'Under the GDPR you have the right to access, correct, delete, or export your personal data. To exercise these rights, contact us at privacy@deliciousfitness.eu. We will respond within 30 days.',
    },
    {
      title: '7. Third-party services',
      body: 'We use Supabase (database & auth), Stripe (payments), Google OAuth (optional sign-in), and AI providers (Groq, Gemini) for recipe translation. Each has their own privacy policy.',
    },
    {
      title: '8. Contact',
      body: 'For privacy enquiries: privacy@deliciousfitness.eu · Paradox FZCO · © 2026',
    },
  ];

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Privacy Policy</h1>
          <p>Last updated: January 2026</p>
        </div>
      </section>

      <section className="section-sm">
        <div className="container" style={{ maxWidth: 760, marginInline: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {sections.map(({ title, body }) => (
              <div key={title}>
                <h2 style={{ fontSize: '1.15rem', marginBottom: 10 }}>{title}</h2>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.8 }}>{body}</p>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 48, padding: '20px 24px',
            background: 'var(--border-light)', borderRadius: 'var(--r-lg)',
            fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.7,
          }}>
            Developed by SaaSolutions SL | © 2026 Paradox FZCO. All rights reserved.
          </div>
        </div>
      </section>
    </>
  );
}
