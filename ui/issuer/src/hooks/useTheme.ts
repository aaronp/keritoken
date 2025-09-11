import { useState, useEffect } from 'react'
import { loadAppState, saveAppState } from '@/lib/storage'

type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    // Load theme from storage
    const appState = loadAppState()
    setTheme(appState.preferences.theme)
  }, [])

  useEffect(() => {
    // Apply theme to document
    const root = window.document.documentElement
    
    root.classList.remove('light', 'dark')
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  const setThemeAndSave = (newTheme: Theme) => {
    setTheme(newTheme)
    
    // Save to storage
    const appState = loadAppState()
    appState.preferences.theme = newTheme
    saveAppState(appState)
  }

  return { theme, setTheme: setThemeAndSave }
}