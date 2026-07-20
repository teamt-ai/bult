'use client'

import React, { useEffect, useState } from 'react'
import { getRandomTheme, applyTheme } from '@/lib/theme'

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    // 1. Generate and apply random theme for gradients/accents
    const theme = getRandomTheme()
    applyTheme(theme)

    // 2. Set up dark mode based on system preference or local storage
    const stored = localStorage.getItem('bult-theme-mode') as 'light' | 'dark' | null
    if (stored) {
      setThemeMode(stored)
      document.documentElement.className = stored
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const defaultMode = prefersDark ? 'dark' : 'light'
      setThemeMode(defaultMode)
      document.documentElement.className = defaultMode
    }

    setMounted(true)
  }, [])

  const toggleThemeMode = () => {
    const nextMode = themeMode === 'light' ? 'dark' : 'light'
    setThemeMode(nextMode)
    localStorage.setItem('bult-theme-mode', nextMode)
    document.documentElement.className = nextMode
  }

  // Prevent flash by showing layout wrapper immediately but keeping style static till hydrated
  return (
    <div className="min-h-screen transition-colors duration-300">
      {/* Context provider or custom event dispatch can be set up if child components need to toggle mode */}
      <ThemeContext.Provider value={{ themeMode, toggleThemeMode, mounted }}>
        {children}
      </ThemeContext.Provider>
    </div>
  )
}

export const ThemeContext = React.createContext<{
  themeMode: 'light' | 'dark'
  toggleThemeMode: () => void
  mounted: boolean
}>({
  themeMode: 'dark',
  toggleThemeMode: () => {},
  mounted: false,
})
