/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
export default function TermsPage() {
  const sections = [
    {
      title: '1. Acceptance',
      body: 'By using Delicious Fitness you agree to these Terms of Service. If you do not agree, do not use the platform. These terms are governed by the laws of the UAE (jurisdiction of Paradox FZCO).',
    },
    {
      title: '2. Account',
      body: 'You must be 16 or older to create an account. You are responsible for maintaining the security of your credentials. You may not share your account or create multiple accounts.',
    },
    {
      title: '3. Content you post',
      body: 'You retain ownership of recipes and content you post. By publishing on Delicious Fitness you grant us a non-exclusive, royalty-free licence to display, translate, and distribute your content on the platform. You are responsible for ensuring you have the right to post any content.',
    },
    {
      title: '4. Prohibited conduct',
      body: 'You may not: post inaccurate nutritional information intentionally; spam or harass other users; scrape the platform without permission; reverse-engineer the platform; or use the service for illegal purposes.',
    },
    {
      title: '5. Chef subscriptions',
      body: 'Chef subscriptions are processed by Stripe. Subscriptions auto-renew at the end of each period. You may cancel at any time via your billing portal, retaining access until the end of the paid period. No refunds are issued for partial periods.',
    },
    {
      title: '6. Intellectual property',
      body: 'All platform code, design, and branding is owned by Paradox FZCO and developed by SaaSolutions SL. Unauthorised copying, modification, or distribution is prohibited. See our LICENSE file for full terms.',
    },
    {
      title: '7. Disclaimers',
      body: 'Nutritional information is provided for guidance only and should not replace professional dietary advice. We make no warranties as to the accuracy of macro data. Use at your own risk.',
    },
    {
      title: '8. Limitation of liability',
      body: 'To the maximum extent permitted by law, Paradox FZCO shall not be liable for indirect, incidental, or consequential damages arising from your use of the platform.',
    },
    {
      title: '9. Changes to terms',
      body: 'We may update these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.',
    },
    {
      title: '10. Contact',
      body: 'legal@deliciousfitness.eu · Paradox FZCO · © 2026',
    },
  ];

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Terms of Service</h1>
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
