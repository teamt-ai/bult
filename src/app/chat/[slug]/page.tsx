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
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Clock,
  HelpCircle,
  FileText,
  User
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
      .select('id, visitor_session_id, visitor_email, created_at, title')
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
          visitor_email: email,
          title: 'New Chat'
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
        visitor_email: visitorEmail,
        title: 'New Chat'
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

  const submitMessage = async (text: string) => {
    if (!text.trim() || isTyping) return
    setErrorText('')

    const userText = text.trim()

    // Save user message in local state
    const tempUserId = Math.random().toString(36).substring(7)
    const userMsg: Message = { id: tempUserId, role: 'user', content: userText }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setIsTyping(true)

    // Auto rename session based on first prompt
    if (messages.length === 0) {
      let generatedTitle = userText.length > 24 ? userText.substring(0, 22) + '...' : userText
      generatedTitle = generatedTitle.charAt(0).toUpperCase() + generatedTitle.slice(1)
      
      // Update in DB
      await supabase
        .from('chat_sessions')
        .update({ title: generatedTitle })
        .eq('visitor_session_id', sessionId)
        
      // Update locally
      setSessionsList(prev => prev.map(s => s.visitor_session_id === sessionId ? { ...s, title: generatedTitle } : s))
    }

    try {
      const recentHistory = updatedMessages.slice(-8).map((m) => ({
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
          history: recentHistory.slice(0, -1), // exclude the currently appended user msg
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input
    setInput('')
    submitMessage(text)
  }

  // --- TEXT MARKDOWN / WHATSAPP STYLE PARSER ---
  const parseInlineStyles = (txt: string) => {
    let html = txt
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Monospace blocks: ```code```
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-[#1e1e24] text-[#a9b2c3] p-3.5 rounded-2xl font-mono text-xs my-2.5 overflow-x-auto border border-white/5">$1</pre>')
    // Inline monospace: `code`
    html = html.replace(/`([^`]+)`/g, '<code class="bg-[#eef1f6] dark:bg-[#1e1e24] px-1.5 py-0.5 rounded font-mono text-xs font-semibold text-primary dark:text-primary-dark">$1</code>')

    // Bold: **text** and *text*
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*([^*]+)\*/g, '<strong>$1</strong>')

    // Underline: __text__
    html = html.replace(/__([^_]+)__/g, '<u>$1</u>')
    // Italic: _text_
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>')

    // Strikethrough: ~~text~~ and ~text~
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>')
    html = html.replace(/~([^~]+)~/g, '<del>$1</del>')

    // Line breaks
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
        <div key={`img-${index}`} className="my-3 max-w-sm rounded-3xl overflow-hidden border shadow-md bg-slate-100 dark:bg-slate-900 transition hover:scale-[1.01]">
          <img src={src} alt={alt} className="w-full h-48 object-cover" />
          <div className="px-4 py-2 text-[10px] opacity-75 border-t italic font-sans truncate text-center font-bold tracking-wide uppercase">
            {alt || 'Product Details'}
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
        <h1 className="text-3xl font-black">Assistant Not Found</h1>
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
      className="min-h-screen flex flex-col md:flex-row p-0 md:p-4 transition-colors duration-300"
      style={{ backgroundColor: theme.bgColor }}
    >
      <div
        className="flex-1 w-full max-w-7xl mx-auto h-screen md:h-[760px] border shadow-2xl md:rounded-3xl flex overflow-hidden relative"
        style={{ borderColor: `${theme.bubbleBot}33`, backgroundColor: theme.bgColor }}
      >
        {/* ChatGPT-style Sleek Left Sidebar */}
        {visitorEmail && (
          <>
            {/* Sidebar mobile Backdrop */}
            <div
              className={`fixed inset-0 z-30 bg-black/60 md:hidden transition-opacity duration-300 ${
                isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
              onClick={() => setIsSidebarOpen(false)}
            />

            <div
              className={`w-72 flex flex-col shrink-0 bg-[#0f1012] text-[#ececf1] z-40 md:z-10 md:static fixed top-0 bottom-0 left-0 transition-transform duration-300 md:translate-x-0 ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              {/* Sidebar Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white overflow-hidden shrink-0 border border-slate-800 bg-slate-900"
                  >
                    {ai.ai_logo_url ? (
                      <img src={ai.ai_logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Bot className="h-4.5 w-4.5 text-blue-500" />
                    )}
                  </div>
                  <span className="font-extrabold text-sm truncate">
                    {ai.ai_name || `${ai.name} Assistant`}
                  </span>
                </div>
                
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="md:hidden p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Start New Chat Button */}
              <button
                onClick={startNewChat}
                className="mx-4 my-4 p-3 flex items-center justify-center space-x-2 border border-slate-800 hover:border-slate-600 rounded-xl hover:bg-white/5 active:scale-95 transition font-bold text-xs text-[#ececf1]"
              >
                <Plus className="h-4 w-4 text-blue-500" />
                <span>New Chat</span>
              </button>

              {/* History list */}
              <div className="flex-1 overflow-y-auto px-3 space-y-1.5 py-1">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2 pl-2">
                  Conversation History
                </span>
                {sessionsList.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 font-medium">
                    No past sessions.
                  </div>
                ) : (
                  sessionsList.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSession(s)}
                      className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold transition truncate flex items-center space-x-2.5 ${
                        sessionId === s.visitor_session_id
                          ? 'bg-[#202123] text-white shadow-inner border border-white/5'
                          : 'hover:bg-[#202123]/60 text-slate-400 hover:text-[#ececf1]'
                      }`}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0 opacity-70 text-blue-500" />
                      <span className="truncate">
                        {s.title || `Chat - ${new Date(s.created_at).toLocaleDateString()}`}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {/* Sidebar Footer Account */}
              <div className="p-4 border-t border-slate-800 flex flex-col gap-2 bg-[#000]/20">
                <div className="flex items-center justify-between min-w-0">
                  <div className="min-w-0 flex-1 flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0 border border-slate-700">
                      <User className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wide">
                        Active Account
                      </span>
                      <span className="block text-[11px] font-bold truncate text-slate-300">
                        {visitorEmail}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition shrink-0"
                    title="Sign Out"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Chat Main Area Container */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30 dark:bg-slate-950/20">
          {/* Header */}
          <div
            className="px-6 py-4 flex items-center justify-between border-b shrink-0 bg-white dark:bg-slate-900 shadow-sm"
            style={{ borderBottomColor: `${theme.bubbleBot}22` }}
          >
            <div className="flex items-center space-x-3 min-w-0">
              {visitorEmail && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 mr-1"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
              
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white overflow-hidden shrink-0 border shadow-sm"
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
              <div className="min-w-0">
                <h1 className="font-extrabold text-sm md:text-base leading-tight truncate" style={{ color: theme.textColorBot }}>
                  {ai.ai_name || `${ai.name} Assistant`}
                </h1>
                <span className="text-[10px] opacity-60 flex items-center gap-1.5 mt-0.5 truncate" style={{ color: theme.textColorBot }}>
                  <span className="font-semibold text-primary">Assistant for {ai.name}</span>
                  {ai.location && (
                    <>
                      <span>•</span>
                      <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="truncate">{ai.location}</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] px-2.5 py-1 rounded bg-slate-500/10 border uppercase tracking-wider opacity-60 font-extrabold" style={{ color: theme.textColorBot }}>
                Active Agent
              </span>
            </div>
          </div>

          {/* 1. SECURE SIGN IN / SIGN UP MODAL */}
          {!visitorEmail ? (
            <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
              <div className="max-w-md w-full bg-white dark:bg-slate-950 border rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                <div className="text-center space-y-4">
                  <div 
                    className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white overflow-hidden shadow-md border"
                    style={{ backgroundColor: theme.primaryColor, borderColor: `${theme.bubbleBot}44` }}
                  >
                    {ai.ai_logo_url ? (
                      <img src={ai.ai_logo_url} alt="AI Logo" className="w-full h-full object-cover" />
                    ) : ai.logo_url ? (
                      <img src={ai.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Bot className="h-8 w-8" />
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
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
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
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900 border rounded-2xl px-3.5 focus-within:ring-1 focus-within:ring-primary transition">
                      <Mail className="h-4.5 w-4.5 text-slate-400 shrink-0 mr-2" />
                      <input
                        type="email"
                        ref={emailInputRef}
                        required
                        placeholder="you@domain.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="flex-1 bg-transparent border-0 outline-none py-3.5 text-sm focus:ring-0"
                        style={{ color: theme.textColorBot }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Password</label>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900 border rounded-2xl px-3.5 focus-within:ring-1 focus-within:ring-primary transition">
                      <Lock className="h-4.5 w-4.5 text-slate-400 shrink-0 mr-2" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="flex-1 bg-transparent border-0 outline-none py-3.5 text-sm focus:ring-0"
                        style={{ color: theme.textColorBot }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 rounded-2xl font-bold flex items-center justify-center space-x-2 text-white transition hover:opacity-90 active:scale-95 text-sm shadow-md"
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

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                  <span className="flex-shrink mx-4 text-[9px] text-slate-400 font-bold uppercase tracking-wider">or</span>
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                </div>

                {/* Google Login */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-3.5 border rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center justify-center space-x-2.5 transition text-sm text-slate-700 dark:text-slate-200 shadow-sm"
                >
                  <Compass className="h-4.5 w-4.5 text-primary" />
                  <span>Sign In with Google</span>
                </button>
              </div>
            </div>
          ) : (
            /* 2. Chat Layout with full width cleaner bubbles similar to ChatGPT / Gemini */
            <>
              {/* Message Panel */}
              <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
                
                {/* 2.1 ChatGPT Welcome Screen (If no messages sent yet) */}
                {messages.length === 0 && (
                  <div className="max-w-2xl mx-auto py-10 md:py-16 text-center space-y-8 animate-in fade-in duration-300">
                    <div 
                      className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white overflow-hidden shadow border"
                      style={{ backgroundColor: theme.primaryColor, borderColor: `${theme.bubbleBot}44` }}
                    >
                      {ai.ai_logo_url ? (
                        <img src={ai.ai_logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Bot className="h-6 w-6" />
                      )}
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        How can I help you today?
                      </h2>
                      <p className="text-sm text-slate-400 max-w-sm mx-auto">
                        Ask details about catalog items, services, terms, location, or opening hours.
                      </p>
                    </div>

                    {/* Pre-built clickable Prompt Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left max-w-xl mx-auto pt-4">
                      <button
                        onClick={() => submitMessage('Show me your goods & services catalog 📖')}
                        className="p-4 border rounded-2xl hover:bg-white dark:hover:bg-slate-900/60 shadow-sm transition hover:shadow duration-200 text-slate-700 dark:text-slate-300 group flex items-start space-x-3 hover:border-blue-500/40 text-left bg-white/20"
                      >
                        <ShoppingBag className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-xs font-extrabold group-hover:text-primary transition">Explore Catalog</span>
                          <span className="block text-[11px] text-slate-400 mt-0.5">Browse all goods, products, and services.</span>
                        </div>
                      </button>

                      <button
                        onClick={() => submitMessage('What are your business opening hours? ⏰')}
                        className="p-4 border rounded-2xl hover:bg-white dark:hover:bg-slate-900/60 shadow-sm transition hover:shadow duration-200 text-slate-700 dark:text-slate-300 group flex items-start space-x-3 hover:border-blue-500/40 text-left bg-white/20"
                      >
                        <Clock className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-xs font-extrabold group-hover:text-primary transition">Opening Hours</span>
                          <span className="block text-[11px] text-slate-400 mt-0.5">Check schedule and working days.</span>
                        </div>
                      </button>

                      <button
                        onClick={() => submitMessage('Where is your business located? 📍')}
                        className="p-4 border rounded-2xl hover:bg-white dark:hover:bg-slate-900/60 shadow-sm transition hover:shadow duration-200 text-slate-700 dark:text-slate-300 group flex items-start space-x-3 hover:border-blue-500/40 text-left bg-white/20"
                      >
                        <MapPin className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-xs font-extrabold group-hover:text-primary transition">Find Location</span>
                          <span className="block text-[11px] text-slate-400 mt-0.5">Locate store branch or physical address.</span>
                        </div>
                      </button>

                      <button
                        onClick={() => submitMessage('Can you explain your return and refund guidelines? 🔄')}
                        className="p-4 border rounded-2xl hover:bg-white dark:hover:bg-slate-900/60 shadow-sm transition hover:shadow duration-200 text-slate-700 dark:text-slate-300 group flex items-start space-x-3 hover:border-blue-500/40 text-left bg-white/20"
                      >
                        <FileText className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-xs font-extrabold group-hover:text-primary transition">Refund Guidelines</span>
                          <span className="block text-[11px] text-slate-400 mt-0.5">Learn about return policies and warranties.</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2.2 Welcome Message (Always shows if messages exist, formatted correctly) */}
                {messages.length > 0 && (
                  <div className="flex justify-start items-start gap-3.5 max-w-3xl mx-auto">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white overflow-hidden shrink-0 border"
                      style={{ backgroundColor: theme.primaryColor, borderColor: `${theme.bubbleBot}33` }}
                    >
                      {ai.ai_logo_url ? (
                        <img src={ai.ai_logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Bot className="h-4.5 w-4.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {ai.ai_name || `${ai.name} Assistant`}
                      </span>
                      <div className="text-slate-800 dark:text-slate-200 text-sm md:text-[15px] leading-relaxed select-text font-medium">
                        {renderMessageContent(theme.welcomeMessage)}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2.3 Conversational bubble listings */}
                {messages.map((m) => (
                  <div 
                    key={m.id} 
                    className={`flex items-start gap-3.5 max-w-3xl mx-auto ${
                      m.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {/* Bot Avatar Left */}
                    {m.role === 'model' && (
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white overflow-hidden shrink-0 border"
                        style={{ backgroundColor: theme.primaryColor, borderColor: `${theme.bubbleBot}33` }}
                      >
                        {ai.ai_logo_url ? (
                          <img src={ai.ai_logo_url} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <Bot className="h-4.5 w-4.5" />
                        )}
                      </div>
                    )}

                    <div className={`min-w-0 ${m.role === 'user' ? 'flex flex-col items-end' : 'flex-1'}`}>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {m.role === 'user' ? 'You' : (ai.ai_name || `${ai.name} Assistant`)}
                      </span>
                      
                      {/* User gets a capsule bubble; Model gets a clean, modern flat text block */}
                      {m.role === 'user' ? (
                        <div 
                          className="rounded-2xl px-4 py-2.5 text-sm md:text-[15px] leading-relaxed shadow-sm font-semibold select-text rounded-tr-none text-right"
                          style={{
                            backgroundColor: theme.bubbleUser,
                            color: theme.textColorUser,
                          }}
                        >
                          {m.content}
                        </div>
                      ) : (
                        <div className="text-slate-800 dark:text-slate-200 text-sm md:text-[15px] leading-relaxed select-text font-medium">
                          {renderMessageContent(m.content)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-start gap-3.5 max-w-3xl mx-auto">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white overflow-hidden shrink-0 border"
                      style={{ backgroundColor: theme.primaryColor, borderColor: `${theme.bubbleBot}33` }}
                    >
                      {ai.ai_logo_url ? (
                        <img src={ai.ai_logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Bot className="h-4.5 w-4.5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {ai.ai_name || `${ai.name} Assistant`}
                      </span>
                      <div
                        className="rounded-full px-4 py-2 bg-slate-100 dark:bg-slate-900 border text-slate-500 w-fit text-xs flex items-center space-x-1"
                      >
                        <span className="animate-bounce font-bold">.</span>
                        <span className="animate-bounce delay-70 font-bold">.</span>
                        <span className="animate-bounce delay-150 font-bold">.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {errorText && (
                  <div className="max-w-3xl mx-auto p-4 bg-red-500/10 border border-red-500/25 text-red-500 rounded-2xl text-xs flex items-center space-x-2 animate-in fade-in">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                    <span>{errorText}</span>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Clean Floating Input Area (ChatGPT/Gemini style) */}
              <div className="p-4 md:p-6 shrink-0 bg-transparent">
                <form
                  onSubmit={handleSend}
                  className="max-w-3xl mx-auto border shadow-lg rounded-2xl flex items-center space-x-2 bg-white dark:bg-slate-900 p-2 border-slate-200 dark:border-slate-800 focus-within:ring-1 focus-within:ring-primary/45 transition duration-200"
                >
                  <input
                    type="text"
                    ref={chatInputRef}
                    required
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Message ${ai.ai_name || ai.name}...`}
                    className="flex-1 bg-transparent border-0 outline-none px-3.5 py-3 text-sm focus:ring-0"
                    style={{ color: theme.textColorBot }}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="p-3 rounded-xl flex items-center justify-center text-white transition hover:opacity-90 active:scale-95 shadow shrink-0"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    <Send className="h-4.5 w-4.5" />
                  </button>
                </form>
              </div>
            </>
          )}

          {/* Footer branding */}
          <div className="text-[9px] text-center pb-2.5 opacity-40 font-mono uppercase tracking-wider shrink-0" style={{ color: theme.textColorBot }}>
            Powered by Bult.AI
          </div>
        </div>
      </div>
    </div>
  )
}
