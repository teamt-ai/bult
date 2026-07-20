'use client'

import React, { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Save, Palette, RefreshCw, Sparkles, MessageSquare, ShieldAlert } from 'lucide-react'
import Link from 'next/link'

interface ThemeSettings {
  primaryColor: string
  bgColor: string
  bubbleUser: string
  bubbleBot: string
  textColorUser: string
  textColorBot: string
  welcomeMessage: string
}

const PRESETS = [
  {
    name: 'Google Corporate',
    primaryColor: '#1a73e8',
    bgColor: '#ffffff',
    bubbleUser: '#1a73e8',
    bubbleBot: '#f1f3f4',
    textColorUser: '#ffffff',
    textColorBot: '#202124',
    welcomeMessage: 'Hi! Welcome to our store. How can I help you today?',
  },
  {
    name: 'Elegant Dark',
    primaryColor: '#8ab4f8',
    bgColor: '#0f0f0f',
    bubbleUser: '#303134',
    bubbleBot: '#202124',
    textColorUser: '#ffffff',
    textColorBot: '#e8eaed',
    welcomeMessage: 'Hello. Ask us anything about our products or policies.',
  },
  {
    name: 'Lavender Mist',
    primaryColor: '#7c3aed',
    bgColor: '#faf5ff',
    bubbleUser: '#7c3aed',
    bubbleBot: '#f3e8ff',
    textColorUser: '#ffffff',
    textColorBot: '#5b21b6',
    welcomeMessage: 'Welcome! How can we assist you with our services?',
  },
  {
    name: 'Forest Fresh',
    primaryColor: '#059669',
    bgColor: '#f0fdf4',
    bubbleUser: '#059669',
    bubbleBot: '#dcfce7',
    textColorUser: '#ffffff',
    textColorBot: '#065f46',
    welcomeMessage: 'Hi there! We are glad you are here. How can we help?',
  },
  {
    name: 'Warm Sunset',
    primaryColor: '#ea580c',
    bgColor: '#fff7ed',
    bubbleUser: '#ea580c',
    bubbleBot: '#ffedd5',
    textColorUser: '#ffffff',
    textColorBot: '#9a3412',
    welcomeMessage: 'Hello! Welcome to our customer support. Ask us anything!',
  }
]

export default function CustomizeAi({ params }: { params: { aiId: string } }) {
  const [ai, setAi] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Customization Form Settings
  const [settings, setSettings] = useState<ThemeSettings>({
    primaryColor: '#1a73e8',
    bgColor: '#ffffff',
    bubbleUser: '#1a73e8',
    bubbleBot: '#f1f3f4',
    textColorUser: '#ffffff',
    textColorBot: '#202124',
    welcomeMessage: 'Welcome to our customer service chatbot. How can we help you?',
  })

  useEffect(() => {
    fetchAi()
  }, [])

  const fetchAi = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      window.location.href = '/dashboard'
      return
    }

    const { data, error } = await supabase
      .from('business_ais')
      .select('*')
      .eq('id', params.aiId)
      .single()

    if (error || !data) {
      window.location.href = '/dashboard'
      return
    }

    setAi(data)
    if (data.theme_settings) {
      setSettings({
        primaryColor: data.theme_settings.primaryColor || '#1a73e8',
        bgColor: data.theme_settings.bgColor || '#ffffff',
        bubbleUser: data.theme_settings.bubbleUser || '#1a73e8',
        bubbleBot: data.theme_settings.bubbleBot || '#f1f3f4',
        textColorUser: data.theme_settings.textColorUser || '#ffffff',
        textColorBot: data.theme_settings.textColorBot || '#202124',
        welcomeMessage: data.theme_settings.welcomeMessage || 'Welcome to our customer service chatbot. How can we help you?',
      })
    }
    setLoading(false)
  }

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setSettings({
      primaryColor: preset.primaryColor,
      bgColor: preset.bgColor,
      bubbleUser: preset.bubbleUser,
      bubbleBot: preset.bubbleBot,
      textColorUser: preset.textColorUser,
      textColorBot: preset.textColorBot,
      welcomeMessage: preset.welcomeMessage,
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    setSaveSuccess(false)

    const { error } = await supabase
      .from('business_ais')
      .update({
        theme_settings: settings,
      })
      .eq('id', params.aiId)

    if (!error) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
    setActionLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen grid-bg flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid-bg flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-1.5 text-sm font-semibold hover:text-primary transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Header */}
        <div className="border-b pb-6 mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Customize Chat Design: <span className="gradient-text">{ai?.name}</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Choose colors, welcome messages, and themes to match your business branding.
          </p>
        </div>

        {/* Main Interface Layout */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left panel: Customizer form */}
          <div className="lg:col-span-5 space-y-6">
            {/* Presets card */}
            <div className="bg-white dark:bg-slate-950 border rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-bold mb-3 flex items-center space-x-1.5">
                <Palette className="h-4 w-4 text-primary" />
                <span>Theme Presets</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Choose a pre-configured elegant style or design your own below.
              </p>

              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="text-xs px-3 py-2 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold flex items-center space-x-1.5 transition"
                  >
                    <div
                      className="h-3 w-3 rounded-full border"
                      style={{ backgroundColor: p.primaryColor }}
                    />
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom inputs card */}
            <div className="bg-white dark:bg-slate-950 border rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-bold mb-4">Branding & Colors</h3>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Welcome Message */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    Welcome Message
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.welcomeMessage}
                    onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Primary Theme Color */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    Primary / Button Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="h-9 w-9 rounded-lg border cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-1.5 text-sm outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Background Color */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    Chat Window Background
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={settings.bgColor}
                      onChange={(e) => setSettings({ ...settings, bgColor: e.target.value })}
                      className="h-9 w-9 rounded-lg border cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={settings.bgColor}
                      onChange={(e) => setSettings({ ...settings, bgColor: e.target.value })}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-1.5 text-sm outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  {/* User Bubble */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                      User Bubble
                    </label>
                    <input
                      type="color"
                      value={settings.bubbleUser}
                      onChange={(e) => setSettings({ ...settings, bubbleUser: e.target.value })}
                      className="h-9 w-full rounded-lg border cursor-pointer bg-transparent"
                    />
                  </div>

                  {/* User Text */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                      User Text
                    </label>
                    <input
                      type="color"
                      value={settings.textColorUser}
                      onChange={(e) => setSettings({ ...settings, textColorUser: e.target.value })}
                      className="h-9 w-full rounded-lg border cursor-pointer bg-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Assistant Bubble */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                      AI Bubble
                    </label>
                    <input
                      type="color"
                      value={settings.bubbleBot}
                      onChange={(e) => setSettings({ ...settings, bubbleBot: e.target.value })}
                      className="h-9 w-full rounded-lg border cursor-pointer bg-transparent"
                    />
                  </div>

                  {/* Assistant Text */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                      AI Text
                    </label>
                    <input
                      type="color"
                      value={settings.textColorBot}
                      onChange={(e) => setSettings({ ...settings, textColorBot: e.target.value })}
                      className="h-9 w-full rounded-lg border cursor-pointer bg-transparent"
                    />
                  </div>
                </div>

                {saveSuccess && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-xl text-xs flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-green-500" />
                    <span>Branding settings saved successfully!</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3.5 rounded-xl font-bold gradient-btn flex items-center justify-center space-x-2 text-sm"
                >
                  <Save className="h-4 w-4" />
                  <span>{actionLoading ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right panel: Live Preview */}
          <div className="lg:col-span-7 sticky top-24">
            <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3 block">
              Live Theme Preview
            </div>

            {/* Simulated Chat Interface Container */}
            <div
              className="w-full h-[500px] border shadow-xl rounded-3xl overflow-hidden flex flex-col transition-colors duration-300"
              style={{ backgroundColor: settings.bgColor }}
            >
              {/* Header */}
              <div
                className="px-6 py-4 flex items-center justify-between border-b"
                style={{ borderBottomColor: `${settings.bubbleBot}33` }}
              >
                <div className="flex items-center space-x-2.5">
                  <div
                    className="p-2 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm block" style={{ color: settings.textColorBot }}>
                      {ai?.name || 'My Assistant'}
                    </span>
                    <span className="text-[10px] opacity-60 block" style={{ color: settings.textColorBot }}>
                      Online
                    </span>
                  </div>
                </div>
                <div
                  className="text-xs font-bold px-3 py-1 rounded-full text-center cursor-not-allowed opacity-80"
                  style={{ backgroundColor: settings.primaryColor, color: '#ffffff' }}
                >
                  Share Link
                </div>
              </div>

              {/* Chat messages */}
              <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                {/* AI Welcome Message */}
                <div className="flex justify-start">
                  <div
                    className="max-w-[80%] rounded-2xl rounded-tl-none p-3.5 text-sm leading-relaxed"
                    style={{ backgroundColor: settings.bubbleBot, color: settings.textColorBot }}
                  >
                    {settings.welcomeMessage}
                  </div>
                </div>

                {/* User Message */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[80%] rounded-2xl rounded-tr-none p-3.5 text-sm leading-relaxed"
                    style={{ backgroundColor: settings.bubbleUser, color: settings.textColorUser }}
                  >
                    What are your pricing packages and terms?
                  </div>
                </div>

                {/* AI response placeholder */}
                <div className="flex justify-start">
                  <div
                    className="max-w-[80%] rounded-2xl rounded-tl-none p-3.5 text-sm leading-relaxed"
                    style={{ backgroundColor: settings.bubbleBot, color: settings.textColorBot }}
                  >
                    Let me check that for you... (I will only look up your custom database)
                  </div>
                </div>
              </div>

              {/* Chat Input */}
              <div
                className="p-4 border-t flex space-x-2"
                style={{ borderTopColor: `${settings.bubbleBot}33` }}
              >
                <input
                  type="text"
                  disabled
                  placeholder="Ask a question..."
                  className="flex-1 bg-slate-100/50 border-0 outline-none rounded-xl px-4 py-2.5 text-xs opacity-60 cursor-not-allowed"
                />
                <div
                  className="p-2.5 rounded-xl flex items-center justify-center text-white cursor-not-allowed opacity-80"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  <Save className="h-4 w-4" />
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-4 justify-center bg-slate-500/5 p-3 rounded-xl border">
              <ShieldAlert className="h-4 w-4 shrink-0 text-slate-500" />
              <span>Preview shows exact colors. Font and padding elements conform to standard accessible guides.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
