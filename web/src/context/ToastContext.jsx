/**
 * ToastContext — lightweight in-app notification system.
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast('Saved successfully!');           // default: info
 *   toast('Deleted.', 'success');
 *   toast('Something went wrong.', 'error');
 *   toast('Watch out.', 'warning');
 */
import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let _nextId = 1;

const TYPE_STYLES = {
  success: { bg: '#f0fdf4', border: '#22c55e', color: '#15803d', icon: '✓' },
  error:   { bg: '#fef2f2', border: '#ef4444', color: '#b91c1c', icon: '✕' },
  warning: { bg: '#fffbeb', border: '#f59e0b', color: '#92400e', icon: '⚠' },
  info:    { bg: '#eff6ff', border: '#3b82f6', color: '#1e40af', icon: 'ℹ' },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = _nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast Container */}
      <div style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.25rem',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.625rem',
        pointerEvents: 'none',
      }}>
        {toasts.map(({ id, message, type }) => {
          const s = TYPE_STYLES[type] ?? TYPE_STYLES.info;
          return (
            <div
              key={id}
              onClick={() => dismiss(id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.625rem',
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderLeft: `4px solid ${s.border}`,
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                minWidth: '280px',
                maxWidth: '400px',
                pointerEvents: 'auto',
                cursor: 'pointer',
                animation: 'toastIn 0.25s ease-out',
              }}
            >
              <span style={{ fontWeight: 800, color: s.border, fontSize: '0.95rem', lineHeight: 1.4, flexShrink: 0 }}>
                {s.icon}
              </span>
              <span style={{ fontSize: '0.875rem', color: s.color, lineHeight: 1.5, flex: 1 }}>
                {message}
              </span>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.4, flexShrink: 0 }}>✕</span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};
