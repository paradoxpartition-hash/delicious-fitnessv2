/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { SUPPORTED_LANGUAGES, detectLanguage, setLanguage, type LangCode } from '@/lib/i18n';

interface Props {
  onChange?: (code: LangCode) => void;
}

export default function LanguageSwitcher({ onChange }: Props) {
  const [current, setCurrent] = useState<LangCode>('en');
  const [open, setOpen]       = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrent(detectLanguage());
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (code: LangCode) => {
    setCurrent(code);
    setLanguage(code);
    setOpen(false);
    onChange?.(code);
    // Trigger page re-render via custom event so all components can react
    window.dispatchEvent(new CustomEvent('df:langchange', { detail: code }));
  };

  const meta = SUPPORTED_LANGUAGES.find(l => l.code === current)!;

  return (
    <div className={`lang-switcher${open ? ' open' : ''}`} ref={ref}>
      <button
        className="lang-trigger"
        onClick={() => setOpen(o => !o)}
        aria-label="Select language"
        aria-expanded={open}
      >
        <span className="flag">{meta.flag}</span>
        <span>{meta.code.toUpperCase()}</span>
        <span className="arrow">▾</span>
      </button>

      <div className="lang-menu" role="listbox" aria-label="Language options">
        {SUPPORTED_LANGUAGES.map(lang => (
          <div
            key={lang.code}
            className={`lang-item${current === lang.code ? ' active' : ''}`}
            role="option"
            aria-selected={current === lang.code}
            onClick={() => select(lang.code as LangCode)}
          >
            <span className="flag">{lang.flag}</span>
            <span>{lang.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
