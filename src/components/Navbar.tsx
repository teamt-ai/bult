'use client'

import React, { useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import { ThemeContext } from './ThemeWrapper'
import { Sun, Moon, Sparkles, User, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
  const { themeMode, toggleThemeMode } = useContext(ThemeContext)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <header className="sticky top-0 z-50 w-full glass border-b transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight">
          <span className="font-extrabold text-2xl">
            Bul<span className="gradient-text">t</span>
          </span>
        </Link>

        <nav className="flex items-center space-x-4">
          <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition">
            Dashboard
          </Link>

          {/* Theme Mode Toggle Button */}
          <button
            onClick={toggleThemeMode}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Toggle theme mode"
          >
            {themeMode === 'light' ? (
              <Moon className="h-5 w-5 text-slate-700" />
            ) : (
              <Sun className="h-5 w-5 text-slate-300" />
            )}
          </button>

          {user ? (
            <div className="flex items-center space-x-3">
              <span className="hidden md:inline text-xs opacity-75 font-medium">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <Link
              href="/dashboard"
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-sm font-bold gradient-btn"
            >
              <Sparkles className="h-4 w-4" />
              <span>Get Started</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
