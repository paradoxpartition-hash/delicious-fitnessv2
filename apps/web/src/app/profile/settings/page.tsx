/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, ROLE_LABELS, ROLE_ICONS, type UserRole } from '@/hooks/use-auth';
import { createBrowserClient } from '@/lib/supabase/browser';
import { setLanguage, detectLanguage, SUPPORTED_LANGUAGES, type LangCode } from '@/lib/i18n';

const FITNESS_GOALS = [
  { value: 'bulk',          label: 'Bulk',           desc: 'Calorie surplus',       icon: '🏋️' },
  { value: 'cut',           label: 'Cut',            desc: 'Calorie deficit',        icon: '🔥' },
  { value: 'maintain',      label: 'Maintain',       desc: 'Balanced',               icon: '⚖️' },
  { value: 'recomposition', label: 'Recomposition',  desc: 'Build muscle + lose fat', icon: '🔄' },
];

const DIET_TYPES = [
  { value: 'standard',      label: 'Standard',     icon: '🍽️' },
  { value: 'high_protein',  label: 'High Protein', icon: '💪' },
  { value: 'keto',          label: 'Keto',         icon: '🥑' },
  { value: 'vegan',         label: 'Vegan',        icon: '🌱' },
  { value: 'vegetarian',    label: 'Vegetarian',   icon: '🥗' },
  { value: 'mediterranean', label: 'Mediterranean',icon: '🫒' },
];

const TABS = [
  { key: 'profile',     label: '👤 Profile'     },
  { key: 'nutrition',   label: '🎯 Nutrition'   },
  { key: 'preferences', label: '🌍 Preferences' },
  { key: 'password',    label: '🔒 Password'    },
  { key: 'danger',      label: '⚠️ Danger zone' },
] as const;
type Tab = typeof TABS[number]['key'];

export default function SettingsPage() {
  const supabase = createBrowserClient();
  const router   = useRouter();
  const { user, profile, isLoggedIn, loading, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Profile fields
  const [username,   setUsername]  = useState('');
  const [bio,        setBio]       = useState('');
  const [avatarUrl,  setAvatarUrl] = useState('');
  const [uploading,  setUploading] = useState(false);

  // Nutrition fields
  const [fitnessGoal, setFitnessGoal] = useState('maintain');
  const [kcalTarget,  setKcalTarget]  = useState(2000);
  const [dietType,    setDietType]    = useState('standard');

  // Preferences
  const [lang, setLangState] = useState<LangCode>('en');

  // Password
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // UI state
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState('');
  const [toastErr, setToastErr] = useState(false);

  const showToast = (msg: string, err = false) => {
    setToast(msg); setToastErr(err);
    setTimeout(() => setToast(''), 3500);
  };

  // Auth guard
  useEffect(() => {
    if (!loading && !isLoggedIn) router.push('/auth/signin?next=/profile/settings');
  }, [loading, isLoggedIn]);

  // Populate from profile
  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username ?? '');
    setBio(profile.bio ?? '');
    setAvatarUrl(profile.avatar_url ?? '');
    setFitnessGoal(profile.fitness_goal ?? 'maintain');
    setKcalTarget(profile.daily_kcal_target ?? 2000);
    setDietType(profile.diet_type ?? 'standard');
    setLangState(detectLanguage());
  }, [profile]);

  // ── Save profile ──────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!username.trim()) { showToast('Username is required', true); return; }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        username:   username.trim(),
        bio:        bio.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    if (error) showToast(error.message, true);
    else { showToast('Profile saved ✅'); await refreshProfile(); }
    setSaving(false);
  };

  // ── Upload avatar ─────────────────────────────────────────────────────────
  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      setAvatarUrl(url);
      await refreshProfile();
      showToast('Avatar updated ✅');
    } catch (e: any) { showToast(e.message, true); }
    setUploading(false);
  };

  // ── Save nutrition — marks meal plan for regeneration ─────────────────────
  const saveNutrition = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        fitness_goal:      fitnessGoal,
        daily_kcal_target: kcalTarget,
        diet_type:         dietType,
        meal_plan_status:  'needs_regeneration',
        updated_at:        new Date().toISOString(),
      })
      .eq('id', user.id);
    if (error) showToast(error.message, true);
    else {
      showToast('Nutrition saved ✅ — meal plan flagged for regeneration');
      await refreshProfile();
    }
    setSaving(false);
  };

  // ── Save preferences ──────────────────────────────────────────────────────
  const savePreferences = () => {
    setLanguage(lang);
    window.dispatchEvent(new CustomEvent('df:langchange', { detail: lang }));
    showToast('Preferences saved ✅');
  };

  // ── Change password ───────────────────────────────────────────────────────
  const changePassword = async () => {
    if (newPw.length < 6)    { showToast('Minimum 6 characters', true); return; }
    if (newPw !== confirmPw)  { showToast('Passwords do not match', true); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) showToast(error.message, true);
    else { showToast('Password updated ✅'); setNewPw(''); setConfirmPw(''); }
    setSaving(false);
  };

  // ── Delete account ────────────────────────────────────────────────────────
  const deleteAccount = async () => {
    if (!confirm('Delete your account? This cannot be undone.')) return;
    if (!confirm('All your recipes, saves, and subscriptions will be permanently deleted.')) return;
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading || !profile) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <div className="skeleton" style={{ width: 160, height: 20 }} />
      </div>
    );
  }

  const role = (profile.role ?? 'member') as UserRole;

  return (
    <>
      <section className="page-hero" style={{ paddingBlock: 48 }}>
        <div className="container">
          <div className="flex-between flex-wrap gap-12">
            <div>
              <h1 style={{ marginBottom: 6 }}>Account Settings</h1>
              <p>Manage your profile, nutrition goals, and preferences</p>
            </div>
            <Link href="/dashboard" className="btn btn-outline"
              style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>
              ← Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container" style={{ maxWidth: 800, marginInline: 'auto' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28, overflowX: 'auto' }}>
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '11px 18px', fontWeight: 600, fontSize: '0.87rem',
                whiteSpace: 'nowrap', cursor: 'pointer',
                background: 'none', border: 'none',
                color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: `2px solid ${activeTab === tab.key ? 'var(--primary)' : 'transparent'}`,
                marginBottom: -1, transition: 'color var(--duration) var(--ease)',
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── PROFILE ─────────────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 28 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 24 }}>Profile information</h3>

              {/* Avatar */}
              <div className="flex gap-20 items-center mb-24">
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div className="avatar avatar-xl">
                    {avatarUrl ? <img src={avatarUrl} alt="" /> : profile.username?.[0]?.toUpperCase()}
                  </div>
                  {uploading && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center' }}>
                      <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                    {uploading ? 'Uploading…' : '📷 Change photo'}
                    <input type="file" accept="image/*" onChange={handleAvatar} style={{ display: 'none' }} disabled={uploading} />
                  </label>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 8 }}>JPG, PNG or WebP · max 2MB</p>
                </div>
              </div>

              {/* Role badge */}
              <div className="field">
                <label className="field-label">Role</label>
                <div className="flex gap-8 items-center">
                  <span className={`badge ${role === 'admin' ? 'badge-green' : role === 'chef' ? 'badge-orange' : 'badge-gray'}`}>
                    {ROLE_ICONS[role]} {ROLE_LABELS[role]}
                  </span>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-light)' }}>Contact admin to change role</span>
                </div>
              </div>

              <div className="field">
                <label className="field-label">Username</label>
                <input type="text" className="input"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="your_username"
                />
                <span className="field-hint">Lowercase letters, numbers and underscores only</span>
              </div>

              <div className="field">
                <label className="field-label">Bio</label>
                <textarea className="input" rows={3}
                  value={bio} onChange={e => setBio(e.target.value)}
                  maxLength={300} placeholder="Tell the community about yourself…"
                />
                <span className="field-hint">{bio.length} / 300</span>
              </div>

              <button
                className={`btn btn-primary${saving ? ' btn-loading' : ''}`}
                onClick={saveProfile} disabled={saving} style={{ height: 42 }}
              >
                {saving ? '' : 'Save profile'}
              </button>
            </div>
          )}

          {/* ── NUTRITION ───────────────────────────────────────────────── */}
          {activeTab === 'nutrition' && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 28 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>Nutrition settings</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 24 }}>
                Changes here flag your meal plan for regeneration.
              </p>

              {/* Fitness goal */}
              <div className="field">
                <label className="field-label">🎯 Fitness goal</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 10 }}>
                  {FITNESS_GOALS.map(g => (
                    <button key={g.value} onClick={() => setFitnessGoal(g.value)} style={{
                      padding: '14px', border: `1.5px solid ${fitnessGoal === g.value ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 'var(--r-lg)', background: fitnessGoal === g.value ? 'var(--primary-50)' : 'white',
                      cursor: 'pointer', textAlign: 'left', transition: 'all var(--duration) var(--ease)',
                    }}>
                      <div style={{ fontSize: '1.3rem', marginBottom: 5 }}>{g.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{g.label}</div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 2 }}>{g.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Calorie target */}
              <div className="field">
                <label className="field-label">
                  🔥 Daily calorie target: <strong style={{ color: 'var(--primary)' }}>{kcalTarget.toLocaleString()} kcal</strong>
                </label>
                <input type="range" className="range-input"
                  min={1200} max={4500} step={50}
                  value={kcalTarget} onChange={e => setKcalTarget(+e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  <span>1,200</span><span>4,500 kcal</span>
                </div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="number" className="input"
                    value={kcalTarget} min={1200} max={4500} step={50}
                    onChange={e => setKcalTarget(Math.max(1200, Math.min(4500, +e.target.value)))}
                    style={{ maxWidth: 130 }}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>or type a value</span>
                </div>
              </div>

              {/* Diet type */}
              <div className="field">
                <label className="field-label">🥗 Diet preference</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 10 }}>
                  {DIET_TYPES.map(d => (
                    <button key={d.value} onClick={() => setDietType(d.value)} style={{
                      padding: '12px 14px', border: `1.5px solid ${dietType === d.value ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 'var(--r-lg)', background: dietType === d.value ? 'var(--primary-50)' : 'white',
                      cursor: 'pointer', textAlign: 'left', transition: 'all var(--duration) var(--ease)',
                    }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{d.icon}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{d.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{
                background: 'rgba(255,122,0,0.06)', border: '1px solid rgba(255,122,0,0.2)',
                borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 20,
                fontSize: '0.82rem', color: 'var(--accent-dark)',
              }}>
                ⚠️ Saving will mark your weekly meal plan for regeneration. You will see a prompt on your dashboard.
              </div>

              <button
                className={`btn btn-primary${saving ? ' btn-loading' : ''}`}
                onClick={saveNutrition} disabled={saving} style={{ height: 42 }}
              >
                {saving ? '' : 'Save nutrition settings'}
              </button>
            </div>
          )}

          {/* ── PREFERENCES ─────────────────────────────────────────────── */}
          {activeTab === 'preferences' && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 28 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 24 }}>Preferences</h3>

              <div className="field">
                <label className="field-label">🌍 Language</label>
                <div className="flex flex-wrap gap-8">
                  {SUPPORTED_LANGUAGES.map(l => (
                    <button key={l.code} className={`filter-chip${lang === l.code ? ' active' : ''}`}
                      onClick={() => setLangState(l.code as LangCode)}>
                      {l.flag} {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary" onClick={savePreferences} style={{ height: 42 }}>
                Save preferences
              </button>
            </div>
          )}

          {/* ── PASSWORD ────────────────────────────────────────────────── */}
          {activeTab === 'password' && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 28 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 24 }}>Change password</h3>
              <div className="field">
                <label className="field-label">New password</label>
                <input type="password" className="input" placeholder="Min. 6 characters"
                  value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" />
              </div>
              <div className="field">
                <label className="field-label">Confirm new password</label>
                <input type="password" className="input" placeholder="Repeat new password"
                  value={confirmPw} onChange={e => setConfirmPw(e.target.value)} autoComplete="new-password" />
              </div>
              <button
                className={`btn btn-primary${saving ? ' btn-loading' : ''}`}
                onClick={changePassword} disabled={saving || !newPw || !confirmPw} style={{ height: 42 }}
              >
                {saving ? '' : 'Update password'}
              </button>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 12 }}>
                If you signed in with Google, you can set a password here to also enable email login.
              </p>
            </div>
          )}

          {/* ── DANGER ZONE ─────────────────────────────────────────────── */}
          {activeTab === 'danger' && (
            <div style={{ background: 'white', border: '1.5px solid #fecaca', borderRadius: 'var(--r-lg)', padding: 28 }}>
              <h3 style={{ fontSize: '1rem', color: '#dc2626', marginBottom: 8 }}>⚠️ Danger zone</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
                These actions are permanent and cannot be undone.
              </p>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                padding: '16px 20px', background: '#fef2f2',
                borderRadius: 'var(--r)', border: '1px solid #fecaca',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Delete account</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>All your data will be permanently removed</div>
                </div>
                <button onClick={deleteAccount} style={{
                  padding: '8px 18px', background: '#dc2626', color: 'white',
                  border: 'none', borderRadius: 'var(--r-full)',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                }}>
                  Delete account
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Toast */}
      {toast && (
        <div className="toast-root">
          <div className={`toast ${toastErr ? 'error' : 'success'}`}>
            <span className="toast-icon">{toastErr ? '❌' : '✅'}</span>
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
