import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    // Add exit animation class
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    // Remove after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      if (timersRef.current[id]) {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
      }
    }, 250);
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = ++toastId;
    const toast = { id, type, title, message, duration, exiting: false };
    setToasts(prev => [...prev, toast]);

    // Auto-dismiss
    timersRef.current[id] = setTimeout(() => {
      removeToast(id);
    }, duration);

    return id;
  }, [removeToast]);

  const icons = {
    success: '✓',
    error: '✕',
    info: 'i',
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`toast toast--${toast.type}${toast.exiting ? ' toast-exit' : ''}`}
            style={{ '--toast-duration': `${toast.duration}ms` }}
          >
            <div className="toast-icon">{icons[toast.type]}</div>
            <div className="toast-body">
              {toast.title && <div className="toast-title">{toast.title}</div>}
              {toast.message && <div className="toast-message">{toast.message}</div>}
            </div>
            <button
              className="toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
            <div className="toast-progress" />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
