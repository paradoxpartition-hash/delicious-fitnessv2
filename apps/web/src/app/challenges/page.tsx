/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';
import { detectLanguage, type LangCode } from '@/lib/i18n';

interface Challenge {
  id:             string;
  title:          string;
  description:    string;
  icon:           string;
  duration_days:  number;
  goal:           string | null;
  participant_count: number;
  start_date:     string | null;
  end_date:       string | null;
  user_progress?: {
    enrolled:   boolean;
    day:        number;
    completed:  boolean;
  };
}

export default function ChallengesPage() {
  const [lang, setLang]           = useState<LangCode>('en');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading]     = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const supabase = createBrowserClient();
  const router   = useRouter();

  useEffect(() => { setLang(detectLanguage()); }, []);
  useEffect(() => {
    const h = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener('df:langchange', h);
    return () => window.removeEventListener('df:langchange', h);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  });

  // Fetch challenges with user progress (PRESERVED logic)
  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('challenges')
        .select(`
          id, title, description, icon, duration_days,
          goal, participant_count, start_date, end_date,
          challenge_participants(enrolled, day, completed)
        `)
        .order('start_date', { ascending: true });

      if (data) {
        setChallenges(data.map((c: any) => ({
          ...c,
          user_progress: c.challenge_participants?.[0] ?? null,
        })));
      }
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchChallenges(); }, [fetchChallenges]);

  // Enroll / unenroll (PRESERVED)
  const handleEnroll = async (challengeId: string, enrolled: boolean) => {
    if (!currentUser) { router.push('/auth/signin'); return; }
    setEnrolling(challengeId);
    try {
      if (enrolled) {
        await supabase
          .from('challenge_participants')
          .delete()
          .eq('challenge_id', challengeId)
          .eq('user_id', currentUser.id);
      } else {
        await supabase
          .from('challenge_participants')
          .upsert({ challenge_id: challengeId, user_id: currentUser.id, enrolled: true, day: 1, completed: false });
      }
      await fetchChallenges();
    } catch (_) {}
    setEnrolling(null);
  };

  const GOAL_COLOR: Record<string, string> = {
    bulk: 'badge-dark', cut: 'badge-orange', maintain: 'badge-green',
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Challenges</h1>
          <p>30-day challenges to build healthy habits. Join thousands of members already participating.</p>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">

          {/* Stats bar */}
          <div className="stats-grid mb-48">
            {[
              { value: challenges.length,                                    label: 'Active challenges', icon: '🏆' },
              { value: challenges.reduce((s, c) => s + c.participant_count, 0).toLocaleString(), label: 'Participants', icon: '👥' },
              { value: challenges.filter(c => c.user_progress?.enrolled).length, label: 'Joined',    icon: '✅' },
              { value: challenges.filter(c => c.user_progress?.completed).length, label: 'Completed', icon: '🎉' },
            ].map(({ value, label, icon }) => (
              <div key={label} className="stat-card reveal">
                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{icon}</div>
                <div className="stat-number">{value}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>

          {/* Challenge grid */}
          {loading ? (
            <div className="challenge-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 24 }}>
                  <div className="flex gap-16 mb-14">
                    <div className="skeleton" style={{ width: 50, height: 50, borderRadius: 'var(--r)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton mb-8" style={{ height: 14, width: '70%' }} />
                      <div className="skeleton" style={{ height: 11, width: '50%' }} />
                    </div>
                  </div>
                  <div className="skeleton mb-8" style={{ height: 11 }} />
                  <div className="skeleton mb-16" style={{ height: 8, borderRadius: 99 }} />
                  <div className="skeleton" style={{ height: 36, borderRadius: 99 }} />
                </div>
              ))}
            </div>
          ) : challenges.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏆</div>
              <h3 className="empty-title">No challenges yet</h3>
              <p className="empty-desc">New challenges are added every month</p>
            </div>
          ) : (
            <div className="challenge-grid">
              {challenges.map((c, i) => {
                const enrolled  = !!c.user_progress?.enrolled;
                const completed = !!c.user_progress?.completed;
                const day       = c.user_progress?.day ?? 0;
                const progress  = enrolled ? Math.min(100, Math.round((day / c.duration_days) * 100)) : 0;

                return (
                  <div key={c.id} className={`challenge-card reveal reveal-delay-${(i % 3) + 1}`}>
                    <div className="challenge-head">
                      <div className="challenge-icon">{c.icon || '🎯'}</div>
                      <div>
                        <h3 className="challenge-title">{c.title}</h3>
                        <p className="challenge-desc">{c.duration_days} days{c.goal ? ` · ${c.goal}` : ''}</p>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.87rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 14 }}>
                      {c.description}
                    </p>

                    <div className="flex gap-6 flex-wrap mb-14">
                      {c.goal && <span className={`badge ${GOAL_COLOR[c.goal] ?? 'badge-gray'}`}>{c.goal}</span>}
                      {completed && <span className="badge badge-green">✓ Completed</span>}
                      {enrolled && !completed && <span className="badge badge-orange">In progress</span>}
                    </div>

                    {/* Progress bar */}
                    {enrolled && (
                      <>
                        <div className="progress mb-4">
                          <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="progress-info">
                          <span>Day {day} / {c.duration_days}</span>
                          <span>{progress}%</span>
                        </div>
                      </>
                    )}

                    <div className="challenge-footer">
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        👥 {c.participant_count.toLocaleString()} participants
                      </span>
                      <button
                        className={`btn btn-sm${enrolled ? ' btn-outline' : ' btn-primary'}`}
                        onClick={() => handleEnroll(c.id, enrolled)}
                        disabled={enrolling === c.id || completed}
                        style={completed ? { opacity: 0.5 } : {}}
                      >
                        {completed ? '🎉 Done'
                          : enrolling === c.id ? '…'
                          : enrolled ? 'Leave'
                          : 'Join'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
