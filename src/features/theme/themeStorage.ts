/** Keep in sync with the inline boot script in index.html */
export const THEME_STORAGE_KEY = 'expense-splitter-theme'

export type Theme = 'light' | 'dark'

export function readStoredTheme(): Theme | null {
  if (typeof localStorage === 'undefined') return null
  const value = localStorage.getItem(THEME_STORAGE_KEY)
  return value === 'light' || value === 'dark' ? value : null
}

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveInitialTheme(): Theme {
  return readStoredTheme() ?? getSystemTheme()
}
