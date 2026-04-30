/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';
import { detectLanguage, getTranslations, type LangCode } from '@/lib/i18n';

interface Workout {
  id:           string;
  title:        string;
  description:  string | null;
  level:        'beginner' | 'intermediate' | 'advanced';
  type:         'strength' | 'cardio' | 'hiit' | 'yoga' | 'mobility';
  duration_min: number;
  goal:         'bulk' | 'cut' | 'maintain' | null;
  exercises:    { name: string; sets: number; reps: string }[];
  image_url:    string | null;
}

const LEVELS = ['all', 'beginner', 'intermediate', 'advanced'] as const;
const TYPES  = ['all', 'strength', 'cardio', 'hiit', 'yoga', 'mobility'] as const;

const LEVEL_COLORS: Record<string, string> = {
  beginner:     'badge-green',
  intermediate: 'badge-orange',
  advanced:     'badge-dark',
};

const TYPE_EMOJI: Record<string, string> = {
  strength: '🏋️',
  cardio:   '🏃',
  hiit:     '⚡',
  yoga:     '🧘',
  mobility: '🤸',
};

export default function WorkoutsPage() {
  const [lang, setLang]       = useState<LangCode>('en');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel]     = useState<string>('all');
  const [type, setType]       = useState<string>('all');
  const [selected, setSelected] = useState<Workout | null>(null);
  const supabase = createBrowserClient();

  useEffect(() => { setLang(detectLanguage()); }, []);
  useEffect(() => {
    const h = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener('df:langchange', h);
    return () => window.removeEventListener('df:langchange', h);
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

  // Fetch workouts (PRESERVED query logic)
  const fetchWorkouts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('workouts')
        .select('id, title, description, level, type, duration_min, goal, exercises, image_url')
        .order('created_at', { ascending: false });

      if (level !== 'all') query = query.eq('level', level);
      if (type  !== 'all') query = query.eq('type', type);

      const { data } = await query;
      setWorkouts((data ?? []) as Workout[]);
    } catch (_) {}
    setLoading(false);
  }, [level, type]);

  useEffect(() => { fetchWorkouts(); }, [fetchWorkouts]);

  const t = getTranslations(lang);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Workouts</h1>
          <p>Structured training plans matched to your nutrition and fitness goal.</p>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">

          {/* Level filter */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Level</div>
            <div className="filter-bar">
              {LEVELS.map(l => (
                <button
                  key={l}
                  className={`filter-chip${level === l ? ' active' : ''}`}
                  onClick={() => setLevel(l)}
                >
                  {l === 'all' ? 'All levels' : l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Type filter */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Type</div>
            <div className="filter-bar">
              {TYPES.map(tp => (
                <button
                  key={tp}
                  className={`filter-chip${type === tp ? ' active' : ''}`}
                  onClick={() => setType(tp)}
                >
                  {tp === 'all' ? 'All types' : `${TYPE_EMOJI[tp] ?? ''} ${tp.charAt(0).toUpperCase() + tp.slice(1)}`}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="workout-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                  <div className="skeleton" style={{ height: 176 }} />
                  <div style={{ padding: 18 }}>
                    <div className="skeleton mb-8" style={{ height: 14, width: '70%' }} />
                    <div className="skeleton" style={{ height: 11, width: '50%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : workouts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏋️</div>
              <h3 className="empty-title">No workouts found</h3>
              <p className="empty-desc">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="workout-grid">
              {workouts.map((w, i) => (
                <div
                  key={w.id}
                  className={`workout-card reveal reveal-delay-${(i % 3) + 1}`}
                  onClick={() => setSelected(w)}
                >
                  <div className="workout-thumb">
                    {w.image_url
                      ? <img src={w.image_url} alt={w.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span>{TYPE_EMOJI[w.type] ?? '🏋️'}</span>
                    }
                    <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
                      <span className={`badge ${LEVEL_COLORS[w.level] ?? 'badge-gray'}`}>{w.level}</span>
                    </div>
                  </div>
                  <div className="workout-body">
                    <h3 className="workout-title">{w.title}</h3>
                    {w.description && (
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {w.description}
                      </p>
                    )}
                    <div className="workout-tags">
                      <span className="badge badge-gray">{TYPE_EMOJI[w.type]} {w.type}</span>
                      {w.goal && <span className="badge badge-gray">{w.goal}</span>}
                    </div>
                    <div className="flex gap-16" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                      <span>⏱️ {w.duration_min} min</span>
                      <span>💪 {w.exercises?.length ?? 0} exercises</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Workout detail modal */}
      {selected && (
        <div className={`overlay open`} onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2 className="modal-title">{selected.title}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="flex gap-8 flex-wrap mb-16">
                <span className={`badge ${LEVEL_COLORS[selected.level]}`}>{selected.level}</span>
                <span className="badge badge-gray">{TYPE_EMOJI[selected.type]} {selected.type}</span>
                {selected.goal && <span className="badge badge-gray">{selected.goal}</span>}
                <span className="badge badge-gray">⏱️ {selected.duration_min} min</span>
              </div>

              {selected.description && (
                <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.7 }}>{selected.description}</p>
              )}

              <h4 style={{ marginBottom: 12 }}>Exercises</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selected.exercises?.map((ex, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg)', borderRadius: 'var(--r)',
                    fontSize: '0.9rem',
                  }}>
                    <div className="flex gap-12 items-center">
                      <span style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: 'var(--primary)', color: 'white',
                        display: 'grid', placeItems: 'center',
                        fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                      }}>{i + 1}</span>
                      <span style={{ fontWeight: 600 }}>{ex.name}</span>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>{ex.sets} × {ex.reps}</span>
                  </div>
                ))}
              </div>

              <button
                className="btn btn-primary w-full"
                style={{ marginTop: 24 }}
                onClick={() => setSelected(null)}
              >
                Start workout 💪
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
