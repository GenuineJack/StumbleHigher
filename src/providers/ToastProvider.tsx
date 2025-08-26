'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  // Convenience methods
  success: (message: string, options?: Partial<Toast>) => string;
  error: (message: string, options?: Partial<Toast>) => string;
  warning: (message: string, options?: Partial<Toast>) => string;
  info: (message: string, options?: Partial<Toast>) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DEFAULT_DURATION = 5000; // 5 seconds

function ToastComponent({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = React.useState(false);

  const handleRemove = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300); // Wait for exit animation
  }, [toast.id, onRemove]);

  // Auto-remove after duration
  React.useEffect(() => {
    if (toast.duration === 0) return; // Persist indefinitely

    const timer = setTimeout(handleRemove, toast.duration || DEFAULT_DURATION);
    return () => clearTimeout(timer);
  }, [toast.duration, handleRemove]);

  const getToastStyles = () => {
    const baseStyles = 'toast transform transition-all duration-300 ease-in-out';
    const typeStyles = {
      success: 'border-green-600 bg-green-900/20',
      error: 'border-red-600 bg-red-900/20',
      warning: 'border-yellow-600 bg-yellow-900/20',
      info: 'border-blue-600 bg-blue-900/20',
    };

    const enterStyles = isExiting
      ? 'translate-x-full opacity-0'
      : 'translate-x-0 opacity-100';

    return `${baseStyles} ${typeStyles[toast.type]} ${enterStyles}`;
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '';
    }
  };

  return (
    <div className={getToastStyles()}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-lg">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="font-semibold text-white mb-1">
              {toast.title}
            </div>
          )}
          <div className="text-sm text-zinc-300">
            {toast.message}
          </div>

          {toast.actions && toast.actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {toast.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    action.variant === 'primary'
                      ? 'bg-brand text-white hover:bg-brand-dark'
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleRemove}
          className="flex-shrink-0 p-1 text-zinc-400 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
        />
      ))}
    </div>,
    document.body
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 15);
    const newToast: Toast = {
      id,
      duration: DEFAULT_DURATION,
      ...toast,
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Convenience methods
  const success = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ ...options, type: 'success', message });
  }, [addToast]);

  const error = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ ...options, type: 'error', message });
  }, [addToast]);

  const warning = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ ...options, type: 'warning', message });
  }, [addToast]);

  const info = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ ...options, type: 'info', message });
  }, [addToast]);

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Hook for common toast patterns
export function useActionToast() {
  const { addToast } = useToast();

  const confirmAction = useCallback((
    message: string,
    onConfirm: () => void,
    options?: {
      title?: string;
      confirmLabel?: string;
      cancelLabel?: string;
    }
  ) => {
    return addToast({
      type: 'warning',
      title: options?.title || 'Confirm Action',
      message,
      duration: 0, // Don't auto-dismiss
      actions: [
        {
          label: options?.confirmLabel || 'Confirm',
          onClick: onConfirm,
          variant: 'primary',
        },
        {
          label: options?.cancelLabel || 'Cancel',
          onClick: () => {}, // Just dismiss
          variant: 'secondary',
        },
      ],
    });
  }, [addToast]);

  const promiseToast = useCallback(async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error?: string;
    }
  ): Promise<T> => {
    const loadingId = addToast({
      type: 'info',
      message: messages.loading,
      duration: 0, // Don't auto-dismiss
    });

    try {
      const result = await promise;

      // Remove loading toast and show success
      removeToast(loadingId);
      addToast({
        type: 'success',
        message: messages.success,
      });

      return result;
    } catch (error) {
      // Remove loading toast and show error
      removeToast(loadingId);
      addToast({
        type: 'error',
        message: messages.error || 'Something went wrong',
      });

      throw error;
    }
  }, [addToast]);

  return {
    confirmAction,
    promiseToast,
  };
}

// Type-specific toast hooks
export function useSuccessToast() {
  const { success } = useToast();
  return success;
}

export function useErrorToast() {
  const { error } = useToast();
  return error;
}

export function useWarningToast() {
  const { warning } = useToast();
  return warning;
}

export function useInfoToast() {
  const { info } = useToast();
  return info;
}
