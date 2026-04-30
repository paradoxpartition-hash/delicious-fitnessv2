/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const LS_SUPER = 'df_supermarket_partners';
const LS_SUPP  = 'df_supplement_partners';

interface Partner { id: string; icon: string; name: string; url: string; active: boolean; }

const DEFAULT_SUPER: Partner[] = [
  { id:'1', icon:'🛒', name:'Albert Heijn',  url:'https://ah.nl',     active: true },
  { id:'2', icon:'🛒', name:'Jumbo',         url:'https://jumbo.com', active: true },
  { id:'3', icon:'🛒', name:'Lidl',          url:'https://lidl.nl',   active: true },
  { id:'4', icon:'🛒', name:'Aldi',          url:'https://aldi.nl',   active: true },
  { id:'5', icon:'🛒', name:'Plus Supermarkt', url:'#',               active: true },
  { id:'6', icon:'🛒', name:'Dirk',          url:'#',                 active: true },
];
const DEFAULT_SUPP: Partner[] = [
  { id:'1', icon:'💊', name:'Myprotein',         url:'https://myprotein.com',   active: true },
  { id:'2', icon:'💊', name:'Body & Fit',        url:'https://bodyandfit.com',  active: true },
  { id:'3', icon:'💊', name:'XXL Nutrition',     url:'#',                       active: true },
  { id:'4', icon:'💊', name:'Bulk',              url:'https://bulk.com',        active: true },
  { id:'5', icon:'💊', name:'Optimum Nutrition', url:'#',                       active: true },
  { id:'6', icon:'💊', name:'Scitec',            url:'#',                       active: true },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
}

function PartnerTable({
  title, partners, onToggle, onRemove, onAdd, icon,
}: {
  title: string; partners: Partner[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd:    (name: string, url: string) => void;
  icon:     string;
}) {
  const [name, setName] = useState('');
  const [url,  setUrl]  = useState('');

  return (
    <div className="admin-card">
      <div className="admin-card-title">{icon} {title}</div>
      <p className="admin-card-sub">
        {partners.filter(p => p.active).length} of {partners.length} active · shown in the homepage slider
      </p>

      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table className="data-table" style={{ minWidth: 500 }}>
          <thead>
            <tr>
              <th>Partner</th>
              <th>URL</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {partners.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.icon} {p.name}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  {p.url !== '#' ? (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>{p.url}</a>
                  ) : '—'}
                </td>
                <td><Toggle checked={p.active} onChange={() => onToggle(p.id)} /></td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#dc2626', fontSize: '0.82rem' }}
                    onClick={() => onRemove(p.id)}
                  >Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add new */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
        <div className="field" style={{ margin: 0 }}>
          <label className="field-label">Partner name</label>
          <input type="text" className="input" placeholder="e.g. Spar" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name.trim() && (onAdd(name.trim(), url.trim() || '#'), setName(''), setUrl(''))} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label className="field-label">URL (optional)</label>
          <input type="url" className="input" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} />
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { if (name.trim()) { onAdd(name.trim(), url.trim() || '#'); setName(''); setUrl(''); } }}
          style={{ height: 40 }}
        >+ Add</button>
      </div>
    </div>
  );
}

export default function AdminPartnersPage() {
  const [super_, setSuper] = useState<Partner[]>(DEFAULT_SUPER);
  const [supp,   setSupp]  = useState<Partner[]>(DEFAULT_SUPP);
  const [toast,  setToast] = useState('');

  useEffect(() => {
    try {
      const s = localStorage.getItem(LS_SUPER); if (s) setSuper(JSON.parse(s));
      const p = localStorage.getItem(LS_SUPP);  if (p) setSupp(JSON.parse(p));
    } catch (_) {}
  }, []);

  const save = (type: 'super' | 'supp', list: Partner[]) => {
    localStorage.setItem(type === 'super' ? LS_SUPER : LS_SUPP, JSON.stringify(list));
    setToast('Saved ✅'); setTimeout(() => setToast(''), 2000);
  };

  const toggleSuper = (id: string) => { const n = super_.map(p => p.id===id?{...p,active:!p.active}:p); setSuper(n); save('super',n); };
  const removeSuper = (id: string) => { const n = super_.filter(p=>p.id!==id); setSuper(n); save('super',n); };
  const addSuper    = (name: string, url: string) => { const n=[...super_,{id:Date.now().toString(),icon:'🛒',name,url,active:true}]; setSuper(n); save('super',n); };

  const toggleSupp = (id: string) => { const n = supp.map(p => p.id===id?{...p,active:!p.active}:p); setSupp(n); save('supp',n); };
  const removeSupp = (id: string) => { const n = supp.filter(p=>p.id!==id); setSupp(n); save('supp',n); };
  const addSupp    = (name: string, url: string) => { const n=[...supp,{id:Date.now().toString(),icon:'💊',name,url,active:true}]; setSupp(n); save('supp',n); };

  return (
    <div className="admin-wrap">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <Link href="/" className="logo" style={{ color: 'white' }}>
            <div className="logo-mark">🥗</div>
            <span style={{ color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Admin</span>
          </Link>
        </div>
        <nav className="admin-nav">
          <Link href="/admin" className="admin-nav-link"><span className="icon">🏠</span>Overview</Link>
          <Link href="/admin/homepage" className="admin-nav-link"><span className="icon">🎛️</span>Homepage sections</Link>
          <Link href="/admin/partners" className="admin-nav-link active"><span className="icon">🤝</span>Partners</Link>
          <Link href="/admin" className="admin-nav-link"><span className="icon">🍽️</span>Recipes</Link>
          <Link href="/admin" className="admin-nav-link"><span className="icon">👥</span>Users</Link>
          <Link href="/admin" className="admin-nav-link"><span className="icon">📊</span>Analytics</Link>
        </nav>
      </aside>

      <div className="admin-content">
        <div className="admin-header">
          <h1>Partner Sliders</h1>
          <p>Manage which partner logos appear in the homepage sliders. Changes save instantly to LocalStorage.</p>
        </div>

        {toast && (
          <div className="toast-root">
            <div className="toast success"><span className="toast-icon">✅</span>{toast}</div>
          </div>
        )}

        <PartnerTable title="Supermarket Partners" partners={super_} icon="🛒"
          onToggle={toggleSuper} onRemove={removeSuper} onAdd={addSuper} />
        <PartnerTable title="Supplement Partners" partners={supp} icon="💊"
          onToggle={toggleSupp} onRemove={removeSupp} onAdd={addSupp} />
      </div>
    </div>
  );
}
