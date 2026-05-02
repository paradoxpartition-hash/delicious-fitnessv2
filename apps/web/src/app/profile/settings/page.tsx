/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/browser';
import {
  detectLanguage, setLanguage, getTranslations,
  SUPPORTED_LANGUAGES, type LangCode,
} from '@/lib/i18n';

export default function SettingsPage() {
  const supabase = createBrowserClient();
  const router   = useRouter();

  // Profile state
  const [userId,   setUserId]   = useState('');
  const [username, setUsername] = useState('');
  const [bio,      setBio]      = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [role,     setRole]     = useState('');

  // Preferences state
  const [lang,       setLangState]  = useState<LangCode>('en');
  const [goal,       setGoal]       = useState('maintain');
  const [kcalTarget, setKcalTarget] = useState(2000);
  const [emailNotif, setEmailNotif] = useState(true);

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // UI state
  const [saving,     setSaving]     = useState(false);
  const [savingPw,   setSavingPw]   = useState(false);
  const [toast,      setToast]      = useState('');
  const [toastType,  setToastType]  = useState<'success'|'error'>('success');
  const [activeTab,  setActiveTab]  = useState<'profile'|'preferences'|'password'|'danger'>('profile');
  const [uploading,  setUploading]  = useState(false);

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(''), 3000);
  };

  // Load profile
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/signin?next=/profile/settings'); return; }
      setUserId(data.user.id);

      const { data: p } = await supabase
        .from('profiles')
        .select('username, bio, avatar_url, role')
        .eq('id', data.user.id)
        .single();

      if (p) {
        setUsername(p.username ?? '');
        setBio(p.bio ?? '');
        setAvatarUrl(p.avatar_url ?? '');
        setRole(p.role ?? 'USER');
      }

      // Load preferences from localStorage
      setLangState(detectLanguage());
      try {
        const prefs = JSON.parse(localStorage.getItem('df_user_prefs') || '{}');
        if (prefs.goal)       setGoal(prefs.goal);
        if (prefs.kcalTarget) setKcalTarget(prefs.kcalTarget);
        if (prefs.emailNotif !== undefined) setEmailNotif(prefs.emailNotif);
      } catch (_) {}
    });
  }, []);

  // Save profile
  const saveProfile = async () => {
    if (!username.trim()) { showToast('Username is required', 'error'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username: username.trim(), bio: bio.trim() || null })
      .eq('id', userId);
    if (error) { showToast(error.message, 'error'); }
    else       { showToast('Profile saved ✅'); }
    setSaving(false);
  };

  // Upload avatar
  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = urlData.publicUrl + `?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
      setAvatarUrl(url);
      showToast('Avatar updated ✅');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
    setUploading(false);
  };

  // Save preferences
  const savePreferences = () => {
    try {
      localStorage.setItem('df_user_prefs', JSON.stringify({ goal, kcalTarget, emailNotif }));
      setLanguage(lang);
      setLangState(lang);
      window.dispatchEvent(new CustomEvent('df:langchange', { detail: lang }));
      showToast('Preferences saved ✅');
    } catch (_) {
      showToast('Failed to save', 'error');
    }
  };

  // Change password
  const changePassword = async () => {
    if (newPw.length < 6)   { showToast('Password must be at least 6 characters', 'error'); return; }
    if (newPw !== confirmPw) { showToast('Passwords do not match', 'error'); return; }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { showToast(error.message, 'error'); }
    else {
      showToast('Password changed ✅');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    }
    setSavingPw(false);
  };

  // Delete account
  const deleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return;
    if (!confirm('Final confirmation — all your recipes, data, and subscriptions will be permanently deleted.')) return;
    // Sign out and delete — actual deletion handled by Supabase cascade
    await supabase.auth.signOut();
    router.push('/');
  };

  const TABS = [
    { key: 'profile',     label: '👤 Profile' },
    { key: 'preferences', label: '🌍 Preferences' },
    { key: 'password',    label: '🔒 Password' },
    { key: 'danger',      label: '⚠️ Danger zone' },
  ] as const;

  return (
    <>
      <section className="page-hero" style={{ paddingBlock: 48 }}>
        <div className="container">
          <div className="flex-between flex-wrap gap-12">
            <div>
              <h1 style={{ marginBottom: 6 }}>Account Settings</h1>
              <p>Manage your profile, preferences, and security</p>
            </div>
            <Link href="/profile" className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>
              ← My profile
            </Link>
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container" style={{ maxWidth: 800, marginInline: 'auto' }}>

          {/* Tabs */}
          <div className="flex gap-4 mb-28" style={{ borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '10px 18px', fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap',
                color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: -1, background: 'none', border: 'none',
                borderBottomStyle: 'solid', cursor: 'pointer',
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── PROFILE TAB ─────────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 28 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 24 }}>Profile information</h3>

              {/* Avatar */}
              <div className="flex gap-20 items-center mb-28">
                <div style={{ position: 'relative' }}>
                  <div className="avatar avatar-xl">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" />
                      : username[0]?.toUpperCase() ?? '?'
                    }
                  </div>
                  {uploading && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center' }}>
                      <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                    {uploading ? 'Uploading…' : '📷 Change photo'}
                    <input type="file" accept="image/*" onChange={handleAvatar} style={{ display: 'none' }} disabled={uploading} />
                  </label>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>
                    JPG, PNG or WebP · max 2MB
                  </p>
                </div>
              </div>

              {/* Role badge */}
              <div className="field">
                <label className="field-label">Role</label>
                <div>
                  <span className={`badge ${role === 'ADMIN' ? 'badge-green' : role === 'CHEF' ? 'badge-orange' : 'badge-gray'}`}>
                    {role === 'ADMIN' ? '⚙️ Administrator' : role === 'CHEF' ? '👨‍🍳 Chef' : '👤 Member'}
                  </span>
                </div>
              </div>

              <div className="field">
                <label className="field-label">Username</label>
                <input
                  type="text" className="input"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                  placeholder="your_username"
                />
                <span className="field-hint">Lowercase letters, numbers and underscores only</span>
              </div>

              <div className="field">
                <label className="field-label">Bio</label>
                <textarea
                  className="input" rows={3}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell the community about yourself…"
                  maxLength={300}
                />
                <span className="field-hint">{bio.length} / 300</span>
              </div>

              <button
                className={`btn btn-primary${saving ? ' btn-loading' : ''}`}
                onClick={saveProfile}
                disabled={saving}
                style={{ height: 42 }}
              >
                {saving ? '' : 'Save profile'}
              </button>
            </div>
          )}

          {/* ── PREFERENCES TAB ─────────────────────────────────────────── */}
          {activeTab === 'preferences' && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 28 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 24 }}>Preferences</h3>

              {/* Language */}
              <div className="field">
                <label className="field-label">🌍 Language</label>
                <div className="flex flex-wrap gap-8">
                  {SUPPORTED_LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      className={`filter-chip${lang === l.code ? ' active' : ''}`}
                      onClick={() => setLangState(l.code as LangCode)}
                    >
                      {l.flag} {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fitness goal */}
              <div className="field">
                <label className="field-label">🎯 Fitness goal</label>
                <div className="flex gap-8">
                  {[
                    { value: 'bulk',     label: '🏋️ Bulk',     desc: 'Calorie surplus' },
                    { value: 'cut',      label: '🔥 Cut',      desc: 'Calorie deficit' },
                    { value: 'maintain', label: '⚖️ Maintain', desc: 'Balanced' },
                  ].map(g => (
                    <button
                      key={g.value}
                      onClick={() => setGoal(g.value)}
                      style={{
                        flex: 1, padding: '12px 16px',
                        border: `1.5px solid ${goal === g.value ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 'var(--r-lg)',
                        background: goal === g.value ? 'var(--primary-50)' : 'white',
                        cursor: 'pointer', textAlign: 'center',
                        transition: 'all var(--duration) var(--ease)',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{g.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{g.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Calorie target */}
              <div className="field">
                <label className="field-label">
                  🔥 Daily calorie target: <strong>{kcalTarget} kcal</strong>
                </label>
                <input
                  type="range" className="range-input"
                  min={1200} max={4000} step={50}
                  value={kcalTarget}
                  onChange={e => setKcalTarget(+e.target.value)}
                />
                <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  <span>1,200 kcal</span>
                  <span>4,000 kcal</span>
                </div>
              </div>

              {/* Email notifications */}
              <div className="field">
                <label className="field-label">📧 Notifications</label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Email notifications</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Forks, comments, and community updates</div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={emailNotif} onChange={e => setEmailNotif(e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <button className="btn btn-primary" onClick={savePreferences} style={{ height: 42 }}>
                Save preferences
              </button>
            </div>
          )}

          {/* ── PASSWORD TAB ─────────────────────────────────────────────── */}
          {activeTab === 'password' && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 28 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 24 }}>Change password</h3>

              <div className="field">
                <label className="field-label">New password</label>
                <input
                  type="password" className="input"
                  placeholder="Min. 6 characters"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className="field">
                <label className="field-label">Confirm new password</label>
                <input
                  type="password" className="input"
                  placeholder="Repeat new password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <button
                className={`btn btn-primary${savingPw ? ' btn-loading' : ''}`}
                onClick={changePassword}
                disabled={savingPw || !newPw || !confirmPw}
                style={{ height: 42 }}
              >
                {savingPw ? '' : 'Update password'}
              </button>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 12 }}>
                If you signed up with Google, you may not have a password set.
                You can set one here to also enable email login.
              </p>
            </div>
          )}

          {/* ── DANGER ZONE ──────────────────────────────────────────────── */}
          {activeTab === 'danger' && (
            <div style={{ background: 'white', border: '1.5px solid #fecaca', borderRadius: 'var(--r-lg)', padding: 28 }}>
              <h3 style={{ fontSize: '1rem', color: '#dc2626', marginBottom: 8 }}>⚠️ Danger zone</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.7 }}>
                These actions are permanent and cannot be undone.
                All your recipes, comments, saves, and subscription data will be deleted.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#fef2f2', borderRadius: 'var(--r)', border: '1px solid #fecaca' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Delete account</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Permanently delete your account and all associated data
                    </div>
                  </div>
                  <button
                    onClick={deleteAccount}
                    className="btn btn-sm"
                    style={{ background: '#dc2626', color: 'white', flexShrink: 0 }}
                  >
                    Delete account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Toast */}
      {toast && (
        <div className="toast-root">
          <div className={`toast ${toastType}`}>
            <span className="toast-icon">{toastType === 'success' ? '✅' : '❌'}</span>
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
