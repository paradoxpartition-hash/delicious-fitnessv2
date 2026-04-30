/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';

interface Toast {
  id:      string;
  message: string;
  type:    'default' | 'success' | 'error' | 'warn';
}

interface ToastCtx {
  toast:        (msg: string, type?: Toast['type']) => void;
  toastSuccess: (msg: string) => void;
  toastError:   (msg: string) => void;
}

const ToastContext = createContext<ToastCtx>({
  toast:        () => {},
  toastSuccess: () => {},
  toastError:   () => {},
});

export function useToast() { return useContext(ToastContext); }

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((message: string, type: Toast['type'] = 'default') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const ctx: ToastCtx = {
    toast:        add,
    toastSuccess: msg => add(msg, 'success'),
    toastError:   msg => add(msg, 'error'),
  };

  const ICONS: Record<Toast['type'], string> = {
    default: 'ℹ️',
    success: '✅',
    error:   '❌',
    warn:    '⚠️',
  };

  return (
    <ToastContext.Provider value={ctx}>
      <div className="toast-root" role="region" aria-label="Notifications">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast ${t.type !== 'default' ? t.type : ''}`}
            role="alert"
          >
            <span className="toast-icon">{ICONS[t.type]}</span>
            <span>{t.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(tt => tt.id !== t.id))}
              style={{
                marginLeft: 'auto', color: 'rgba(255,255,255,0.6)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '1rem', lineHeight: 1, padding: '0 0 0 8px',
              }}
              aria-label="Dismiss"
            >×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
