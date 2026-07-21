'use client'

import React, { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Save, Palette, RefreshCw, Sparkles, MessageSquare, ShieldAlert, Sparkle, Layers } from 'lucide-react'
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

// 50 Professional Presets (25 Solid Themes, 25 Gradient Themes)
const PRESETS = [
  // --- SOLID THEMES (Index 0 - 24) ---
  { name: 'Google Corporate', primaryColor: '#1a73e8', bgColor: '#ffffff', bubbleUser: '#1a73e8', bubbleBot: '#f1f3f4', textColorUser: '#ffffff', textColorBot: '#202124', type: 'solid' },
  { name: 'Elegant Dark', primaryColor: '#8ab4f8', bgColor: '#121212', bubbleUser: '#303134', bubbleBot: '#202124', textColorUser: '#ffffff', textColorBot: '#e8eaed', type: 'solid' },
  { name: 'Corporate Slate', primaryColor: '#475569', bgColor: '#f8fafc', bubbleUser: '#475569', bubbleBot: '#f1f5f9', textColorUser: '#ffffff', textColorBot: '#0f172a', type: 'solid' },
  { name: 'Carbon Tech', primaryColor: '#3b82f6', bgColor: '#18181b', bubbleUser: '#27272a', bubbleBot: '#202023', textColorUser: '#ffffff', textColorBot: '#f4f4f5', type: 'solid' },
  { name: 'Atlantic Breeze', primaryColor: '#0284c7', bgColor: '#f0f9ff', bubbleUser: '#0284c7', bubbleBot: '#e0f2fe', textColorUser: '#ffffff', textColorBot: '#075985', type: 'solid' },
  { name: 'Lavender Mist', primaryColor: '#7c3aed', bgColor: '#faf5ff', bubbleUser: '#7c3aed', bubbleBot: '#f3e8ff', textColorUser: '#ffffff', textColorBot: '#5b21b6', type: 'solid' },
  { name: 'Forest Fresh', primaryColor: '#059669', bgColor: '#f0fdf4', bubbleUser: '#059669', bubbleBot: '#dcfce7', textColorUser: '#ffffff', textColorBot: '#065f46', type: 'solid' },
  { name: 'Warm Sunset', primaryColor: '#ea580c', bgColor: '#fff7ed', bubbleUser: '#ea580c', bubbleBot: '#ffedd5', textColorUser: '#ffffff', textColorBot: '#9a3412', type: 'solid' },
  { name: 'Coffee Stout', primaryColor: '#78350f', bgColor: '#fdf8f6', bubbleUser: '#78350f', bubbleBot: '#f5e6e0', textColorUser: '#ffffff', textColorBot: '#451a03', type: 'solid' },
  { name: 'Royal Crimson', primaryColor: '#be123c', bgColor: '#fff1f2', bubbleUser: '#be123c', bubbleBot: '#ffe4e6', textColorUser: '#ffffff', textColorBot: '#9f1239', type: 'solid' },
  { name: 'Midnight Teal', primaryColor: '#0f766e', bgColor: '#f0fdfa', bubbleUser: '#0f766e', bubbleBot: '#ccfbf1', textColorUser: '#ffffff', textColorBot: '#115e59', type: 'solid' },
  { name: 'Steel Metal', primaryColor: '#4b5563', bgColor: '#f3f4f6', bubbleUser: '#4b5563', bubbleBot: '#e5e7eb', textColorUser: '#ffffff', textColorBot: '#1f2937', type: 'solid' },
  { name: 'Plum Luxe', primaryColor: '#86198f', bgColor: '#fdf4ff', bubbleUser: '#86198f', bubbleBot: '#fae8ff', textColorUser: '#ffffff', textColorBot: '#701a75', type: 'solid' },
  { name: 'Minty Sage', primaryColor: '#0d9488', bgColor: '#f2fbf9', bubbleUser: '#0d9488', bubbleBot: '#d1fae5', textColorUser: '#ffffff', textColorBot: '#115e59', type: 'solid' },
  { name: 'Sand Castle', primaryColor: '#b45309', bgColor: '#fcfcf9', bubbleUser: '#d97706', bubbleBot: '#fef3c7', textColorUser: '#ffffff', textColorBot: '#78350f', type: 'solid' },
  { name: 'Charcoal Minimal', primaryColor: '#1e293b', bgColor: '#f8fafc', bubbleUser: '#334155', bubbleBot: '#e2e8f0', textColorUser: '#ffffff', textColorBot: '#0f172a', type: 'solid' },
  { name: 'Sakura Petal', primaryColor: '#db2777', bgColor: '#fdf2f8', bubbleUser: '#db2777', bubbleBot: '#fce7f3', textColorUser: '#ffffff', textColorBot: '#9d174d', type: 'solid' },
  { name: 'Gold Leaf', primaryColor: '#a16207', bgColor: '#fefcf6', bubbleUser: '#c2410c', bubbleBot: '#fef3c7', textColorUser: '#ffffff', textColorBot: '#78350f', type: 'solid' },
  { name: 'Olive Grove', primaryColor: '#4d7c0f', bgColor: '#f7fee7', bubbleUser: '#4d7c0f', bubbleBot: '#ecfccb', textColorUser: '#ffffff', textColorBot: '#3f6212', type: 'solid' },
  { name: 'Asphalt Dark', primaryColor: '#94a3b8', bgColor: '#0f172a', bubbleUser: '#1e293b', bubbleBot: '#334155', textColorUser: '#ffffff', textColorBot: '#f8fafc', type: 'solid' },
  { name: 'Deep Indigo', primaryColor: '#4338ca', bgColor: '#eef2ff', bubbleUser: '#4338ca', bubbleBot: '#e0e7ff', textColorUser: '#ffffff', textColorBot: '#312e81', type: 'solid' },
  { name: 'Nordic Snow', primaryColor: '#38bdf8', bgColor: '#f0f9ff', bubbleUser: '#0284c7', bubbleBot: '#f1f5f9', textColorUser: '#ffffff', textColorBot: '#0369a1', type: 'solid' },
  { name: 'Coral Beach', primaryColor: '#f43f5e', bgColor: '#fff5f5', bubbleUser: '#f43f5e', bubbleBot: '#ffe3e3', textColorUser: '#ffffff', textColorBot: '#c92a2a', type: 'solid' },
  { name: 'Orchid Velvet', primaryColor: '#a21caf', bgColor: '#fdf4ff', bubbleUser: '#a21caf', bubbleBot: '#fae8ff', textColorUser: '#ffffff', textColorBot: '#701a75', type: 'solid' },
  { name: 'Sky High', primaryColor: '#06b6d4', bgColor: '#ecfeff', bubbleUser: '#0891b2', bubbleBot: '#cffafe', textColorUser: '#ffffff', textColorBot: '#155e75', type: 'solid' },

  // --- GRADIENT THEMES (Index 25 - 49) ---
  { name: 'Obsidian Void', primaryColor: '#3b82f6', bgColor: 'linear-gradient(135deg, #090a0c 0%, #16171b 100%)', bubbleUser: '#2563eb', bubbleBot: '#1f2025', textColorUser: '#ffffff', textColorBot: '#f3f4f6', type: 'gradient' },
  { name: 'Emerald Peak', primaryColor: '#10b981', bgColor: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)', bubbleUser: '#059669', bubbleBot: '#052e26', textColorUser: '#ffffff', textColorBot: '#e6f4ea', type: 'gradient' },
  { name: 'Midnight Amethyst', primaryColor: '#a78bfa', bgColor: 'linear-gradient(135deg, #0f052d 0%, #2e1065 100%)', bubbleUser: '#7c3aed', bubbleBot: '#1e1b4b', textColorUser: '#ffffff', textColorBot: '#f5f3ff', type: 'gradient' },
  { name: 'Oceanic Abyssal', primaryColor: '#38bdf8', bgColor: 'linear-gradient(135deg, #031b33 0%, #082f49 100%)', bubbleUser: '#0284c7', bubbleBot: '#0b253a', textColorUser: '#ffffff', textColorBot: '#e0f2fe', type: 'gradient' },
  { name: 'Sunset Glow', primaryColor: '#f97316', bgColor: 'linear-gradient(135deg, #ffedd5 0%, #fee2e2 100%)', bubbleUser: '#ea580c', bubbleBot: '#ffffff', textColorUser: '#ffffff', textColorBot: '#7c2d12', type: 'gradient' },
  { name: 'Cyber Neon', primaryColor: '#f43f5e', bgColor: 'linear-gradient(135deg, #030008 0%, #1c0024 100%)', bubbleUser: '#db2777', bubbleBot: '#0e0018', textColorUser: '#ffffff', textColorBot: '#f472b6', type: 'gradient' },
  { name: 'Corporate Gold', primaryColor: '#d97706', bgColor: 'linear-gradient(135deg, #1e1b18 0%, #2d261e 100%)', bubbleUser: '#d97706', bubbleBot: '#1a1815', textColorUser: '#ffffff', textColorBot: '#fef3c7', type: 'gradient' },
  { name: 'Boreal Aurora', primaryColor: '#34d399', bgColor: 'linear-gradient(135deg, #041d1a 0%, #064e3b 100%)', bubbleUser: '#059669', bubbleBot: '#052e26', textColorUser: '#ffffff', textColorBot: '#d1fae5', type: 'gradient' },
  { name: 'Deep Space', primaryColor: '#6366f1', bgColor: 'linear-gradient(135deg, #050515 0%, #0f172a 100%)', bubbleUser: '#4f46e5', bubbleBot: '#0a0a20', textColorUser: '#ffffff', textColorBot: '#e0e7ff', type: 'gradient' },
  { name: 'Titanium Ice', primaryColor: '#475569', bgColor: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)', bubbleUser: '#475569', bubbleBot: '#ffffff', textColorUser: '#ffffff', textColorBot: '#0f172a', type: 'gradient' },
  { name: 'Electric Purple', primaryColor: '#c084fc', bgColor: 'linear-gradient(135deg, #12001e 0%, #2e0854 100%)', bubbleUser: '#9333ea', bubbleBot: '#120224', textColorUser: '#ffffff', textColorBot: '#fae8ff', type: 'gradient' },
  { name: 'Copper Patina', primaryColor: '#0f766e', bgColor: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', bubbleUser: '#0d9488', bubbleBot: '#334155', textColorUser: '#ffffff', textColorBot: '#ccfbf1', type: 'gradient' },
  { name: 'Desert Mirage', primaryColor: '#ea580c', bgColor: 'linear-gradient(135deg, #fffbeb 0%, #ffedd5 100%)', bubbleUser: '#d97706', bubbleBot: '#ffffff', textColorUser: '#ffffff', textColorBot: '#78350f', type: 'gradient' },
  { name: 'Glacier Blue', primaryColor: '#06b6d4', bgColor: 'linear-gradient(135deg, #ecfeff 0%, #e0f2fe 100%)', bubbleUser: '#0891b2', bubbleBot: '#ffffff', textColorUser: '#ffffff', textColorBot: '#155e75', type: 'gradient' },
  { name: 'Luxury Wine', primaryColor: '#be123c', bgColor: 'linear-gradient(135deg, #1c0008 0%, #4c0519 100%)', bubbleUser: '#be123c', bubbleBot: '#180004', textColorUser: '#ffffff', textColorBot: '#ffe4e6', type: 'gradient' },
  { name: 'Forest Twilight', primaryColor: '#10b981', bgColor: 'linear-gradient(135deg, #0b1a13 0%, #040e09 100%)', bubbleUser: '#059669', bubbleBot: '#12251c', textColorUser: '#ffffff', textColorBot: '#d1fae5', type: 'gradient' },
  { name: 'Sleek Chrome', primaryColor: '#6b7280', bgColor: 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)', bubbleUser: '#1f2937', bubbleBot: '#e5e7eb', textColorUser: '#ffffff', textColorBot: '#111827', type: 'gradient' },
  { name: 'Teal Lagoon', primaryColor: '#14b8a6', bgColor: 'linear-gradient(135deg, #0d5c56 0%, #042f2c 100%)', bubbleUser: '#0d9488', bubbleBot: '#053e3a', textColorUser: '#ffffff', textColorBot: '#ccfbf1', type: 'gradient' },
  { name: 'Rose Gold', primaryColor: '#f43f5e', bgColor: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)', bubbleUser: '#f43f5e', bubbleBot: '#ffffff', textColorUser: '#ffffff', textColorBot: '#881337', type: 'gradient' },
  { name: 'Royal Velvet', primaryColor: '#6d28d9', bgColor: 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)', bubbleUser: '#6d28d9', bubbleBot: '#17122b', textColorUser: '#ffffff', textColorBot: '#e0e7ff', type: 'gradient' },
  { name: 'Mint Meadow', primaryColor: '#10b981', bgColor: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', bubbleUser: '#059669', bubbleBot: '#ffffff', textColorUser: '#ffffff', textColorBot: '#065f46', type: 'gradient' },
  { name: 'Solar Eclipse', primaryColor: '#facc15', bgColor: 'linear-gradient(135deg, #09090b 0%, #1e1e1e 100%)', bubbleUser: '#ca8a04', bubbleBot: '#18181b', textColorUser: '#ffffff', textColorBot: '#fef08a', type: 'gradient' },
  { name: 'Ocean Mist', primaryColor: '#0ea5e9', bgColor: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', bubbleUser: '#0284c7', bubbleBot: '#ffffff', textColorUser: '#ffffff', textColorBot: '#0369a1', type: 'gradient' },
  { name: 'Burnt Amber', primaryColor: '#f97316', bgColor: 'linear-gradient(135deg, #451a03 0%, #1c0a00 100%)', bubbleUser: '#ea580c', bubbleBot: '#2d1405', textColorUser: '#ffffff', textColorBot: '#ffedd5', type: 'gradient' },
  { name: 'Carbon Stealth', primaryColor: '#6366f1', bgColor: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)', bubbleUser: '#4f46e5', bubbleBot: '#27272a', textColorUser: '#ffffff', textColorBot: '#f4f4f5', type: 'gradient' }
]

export default function CustomizeAi({ params }: { params: { aiId: string } }) {
  const [ai, setAi] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'solid' | 'gradient'>('solid')

  // Customization Form Settings
  const [settings, setSettings] = useState<ThemeSettings>({
    primaryColor: '#1a73e8',
    bgColor: '#ffffff',
    bubbleUser: '#1a73e8',
    bubbleBot: '#f1f3f4',
    textColorUser: '#ffffff',
    textColorBot: '#202124',
    welcomeMessage: 'Welcome to our customer support chatbot. How can we help you?',
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
        welcomeMessage: data.theme_settings.welcomeMessage || 'Welcome to our customer support chatbot. How can we help you?',
      })
    }
    setLoading(false)
  }

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setSettings(prev => ({
      ...prev,
      primaryColor: preset.primaryColor,
      bgColor: preset.bgColor,
      bubbleUser: preset.bubbleUser,
      bubbleBot: preset.bubbleBot,
      textColorUser: preset.textColorUser,
      textColorBot: preset.textColorBot,
    }))
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

  const filteredPresets = PRESETS.filter(p => p.type === activeTab)

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
            Pick from 50 professionally engineered layout themes. Individual color pickers are deactivated to preserve a premium visual look.
          </p>
        </div>

        {/* Customizer Layout */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Panel: presets selection & welcome msg */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Presets Card */}
            <div className="bg-white dark:bg-slate-950 border rounded-3xl p-6 shadow-md flex flex-col">
              <div className="flex items-center justify-between mb-4 border-b pb-3">
                <h3 className="text-base font-black flex items-center space-x-2">
                  <Palette className="h-4.5 w-4.5 text-blue-500" />
                  <span>Curated Style Catalog</span>
                </h3>
                <span className="text-[10px] bg-blue-500/10 text-primary font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  50 Presets Loaded
                </span>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl mb-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('solid')}
                  className={`flex-grow py-2 text-xs font-black rounded-xl transition flex items-center justify-center space-x-1.5 ${
                    activeTab === 'solid' 
                      ? 'bg-white dark:bg-slate-950 shadow-md text-slate-900 dark:text-white' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Classic Solids (25)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('gradient')}
                  className={`flex-grow py-2 text-xs font-black rounded-xl transition flex items-center justify-center space-x-1.5 ${
                    activeTab === 'gradient' 
                      ? 'bg-white dark:bg-slate-950 shadow-md text-slate-900 dark:text-white' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sparkle className="h-3.5 w-3.5" />
                  <span>Vibrant Gradients (25)</span>
                </button>
              </div>

              {/* Catalog Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                {filteredPresets.map((p, idx) => {
                  const isSelected = settings.bgColor === p.bgColor && settings.primaryColor === p.primaryColor
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500' 
                          : 'border-slate-200/60 dark:border-slate-800 hover:border-slate-400 bg-slate-50/50 dark:bg-slate-900/30'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-3.5 min-w-0">
                        <span className="text-xs font-extrabold truncate pr-1 text-slate-800 dark:text-slate-200">
                          {p.name}
                        </span>
                        <div
                          className="h-3 w-3 rounded-full border border-white/10 shrink-0"
                          style={{ backgroundColor: p.primaryColor }}
                        />
                      </div>

                      {/* Visual theme miniature mockup */}
                      <div 
                        className="w-full h-16 rounded-xl border dark:border-slate-800 p-2.5 flex flex-col justify-between"
                        style={{ background: p.bgColor }}
                      >
                        {/* Bot bubble mini */}
                        <div 
                          className="w-12 h-3 rounded-md border border-white/5 opacity-90 scale-[0.98] origin-left"
                          style={{ backgroundColor: p.bubbleBot }}
                        />
                        {/* User bubble mini */}
                        <div 
                          className="w-12 h-3 rounded-md border border-white/5 opacity-90 scale-[0.98] self-end origin-right"
                          style={{ backgroundColor: p.bubbleUser }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Inputs & Settings Form */}
            <div className="bg-white dark:bg-slate-950 border rounded-3xl p-6 shadow-md">
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <h3 className="text-base font-black mb-3">AI Welcome Message</h3>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Custom Greeting Text
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={settings.welcomeMessage}
                    onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                    placeholder="Hello! Welcome to our store. How can I help you today?"
                    className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                  />
                </div>

                {saveSuccess && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-2xl text-xs flex items-center space-x-2 animate-in fade-in">
                    <Sparkles className="h-4 w-4 text-green-500" />
                    <span>Theme configurations saved and published!</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-4 rounded-2xl font-bold gradient-btn flex items-center justify-center space-x-2 text-sm shadow-lg hover:shadow-blue-500/10 active:scale-[0.98] transition"
                >
                  <Save className="h-4.5 w-4.5" />
                  <span>{actionLoading ? 'Saving...' : 'Save Theme & Publish'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Panel: Live Mobile Mockup Preview */}
          <div className="lg:col-span-6 sticky top-24">
            <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-3 block text-center lg:text-left">
              Live Theme Preview (Visitor Window View)
            </span>

            {/* Chat preview frame */}
            <div
              className="w-full max-w-md mx-auto h-[480px] border dark:border-slate-800 shadow-2xl rounded-3xl overflow-hidden flex flex-col transition-all duration-300"
              style={{ background: settings.bgColor }}
            >
              {/* Preview Header */}
              <div
                className="px-5 py-3.5 flex items-center justify-between border-b"
                style={{ borderBottomColor: `${settings.bubbleBot}33` }}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm border border-white/5"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-xs block truncate" style={{ color: settings.textColorBot }}>
                      {ai?.ai_name || `${ai?.name || 'My'} Assistant`}
                    </span>
                    <span className="text-[9px] opacity-60 block mt-0.5" style={{ color: settings.textColorBot }}>
                      Active Theme Preview
                    </span>
                  </div>
                </div>
                <div
                  className="text-[9px] font-black px-2.5 py-1 rounded bg-slate-500/10 border uppercase tracking-wider opacity-60"
                  style={{ color: settings.textColorBot, borderColor: `${settings.bubbleBot}33` }}
                >
                  Demo
                </div>
              </div>

              {/* Chat preview messages stream */}
              <div className="flex-1 p-5 space-y-4.5 overflow-y-auto">
                
                {/* AI Welcome bubble */}
                <div className="flex justify-start items-start gap-2.5">
                  <div 
                    className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0 border border-white/5 text-[9px] font-bold"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    AI
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Bot
                    </span>
                    <div 
                      className="text-xs md:text-[13px] leading-relaxed font-medium"
                      style={{ color: settings.textColorBot }}
                    >
                      {settings.welcomeMessage}
                    </div>
                  </div>
                </div>

                {/* User Bubble */}
                <div className="flex justify-end items-start gap-2.5">
                  <div className="flex flex-col items-end">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      You
                    </span>
                    <div 
                      className="rounded-2xl px-3.5 py-2 text-xs md:text-[13px] leading-relaxed shadow-sm font-semibold rounded-tr-none text-right"
                      style={{ backgroundColor: settings.bubbleUser, color: settings.textColorUser }}
                    >
                      Can you show me the product catalog?
                    </div>
                  </div>
                </div>

                {/* AI text mock reply */}
                <div className="flex justify-start items-start gap-2.5">
                  <div 
                    className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0 border border-white/5 text-[9px] font-bold"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    AI
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Bot
                    </span>
                    <div 
                      className="text-xs md:text-[13px] leading-relaxed font-medium"
                      style={{ color: settings.textColorBot }}
                    >
                      Certainly! Let me retrieve our catalog entries and listings for you...
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Input mock capsule */}
              <div
                className="p-3.5 border-t bg-transparent shrink-0"
                style={{ borderTopColor: `${settings.bubbleBot}33` }}
              >
                <div
                  className="border rounded-xl flex items-center space-x-2 p-1 bg-white/5 border-slate-200/40"
                  style={{ borderColor: `${settings.bubbleBot}22`, background: `${settings.bubbleBot}07` }}
                >
                  <input
                    type="text"
                    disabled
                    placeholder="Message assistant..."
                    className="flex-1 bg-transparent border-0 outline-none px-3.5 py-2 text-xs opacity-50 cursor-not-allowed"
                    style={{ color: settings.textColorBot }}
                  />
                  <div
                    className="p-2 rounded-lg flex items-center justify-center text-white opacity-40 shrink-0"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    <Save className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-4 justify-center bg-slate-500/5 p-3 rounded-2xl border max-w-md mx-auto">
              <ShieldAlert className="h-4 w-4 shrink-0 text-slate-500" />
              <span>Color safety guards are active. Presets comply with premium business guidelines.</span>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
