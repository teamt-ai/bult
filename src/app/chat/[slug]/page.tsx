'use client'

import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Bot, 
  Send, 
  RefreshCw, 
  AlertCircle, 
  LogIn, 
  Mail, 
  MapPin, 
  Plus, 
  MessageSquare, 
  Menu, 
  X, 
  LogOut, 
  Lock,
  Compass,
  ArrowRight
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'model'
  content: string
}

export default function PublicChat({ params }: { params: { slug: string } }) {
  const [ai, setAi] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [errorText, setErrorText] = useState('')

  // ChatGPT-like Sidebar states
  const [sessionsList, setSessionsList] = useState<any[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Visitor Authentication State
  const [visitorEmail, setVisitorEmail] = useState<string>('')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchAi()
  }, [])

  useEffect(() => {
    if (ai) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user?.email) {
          const email = session.user.email
          setVisitorEmail(email)
          await loadUserSessionsAndHistory(email, ai.id)
        } else {
          setVisitorEmail('')
          setSessionsList([])
          setMessages([])
        }
      })
      return () => subscription.unsubscribe()
    }
  }, [ai])

  useEffect(() => {
    // Focus chat input when chat panel is shown
    if (visitorEmail && !loading) {
      setTimeout(() => chatInputRef.current?.focus(), 100)
    } else if (!visitorEmail && !loading) {
      setTimeout(() => emailInputRef.current?.focus(), 100)
    }
  }, [visitorEmail, loading])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const fetchAi = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('business_ais')
      .select('*')
      .eq('slug', params.slug)
      .single()

    if (error || !data) {
      setLoading(false)
      return
    }

    setAi(data)

    // Check if user is already logged in
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.email) {
      const email = session.user.email
      setVisitorEmail(email)
      await loadUserSessionsAndHistory(email, data.id)
    }

    setLoading(false)
  }

  const loadUserSessionsAndHistory = async (email: string, aiId: string) => {
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('ai_id', aiId)
      .eq('visitor_email', email)
      .order('created_at', { ascending: false })

    if (sessions && sessions.length > 0) {
      setSessionsList(sessions)
      // Automatically load the latest session
      setSessionId(sessions[0].visitor_session_id)
      await loadSessionMessages(sessions[0].visitor_session_id)
    } else {
      // Create first session
      const sessId = Math.random().toString(36).substring(2, 15)
      const { data: newSess } = await supabase
        .from('chat_sessions')
        .insert({
          ai_id: aiId,
          visitor_session_id: sessId,
          visitor_email: email
        })
        .select()
        .single()

      if (newSess) {
        setSessionsList([newSess])
        setSessionId(newSess.visitor_session_id)
        setMessages([])
      }
    }
  }

  const loadSessionMessages = async (visitorSessId: string) => {
    // Find the row ID of chat session
    const { data: sessData } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('visitor_session_id', visitorSessId)
      .single()

    if (sessData) {
      const { data: msgs, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessData.id)
        .order('created_at', { ascending: true })

      if (msgs && !error) {
        setMessages(msgs.map((m: any) => ({
          id: m.id,
          role: m.role === 'user' ? 'user' : 'model',
          content: m.content
        })))
      }
    }
  }

  const startNewChat = async () => {
    if (!ai || !visitorEmail) return
    setErrorText('')
    
    const sessId = Math.random().toString(36).substring(2, 15)
    const { data: newSess } = await supabase
      .from('chat_sessions')
      .insert({
        ai_id: ai.id,
        visitor_session_id: sessId,
        visitor_email: visitorEmail
      })
      .select()
      .single()

    if (newSess) {
      setSessionsList(prev => [newSess, ...prev])
      setSessionId(newSess.visitor_session_id)
      setMessages([])
    }
    setIsSidebarOpen(false)
  }

  const handleSelectSession = async (session: any) => {
    setSessionId(session.visitor_session_id)
    await loadSessionMessages(session.visitor_session_id)
    setIsSidebarOpen(false)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput.trim() || !passwordInput) return
    setAuthLoading(true)
    setErrorText('')

    const email = emailInput.trim().toLowerCase()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: passwordInput,
    })

    if (error) {
      setErrorText(error.message)
    }

    setAuthLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput.trim() || !passwordInput) return
    setAuthLoading(true)
    setErrorText('')

    const email = emailInput.trim().toLowerCase()

    const { error } = await supabase.auth.signUp({
      email,
      password: passwordInput,
    })

    if (error) {
      setErrorText(error.message)
    } else {
      alert('Verification email or account activation triggered! Check your inbox.')
    }

    setAuthLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setErrorText('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + `/chat/${params.slug}`
      }
    })
    if (error) {
      setErrorText(error.message)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setVisitorEmail('')
    setSessionsList([])
    setMessages([])
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isTyping) return
    setErrorText('')

    const userText = input.trim()
    setInput('')

    // Append user message local state
    const tempUserId = Math.random().toString(36).substring(7)
    const userMsg: Message = { id: tempUserId, role: 'user', content: userText }
    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    try {
      // Keep only last 8 messages for active context history
      const recentHistory = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aiId: ai.id,
          message: userText,
          sessionId: sessionId,
          visitorEmail: visitorEmail,
          history: recentHistory,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      const botMsg: Message = {
        id: data.id || Math.random().toString(36).substring(7),
        role: 'model',
        content: data.reply,
      }

      setMessages((prev) => [...prev, botMsg])
    } catch (err: any) {
      console.error(err)
      setErrorText(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsTyping(false)
    }
  }

  // --- TEXT MARKDOWN / WHATSAPP STYLE PARSER ---
  const parseInlineStyles = (txt: string) => {
    // 1. Escape HTML entities
    let html = txt
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // 2. Monospace blocks: ```code```
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-black/10 dark:bg-black/30 p-2 rounded-lg font-mono text-xs my-1.5 overflow-x-auto">$1</pre>')
    // 3. Inline monospace: `code`
    html = html.replace(/`([^`]+)`/g, '<code class="bg-black/10 dark:bg-black/30 px-1.5 py-0.5 rounded font-mono text-xs">$1</code>')

    // 4. Bold: **text** and *text*
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*([^*]+)\*/g, '<strong>$1</strong>')

    // 5. Underline: __text__
    html = html.replace(/__([^_]+)__/g, '<u>$1</u>')
    // 6. Italic: _text_
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>')

    // 7. Strikethrough: ~~text~~ and ~text~
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>')
    html = html.replace(/~([^~]+)~/g, '<del>$1</del>')

    // 8. Replace line breaks with HTML line breaks
    html = html.replace(/\n/g, '<br />')

    return <span dangerouslySetInnerHTML={{ __html: html }} />
  }

  const renderMessageContent = (content: string | null | undefined) => {
    if (!content) return ''
    const imgRegex = /!\[(.*?)\]\((.*?)\)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = imgRegex.exec(content)) !== null) {
      const index = match.index
      if (index > lastIndex) {
        const txt = content.substring(lastIndex, index)
        parts.push(<span key={`txt-${lastIndex}`}>{parseInlineStyles(txt)}</span>)
      }
      const alt = match[1]
      const src = match[2]
      parts.push(
        <div key={`img-${index}`} className="my-3 max-w-sm rounded-2xl overflow-hidden border shadow-sm bg-slate-100 dark:bg-slate-900">
          <img src={src} alt={alt} className="w-full h-48 object-cover" />
          <div className="px-3 py-2 text-[11px] opacity-75 border-t italic font-sans truncate text-center">
            {alt || 'Product Image'}
          </div>
        </div>
      )
      lastIndex = imgRegex.lastIndex
    }

    if (lastIndex < content.length) {
      const txt = content.substring(lastIndex)
      parts.push(<span key={`txt-${lastIndex}`}>{parseInlineStyles(txt)}</span>)
    }

    return parts.length > 0 ? parts : parseInlineStyles(content)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!ai) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-extrabold">Assistant Not Found</h1>
        <p className="text-slate-400 mt-2 max-w-sm">
          The link you followed may be incorrect, or the owner may have removed this chatbot.
        </p>
      </div>
    )
  }

  const theme = ai.theme_settings || {
    primaryColor: '#1a73e8',
    bgColor: '#ffffff',
    bubbleUser: '#1a73e8',
    bubbleBot: '#f1f3f4',
    textColorUser: '#ffffff',
    textColorBot: '#202124',
    welcomeMessage: 'Hello! How can I assist you today?',
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-0 md:p-4 transition-colors duration-300"
      style={{ backgroundColor: theme.bgColor }}
    >
      <div
        className="w-full max-w-5xl h-screen md:h-[720px] border shadow-2xl md:rounded-3xl flex overflow-hidden relative"
        style={{ borderColor: `${theme.bubbleBot}44`, backgroundColor: theme.bgColor }}
      >
        {/* ChatGPT-style Collapsible Left Sidebar */}
        {visitorEmail && (
          <>
            {/* Desktop Sidebar / Mobile overlay */}
            <div
              className={`fixed inset-0 z-30 bg-black/50 md:hidden transition-opacity ${
                isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
              onClick={() => setIsSidebarOpen(false)}
            />

            <div
              className={`w-72 border-r flex flex-col shrink-0 bg-slate-50 dark:bg-slate-950 z-40 md:z-10 md:static fixed top-0 bottom-0 left-0 transition-transform duration-300 md:translate-x-0 ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
              style={{ borderRightColor: `${theme.bubbleBot}33` }}
            >
              {/* Sidebar Header */}
              <div className="p-4 border-b flex items-center justify-between" style={{ borderBottomColor: `${theme.bubbleBot}33` }}>
                <div className="flex items-center space-x-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white overflow-hidden shrink-0 border"
                    style={{ backgroundColor: theme.primaryColor, borderColor: `${theme.bubbleBot}22` }}
                  >
                    {ai.ai_logo_url ? (
                      <img src={ai.ai_logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Bot className="h-4.5 w-4.5" />
                    )}
                  </div>
                  <span className="font-extrabold text-sm truncate" style={{ color: theme.textColorBot }}>
                    {ai.ai_name || `${ai.name} Assistant`}
                  </span>
                </div>
                
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="md:hidden p-1.5 hover:bg-slate-200 dark:hover:bg-slate-900 rounded-lg text-slate-500"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Start New Chat Button */}
              <button
                onClick={startNewChat}
                className="mx-4 my-3 p-3 flex items-center justify-center space-x-2 border border-dashed rounded-2xl hover:opacity-90 active:scale-95 transition font-bold text-xs"
                style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
              >
                <Plus className="h-4 w-4" />
                <span>Start New Chat</span>
              </button>

              {/* History list */}
              <div className="flex-1 overflow-y-auto px-4 space-y-2 py-2">
                <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1.5">
                  Conversation History
                </span>
                {sessionsList.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 font-medium">
                    No past sessions.
                  </div>
                ) : (
                  sessionsList.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSession(s)}
                      className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition truncate flex items-center space-x-2.5 ${
                        sessionId === s.visitor_session_id
                          ? 'text-white'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 border border-transparent'
                      }`}
                      style={
                        sessionId === s.visitor_session_id
                          ? { backgroundColor: theme.primaryColor }
                          : {}
                      }
                    >
                      <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
                      <span className="truncate">
                        Chat - {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {/* Sidebar Footer Account */}
              <div className="p-4 border-t flex flex-col gap-2" style={{ borderTopColor: `${theme.bubbleBot}33` }}>
                <div className="flex items-center justify-between min-w-0">
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      Logged in as
                    </span>
                    <span className="block text-xs font-bold truncate" style={{ color: theme.textColorBot }}>
                      {visitorEmail}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition shrink-0"
                    title="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Chat Main Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div
            className="px-6 py-4 flex items-center justify-between border-b shrink-0"
            style={{ borderBottomColor: `${theme.bubbleBot}33`, backgroundColor: theme.bgColor }}
          >
            <div className="flex items-center space-x-3">
              {visitorEmail && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-500 mr-1"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
              
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white overflow-hidden shrink-0 border"
                style={{ backgroundColor: theme.primaryColor, borderColor: `${theme.bubbleBot}33` }}
              >
                {ai.ai_logo_url ? (
                  <img src={ai.ai_logo_url} alt="AI Logo" className="w-full h-full object-cover" />
                ) : ai.logo_url ? (
                  <img src={ai.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Bot className="h-5 w-5" />
                )}
              </div>
              <div>
                <h1 className="font-extrabold text-sm md:text-base leading-tight" style={{ color: theme.textColorBot }}>
                  {ai.ai_name || `${ai.name} Assistant`}
                </h1>
                <span className="text-[10px] opacity-60 flex items-center gap-1 mt-0.5" style={{ color: theme.textColorBot }}>
                  <span>Official Assistant for {ai.name}</span>
                  {ai.location && (
                    <>
                      <span>•</span>
                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                      <span>{ai.location}</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] px-2 py-1 rounded bg-slate-500/10 border uppercase tracking-wider opacity-60 font-semibold" style={{ color: theme.textColorBot }}>
                Active Assistant
              </span>
            </div>
          </div>

          {/* 1. SECURE SIGN IN / SIGN UP MODAL */}
          {!visitorEmail ? (
            <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
              <div className="max-w-md w-full bg-white dark:bg-slate-950 border rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
                <div className="text-center space-y-4">
                  <div 
                    className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white overflow-hidden shadow-md border"
                    style={{ backgroundColor: theme.primaryColor, borderColor: `${theme.bubbleBot}44` }}
                  >
                    {ai.ai_logo_url ? (
                      <img src={ai.ai_logo_url} alt="AI Logo" className="w-full h-full object-cover" />
                    ) : ai.logo_url ? (
                      <img src={ai.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Bot className="h-7 w-7" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight" style={{ color: theme.textColorBot }}>
                      Chat with {ai.ai_name || `${ai.name} Assistant`}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Access official customer service, track your conversation history, and verify orders.
                    </p>
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
                  <button
                    onClick={() => setAuthMode('signin')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                      authMode === 'signin' 
                        ? 'bg-white dark:bg-slate-950 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setAuthMode('signup')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                      authMode === 'signup' 
                        ? 'bg-white dark:bg-slate-950 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                {errorText && (
                  <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-500 rounded-2xl text-xs flex items-center space-x-2 animate-in fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorText}</span>
                  </div>
                )}

                {/* Authentication Form */}
                <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Email Address</label>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900 border rounded-2xl px-3 focus-within:ring-1 focus-within:ring-primary transition">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
                      <input
                        type="email"
                        ref={emailInputRef}
                        required
                        placeholder="you@domain.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="flex-1 bg-transparent border-0 outline-none py-3 text-sm focus:ring-0"
                        style={{ color: theme.textColorBot }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Password</label>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900 border rounded-2xl px-3 focus-within:ring-1 focus-within:ring-primary transition">
                      <Lock className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="flex-1 bg-transparent border-0 outline-none py-3 text-sm focus:ring-0"
                        style={{ color: theme.textColorBot }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 rounded-2xl font-bold flex items-center justify-center space-x-2 text-white transition hover:opacity-90 active:scale-95 text-sm"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {authLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogIn className="h-4 w-4" />
                    )}
                    <span>{authLoading ? 'Loading...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                  </button>
                </form>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                  <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">or</span>
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                </div>

                {/* Google Login */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-3.5 border rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center justify-center space-x-2.5 transition text-sm text-slate-700 dark:text-slate-200"
                >
                  <Compass className="h-4.5 w-4.5 text-primary" />
                  <span>Sign In with Google</span>
                </button>
              </div>
            </div>
          ) : (
            /* 2. Interactive Chat Screen */
            <>
              {/* Message Panel */}
              <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
                {/* Welcome Message */}
                <div className="flex justify-start animate-in fade-in duration-200">
                  <div
                    className="max-w-[85%] rounded-2xl rounded-tl-none p-3.5 text-sm md:text-base leading-relaxed shadow-sm"
                    style={{ backgroundColor: theme.bubbleBot, color: theme.textColorBot }}
                  >
                    {renderMessageContent(theme.welcomeMessage)}
                  </div>
                </div>

                {/* Chat Messages */}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}>
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-sm md:text-base leading-relaxed shadow-sm ${
                        m.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'
                      }`}
                      style={{
                        backgroundColor: m.role === 'user' ? theme.bubbleUser : theme.bubbleBot,
                        color: m.role === 'user' ? theme.textColorUser : theme.textColorBot,
                      }}
                    >
                      {renderMessageContent(m.content)}
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div
                      className="rounded-2xl rounded-tl-none p-3.5 text-xs flex items-center space-x-1"
                      style={{ backgroundColor: theme.bubbleBot, color: theme.textColorBot }}
                    >
                      <span className="animate-bounce font-bold">.</span>
                      <span className="animate-bounce delay-100 font-bold">.</span>
                      <span className="animate-bounce delay-200 font-bold">.</span>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {errorText && (
                  <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-500 rounded-xl text-xs flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorText}</span>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Input Panel */}
              <form
                onSubmit={handleSend}
                className="p-4 border-t flex space-x-2 bg-white dark:bg-slate-900 shrink-0"
                style={{ borderTopColor: `${theme.bubbleBot}33`, backgroundColor: theme.bgColor }}
              >
                <input
                  type="text"
                  ref={chatInputRef}
                  required
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask ${ai.ai_name || ai.name} something...`}
                  className="flex-1 bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary outline-none transition animate-in fade-in duration-300"
                  style={{ color: theme.textColorBot }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="p-3.5 rounded-2xl flex items-center justify-center text-white transition hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </form>
            </>
          )}

          {/* Footer branding */}
          <div className="text-[9px] text-center pb-2 opacity-40 font-mono uppercase tracking-wider shrink-0" style={{ color: theme.textColorBot }}>
            Powered by Bult.AI
          </div>
        </div>
      </div>
    </div>
  )
}
