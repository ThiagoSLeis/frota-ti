import { createContext, useContext } from 'react';

export const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast() precisa ser usado dentro de <ToastProvider>. Verifique src/main.jsx.');
  }
  return ctx;
}
