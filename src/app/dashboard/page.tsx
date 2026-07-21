'use client'

import React, { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { Plus, Bot, Link2, Settings, Database, MessageSquare, ChevronRight, Eye, RefreshCw, AlertCircle, LayoutGrid, Upload, Building, MapPin } from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isSignUp, setIsSignUp] = useState(false)

  // Auth Inputs
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')

  // AI Creator State
  const [ais, setAis] = useState<any[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newAiName, setNewAiName] = useState('')
  const [newAiSlug, setNewAiSlug] = useState('')
  const [newAiDesc, setNewAiDesc] = useState('')
  const [newAiLocation, setNewAiLocation] = useState('')
  const [newAiLogoUrl, setNewAiLogoUrl] = useState('')
  const [newAiBotName, setNewAiBotName] = useState('')
  const [newAiBotLogoUrl, setNewAiBotLogoUrl] = useState('')
  const [createError, setCreateError] = useState('')
  
  const [logoUploading, setLogoUploading] = useState(false)
  const [botLogoUploading, setBotLogoUploading] = useState(false)
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({})

  const handleCopyLink = (slug: string, id: string) => {
    if (typeof window === 'undefined') return
    const link = `${window.location.origin}/chat/${slug}`
    navigator.clipboard.writeText(link)
    setCopiedStates(prev => ({ ...prev, [id]: true }))
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [id]: false }))
    }, 2000)
  }

  useEffect(() => {
    // Get Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        fetchAis(session.user.id)
      }
    })

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchAis(session.user.id)
      } else {
        setAis([])
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchAis = async (userId: string) => {
    const { data, error } = await supabase
      .from('business_ais')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setAis(data)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthMessage('')

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined
        }
      })
      if (error) {
        setAuthError(error.message)
      } else {
        setAuthMessage('Account created! If email verification is enabled, check your inbox to activate your account.')
        // In local/supabase setup, users are sometimes auto-signed in or need verification.
        if (data.user) {
          setUser(data.user)
        }
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setAuthError(error.message)
      } else {
        setUser(data.user)
        fetchAis(data.user.id)
      }
    }
  }

  const uploadImageToStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 9)}.${fileExt}`
    const filePath = `new-ai-temp/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('business-assets')
      .upload(filePath, file)

    if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage
      .from('business-assets')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const url = await uploadImageToStorage(file)
      setNewAiLogoUrl(url)
    } catch (err: any) {
      alert('Logo upload failed: ' + err.message)
    } finally {
      setLogoUploading(false)
    }
  }

  const handleBotLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBotLogoUploading(true)
    try {
      const url = await uploadImageToStorage(file)
      setNewAiBotLogoUrl(url)
    } catch (err: any) {
      alert('AI Logo upload failed: ' + err.message)
    } finally {
      setBotLogoUploading(false)
    }
  }

  const handleCreateAi = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')

    if (!newAiName.trim()) {
      setCreateError('Business Name is required')
      return
    }

    const slug = newAiSlug.trim()
      ? newAiSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '')
      : newAiName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-')

    if (!slug) {
      setCreateError('Invalid slug generation. Please specify a clean URL slug.')
      return
    }

    const { data, error } = await supabase.from('business_ais').insert({
      name: newAiName.trim(),
      slug: slug,
      description: newAiDesc.trim(),
      location: newAiLocation.trim(),
      logo_url: newAiLogoUrl,
      ai_name: newAiBotName.trim(),
      ai_logo_url: newAiBotLogoUrl,
      creator_id: user.id
    }).select().single()

    if (error) {
      setCreateError(error.code === '23505' ? 'This URL Slug is already taken' : error.message)
    } else {
      setIsCreating(false)
      setNewAiName('')
      setNewAiSlug('')
      setNewAiDesc('')
      setNewAiLocation('')
      setNewAiLogoUrl('')
      setNewAiBotName('')
      setNewAiBotLogoUrl('')
      fetchAis(user.id)
    }
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
        {!user ? (
          /* Auth Form Card */
          <div className="max-w-md mx-auto mt-12 bg-white dark:bg-zinc-950 rounded-3xl border shadow-2xl overflow-hidden card-gradient">
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black tracking-tight">
                  Welcome to Bul<span className="gradient-text">t</span>
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                  {isSignUp ? 'Create your business owner account' : 'Sign in to manage your custom AIs'}
                </p>
              </div>

              {authError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {authMessage && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-xl text-xs">
                  {authMessage}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <button type="submit" className="w-full py-3 rounded-xl font-bold gradient-btn mt-2">
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              <div className="mt-6 text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setAuthError('')
                    setAuthMessage('')
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Dashboard Content */
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold">My Business Assistants</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Create, train, and configure custom AIs for your business.
                </p>
              </div>

              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center justify-center space-x-1.5 px-5 py-3 rounded-xl font-bold gradient-btn"
              >
                <Plus className="h-4 w-4" />
                <span>Create New AI</span>
              </button>
            </div>

            {/* Create Dialog Overlay */}
            {isCreating && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-zinc-950 border max-w-lg w-full rounded-3xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                  <h3 className="text-2xl font-bold mb-2">Create New Assistant</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                    Name your assistant and pick a unique web link for customers.
                  </p>

                  {createError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{createError}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateAi} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Business Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Acme Corporation"
                        value={newAiName}
                        onChange={(e) => {
                          setNewAiName(e.target.value)
                          // Auto slug suggest if empty
                          if (!newAiSlug) {
                            setNewAiSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-'))
                          }
                        }}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Business Logo</label>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="w-12 h-12 rounded-xl border bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0">
                          {newAiLogoUrl ? (
                            <img src={newAiLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <Building className="h-5 w-5 text-zinc-305" />
                          )}
                        </div>
                        <label className="relative cursor-pointer inline-flex items-center space-x-1.5 px-3 py-2 border rounded-xl text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition">
                          {logoUploading ? (
                            <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                          ) : (
                            <Upload className="h-3 w-3" />
                          )}
                          <span>{logoUploading ? 'Uploading...' : 'Upload Business Logo'}</span>
                          <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={logoUploading} className="hidden" />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">AI Assistant Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Barista Bot"
                        value={newAiBotName}
                        onChange={(e) => setNewAiBotName(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">AI Assistant Logo</label>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="w-12 h-12 rounded-xl border bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0">
                          {newAiBotLogoUrl ? (
                            <img src={newAiBotLogoUrl} alt="AI Logo" className="w-full h-full object-cover" />
                          ) : (
                            <Bot className="h-5 w-5 text-zinc-305" />
                          )}
                        </div>
                        <label className="relative cursor-pointer inline-flex items-center space-x-1.5 px-3 py-2 border rounded-xl text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition">
                          {botLogoUploading ? (
                            <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                          ) : (
                            <Upload className="h-3 w-3" />
                          )}
                          <span>{botLogoUploading ? 'Uploading...' : 'Upload AI Logo'}</span>
                          <input type="file" accept="image/*" onChange={handleBotLogoUpload} disabled={botLogoUploading} className="hidden" />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Location / Address</label>
                      <div className="flex items-center bg-zinc-50 dark:bg-zinc-900 border rounded-xl px-3 focus-within:ring-1 focus-within:ring-primary">
                        <MapPin className="h-4 w-4 text-zinc-400 shrink-0 mr-2" />
                        <input
                          type="text"
                          placeholder="e.g. 12 Bridge Street, London, or Online Only"
                          value={newAiLocation}
                          onChange={(e) => setNewAiLocation(e.target.value)}
                          className="flex-1 bg-transparent border-0 outline-none py-2.5 text-sm focus:ring-0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">URL Slug</label>
                      <div className="flex items-center bg-zinc-50 dark:bg-zinc-900 border rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-primary">
                        <span className="pl-3 py-2.5 text-sm opacity-50 select-none">bult.ai/chat/</span>
                        <input
                          type="text"
                          required
                          placeholder="acme"
                          value={newAiSlug}
                          onChange={(e) => setNewAiSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                          className="flex-1 bg-transparent border-0 outline-none px-1.5 py-2.5 text-sm focus:ring-0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Short Description</label>
                      <textarea
                        rows={3}
                        placeholder="What does your business do? (Helpful context for the AI)"
                        value={newAiDesc}
                        onChange={(e) => setNewAiDesc(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsCreating(false)}
                        className="flex-1 py-3 border rounded-xl font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition text-sm"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="flex-1 py-3 rounded-xl font-bold gradient-btn text-sm">
                        Create AI
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* List AIs */}
            {ais.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-zinc-950 rounded-3xl border p-8 max-w-2xl mx-auto shadow-sm">
                <div className="p-4 bg-blue-500/10 text-primary w-fit rounded-full mx-auto mb-4">
                  <Bot className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">No Assistants Created Yet</h3>
                <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm max-w-sm mx-auto">
                  Create your first business assistant to start feeding business information.
                </p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="mt-6 inline-flex items-center space-x-2 px-5 py-3 rounded-xl font-bold gradient-btn text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Your First AI</span>
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ais.map((ai) => (
                  <div
                    key={ai.id}
                    className="bg-white dark:bg-zinc-950 border rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-500/10 text-primary rounded-2xl">
                          <Bot className="h-6 w-6" />
                        </div>
                        <Link
                          href={`/chat/${ai.slug}`}
                          target="_blank"
                          className="flex items-center space-x-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Public Page</span>
                        </Link>
                      </div>

                      <h3 className="text-xl font-bold tracking-tight">{ai.name}</h3>
                      <p className="text-xs font-mono text-zinc-400 mt-1">bult.ai/chat/{ai.slug}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2">
                        {ai.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-2">
                      <Link
                        href={`/dashboard/${ai.id}/build`}
                        className="flex flex-col items-center justify-center p-2 rounded-xl border hover:bg-zinc-50 dark:hover:bg-zinc-900 transition text-center"
                      >
                        <LayoutGrid className="h-4 w-4 text-zinc-500 mb-1" />
                        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">Build</span>
                      </Link>

                      <Link
                        href={`/dashboard/${ai.id}/customize`}
                        className="flex flex-col items-center justify-center p-2 rounded-xl border hover:bg-zinc-50 dark:hover:bg-zinc-900 transition text-center"
                      >
                        <Settings className="h-4 w-4 text-zinc-500 mb-1" />
                        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">Customize</span>
                      </Link>

                      <button
                        onClick={() => handleCopyLink(ai.slug, ai.id)}
                        type="button"
                        className="flex flex-col items-center justify-center p-2 rounded-xl border hover:bg-zinc-50 dark:hover:bg-zinc-900 transition text-center focus:outline-none"
                      >
                        <Link2 className={`h-4 w-4 mb-1 transition-colors duration-200 ${copiedStates[ai.id] ? 'text-green-500' : 'text-zinc-500'}`} />
                        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 transition-colors duration-200">
                          {copiedStates[ai.id] ? 'Copied!' : 'Public Link'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
