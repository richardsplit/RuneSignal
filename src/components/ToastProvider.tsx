'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

/* ─── Types ──────────────────────────────────────────────────────────── */
type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

/* ─── Context ────────────────────────────────────────────────────────── */
const ToastContext = createContext<ToastContextType | undefined>(undefined);

/* ─── Icon ───────────────────────────────────────────────────────────── */
function ToastIcon({ type }: { type: ToastType }) {
  const cls = `toast-icon${type === 'error' ? ' error' : type === 'info' ? ' info' : ''}`;
  return (
    <div className={cls} style={{ color: 'var(--text-inverse)' }}>
      {type === 'error' ? '✕' : type === 'info' ? 'i' : '✓'}
    </div>
  );
}

/* ─── Dismiss button ─────────────────────────────────────────────────── */
function DismissBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--text-tertiary)',
        padding: '0 0.125rem',
        fontSize: '0.75rem',
        lineHeight: 1,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      ✕
    </button>
  );
}

/* ─── Provider ───────────────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="toast"
            style={{
              borderColor: toast.type === 'error'
                ? 'var(--danger-border)'
                : toast.type === 'info'
                ? 'var(--info-border)'
                : 'var(--success-border)',
            }}
          >
            <ToastIcon type={toast.type} />
            <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              {toast.message}
            </span>
            <DismissBtn onClick={() => dismiss(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ─── Hook ───────────────────────────────────────────────────────────── */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

