import { useCallback, useEffect, useState } from 'react';

import { THEME_STORAGE_KEY } from '../lib/constants.js';

function lerTemaInicial() {
  if (typeof document === 'undefined') return 'light';
  const atual = document.documentElement.dataset.theme;
  if (atual === 'dark' || atual === 'light') return atual;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState(lerTemaInicial);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      return;
    }
  }, [theme]);

  useEffect(() => {
    function onStorage(event) {
      if (event.key !== THEME_STORAGE_KEY) return;
      if (event.newValue === 'dark' || event.newValue === 'light') setThemeState(event.newValue);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((proximo) => {
    if (proximo === 'dark' || proximo === 'light') setThemeState(proximo);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((atual) => (atual === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleTheme };
}
