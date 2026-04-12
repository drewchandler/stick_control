import { useCallback, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'stick-control-theme'

function preferredTheme() {
  if (typeof window === 'undefined') {
    return 'dark'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStoredTheme() {
  if (typeof window === 'undefined') {
    return null
  }
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : null
}

function applyThemeToRoot(theme) {
  if (typeof document === 'undefined') {
    return
  }
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.dataset.theme = theme
}

export default function useTheme() {
  const [theme, setTheme] = useState(() => readStoredTheme() ?? preferredTheme())

  useEffect(() => {
    applyThemeToRoot(theme)
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      toggleTheme,
    }),
    [theme, toggleTheme],
  )
}
