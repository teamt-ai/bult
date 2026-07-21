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
  ShoppingBag,
  Clock,
  FileText,
  User,
  ExternalLink
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

  // Sidebar controls
  const [sessionsList, setSessionsList] = useState<any[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Auth state
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
      setSessionId(sessions[0].visitor_session_id)
      await loadSessionMessages(sessions[0].visitor_session_id)
    } else {
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

    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput.trim().toLowerCase(),
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

    const { error } = await supabase.auth.signUp({
      email: emailInput.trim().toLowerCase(),
      password: passwordInput,
    })

    if (error) {
      setErrorText(error.message)
    } else {
      alert('Account activation email triggered! Please check your inbox.')
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
    const tempUserId = Math.random().toString(36).substring(7)
    const userMsg: Message = { id: tempUserId, role: 'user', content: userText }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setIsTyping(true)

    if (messages.length === 0) {
      let generatedTitle = userText.length > 22 ? userText.substring(0, 20) + '...' : userText
      generatedTitle = generatedTitle.charAt(0).toUpperCase() + generatedTitle.slice(1)
      
      await supabase
        .from('chat_sessions')
        .update({ title: generatedTitle })
        .eq('visitor_session_id', sessionId)
        
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
          history: recentHistory.slice(0, -1),
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

    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-[#1e1e24] dark:bg-[#090a0c] text-[#a9b2c3] p-4 rounded-xl font-mono text-xs my-3 overflow-x-auto border border-white/5">$1</pre>')
    html = html.replace(/`([^`]+)`/g, '<code class="bg-black/5 dark:bg-[#1e1e24] px-1.5 py-0.5 rounded font-mono text-xs font-semibold text-primary">$1</code>')
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    html = html.replace(/__([^_]+)__/g, '<u>$1</u>')
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>')
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>')
    html = html.replace(/~([^~]+)~/g, '<del>$1</del>')
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
        <div key={`img-${index}`} className="my-3 max-w-sm rounded-2xl overflow-hidden border shadow-sm dark:border-zinc-800">
          <img src={src} alt={alt} className="w-full h-48 object-cover" />
          <div className="px-3 py-2 text-[10px] opacity-75 border-t dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 italic text-center font-bold tracking-wide uppercase">
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
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!ai) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-black">Assistant Not Found</h1>
        <p className="text-zinc-400 mt-2 max-w-sm">
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
    <div className="min-h-screen w-screen h-screen overflow-hidden flex flex-row font-sans antialiased text-[#202124] dark:text-[#ececf1] bg-white dark:bg-[#131314]">
      {/* 1. Sleek Carbon Sidebar (Exactly like ChatGPT / Grok) */}
      {visitorEmail && (
        <>
          {/* Mobile overlay backdrop */}
          <div
            className={`fixed inset-0 z-30 bg-black/60 md:hidden transition-opacity duration-300 ${
              isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsSidebarOpen(false)}
          />

          <div
            className={`w-[260px] h-full flex flex-col shrink-0 bg-[#171717] text-[#ececf1] z-40 md:z-10 md:static fixed top-0 bottom-0 left-0 transition-transform duration-300 md:translate-x-0 ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* New Chat Action */}
            <div className="p-3.5">
              <button
                onClick={startNewChat}
                className="w-full py-2.5 px-3 flex items-center justify-between border border-white/10 hover:border-white/20 rounded-lg hover:bg-white/5 active:scale-[0.98] transition font-bold text-xs text-[#ececf1]"
              >
                <span className="flex items-center space-x-2">
                  <Plus className="h-4 w-4 text-blue-500" />
                  <span>New Chat</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-zinc-500 font-mono">⌘N</span>
              </button>
            </div>

            {/* Conversation Log history */}
            <div className="flex-1 overflow-y-auto px-2 space-y-0.5 py-1">
              <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-3 mb-2">
                Today
              </span>
              {sessionsList.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-600 font-medium">
                  No chat history
                </div>
              ) : (
                sessionsList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSession(s)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition truncate flex items-center justify-between ${
                      sessionId === s.visitor_session_id
                        ? 'bg-[#212121] text-white'
                        : 'hover:bg-[#212121]/50 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <MessageSquare className="h-4 w-4 shrink-0 text-blue-500 opacity-80" />
                      <span className="truncate">
                        {s.title || `Chat - ${new Date(s.created_at).toLocaleDateString()}`}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Account settings panel */}
            <div className="p-3 border-t border-white/5 bg-black/10 flex flex-col gap-2">
              <div className="flex items-center justify-between min-w-0 px-2 py-1">
                <div className="min-w-0 flex-1 flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs shrink-0 border border-zinc-700">
                    <User className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold truncate text-zinc-305">
                      {visitorEmail}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. Main Chat canvas area */}
      <div className="flex-1 h-full flex flex-col overflow-hidden" style={{ background: theme.bgColor }}>
        {/* Top Navbar */}
        <div className="h-14 border-b flex items-center justify-between px-6 shrink-0 z-20" style={{ borderBottomColor: `${theme.bubbleBot}33`, background: theme.bgColor }}>
          <div className="flex items-center space-x-3 min-w-0">
            {visitorEmail && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 mr-1"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            
            {/* AI Custom Logo */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white overflow-hidden shrink-0 border dark:border-zinc-800 shadow-sm"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {ai.ai_logo_url ? (
                <img src={ai.ai_logo_url} alt="AI Logo" className="w-full h-full object-cover" />
              ) : ai.logo_url ? (
                <img src={ai.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Bot className="h-4.5 w-4.5" />
              )}
            </div>

            <div className="min-w-0">
              <h1 className="font-extrabold text-sm md:text-base leading-tight truncate" style={{ color: theme.textColorBot }}>
                {ai.ai_name || `${ai.name} Assistant`}
              </h1>
              <span className="text-[10px] opacity-60 flex items-center gap-1.5 mt-0.5 truncate text-zinc-500">
                <span className="font-semibold text-primary">Assistant for {ai.name}</span>
                {ai.location && (
                  <>
                    <span>•</span>
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{ai.location}</span>
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[9px] px-2.5 py-1 rounded bg-zinc-500/10 border dark:border-zinc-800 uppercase tracking-widest font-extrabold text-zinc-500">
              Active Agent
            </span>
          </div>
        </div>

        {/* 3. Authentication Forms */}
        {!visitorEmail ? (
          <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto bg-zinc-50 dark:bg-[#1e1e1f]">
            <div className="max-w-md w-full bg-white dark:bg-[#2b2c2f] border dark:border-zinc-800/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
              <div className="text-center space-y-4">
                <div 
                  className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white overflow-hidden shadow-md border dark:border-zinc-800"
                  style={{ backgroundColor: theme.primaryColor }}
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
                  <h2 className="text-2xl font-black tracking-tight">
                    Chat with {ai.ai_name || `${ai.name} Assistant`}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                    Access official customer service, track your conversation history, and verify orders.
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-zinc-100 dark:bg-[#1e1e1f] p-1 rounded-2xl">
                <button
                  onClick={() => setAuthMode('signin')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                    authMode === 'signin' 
                      ? 'bg-white dark:bg-[#2b2c2f] shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setAuthMode('signup')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                    authMode === 'signup' 
                      ? 'bg-white dark:bg-[#2b2c2f] shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
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

              {/* Form fields */}
              <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <div className="flex items-center bg-zinc-50 dark:bg-[#1e1e1f] border dark:border-zinc-800 rounded-2xl px-3.5 focus-within:ring-1 focus-within:ring-primary transition">
                    <Mail className="h-4.5 w-4.5 text-zinc-400 shrink-0 mr-2" />
                    <input
                      type="email"
                      ref={emailInputRef}
                      required
                      placeholder="name@email.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="flex-1 bg-transparent border-0 outline-none py-3.5 text-sm focus:ring-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Password</label>
                  <div className="flex items-center bg-zinc-50 dark:bg-[#1e1e1f] border dark:border-zinc-800 rounded-2xl px-3.5 focus-within:ring-1 focus-within:ring-primary transition">
                    <Lock className="h-4.5 w-4.5 text-zinc-400 shrink-0 mr-2" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="flex-1 bg-transparent border-0 outline-none py-3.5 text-sm focus:ring-0"
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
                <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
                <span className="flex-shrink mx-4 text-[9px] text-zinc-400 font-bold uppercase tracking-wider">or</span>
                <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
              </div>

              {/* Google OAuth Login */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-3.5 border dark:border-zinc-800 rounded-2xl font-bold hover:bg-zinc-50 dark:hover:bg-slate-[#1e1e1f] flex items-center justify-center space-x-2.5 transition text-sm text-zinc-700 dark:text-zinc-200 shadow-sm"
              >
                <Compass className="h-4.5 w-4.5 text-primary" />
                <span>Sign In with Google</span>
              </button>
            </div>
          </div>
        ) : (
          /* 4. ChatGPT / Gemini Full Screen Canvas Feed */
          <>
            <div className="flex-1 overflow-y-auto px-4 md:px-0">
              <div className="max-w-3xl mx-auto py-10 space-y-8">
                
                {/* 4.1 Empty State (Grok / ChatGPT style startup) */}
                {messages.length === 0 && (
                  <div className="py-14 md:py-20 text-center space-y-8 animate-in fade-in duration-300">
                    <div 
                      className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white overflow-hidden shadow border dark:border-slate-850"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {ai.ai_logo_url ? (
                        <img src={ai.ai_logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Bot className="h-6 w-6" />
                      )}
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-2xl md:text-4.5xl font-black tracking-tight leading-tight" style={{ color: theme.textColorBot }}>
                        How can I help you today?
                      </h2>
                      <p className="text-xs md:text-sm max-w-sm mx-auto" style={{ color: theme.textColorBot, opacity: 0.6 }}>
                        Ask about our products, check working hours, or check location details.
                      </p>
                    </div>

                    {/* Dashboard cards prompt shortcuts */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left max-w-2xl mx-auto pt-6 px-4">
                      <button
                        onClick={() => submitMessage('Show me your goods & services catalog 📖')}
                        className="p-4 border rounded-2xl hover:scale-[1.01] shadow-sm transition-all duration-200 group flex items-start space-x-3.5 text-left"
                        style={{ background: `${theme.bubbleBot}1c`, borderColor: `${theme.bubbleBot}33`, color: theme.textColorBot }}
                      >
                        <ShoppingBag className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-xs font-black group-hover:text-primary transition" style={{ color: theme.textColorBot }}>Explore Catalog</span>
                          <span className="block text-[11px] mt-0.5" style={{ color: theme.textColorBot, opacity: 0.6 }}>Browse all goods, products, and services.</span>
                        </div>
                      </button>

                      <button
                        onClick={() => submitMessage('What are your business opening hours? ⏰')}
                        className="p-4 border rounded-2xl hover:scale-[1.01] shadow-sm transition-all duration-200 group flex items-start space-x-3.5 text-left"
                        style={{ background: `${theme.bubbleBot}1c`, borderColor: `${theme.bubbleBot}33`, color: theme.textColorBot }}
                      >
                        <Clock className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-xs font-black group-hover:text-primary transition" style={{ color: theme.textColorBot }}>Opening Hours</span>
                          <span className="block text-[11px] mt-0.5" style={{ color: theme.textColorBot, opacity: 0.6 }}>Check schedule and working days.</span>
                        </div>
                      </button>

                      <button
                        onClick={() => submitMessage('Where is your business located? 📍')}
                        className="p-4 border rounded-2xl hover:scale-[1.01] shadow-sm transition-all duration-200 group flex items-start space-x-3.5 text-left"
                        style={{ background: `${theme.bubbleBot}1c`, borderColor: `${theme.bubbleBot}33`, color: theme.textColorBot }}
                      >
                        <MapPin className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-xs font-black group-hover:text-primary transition" style={{ color: theme.textColorBot }}>Find Location</span>
                          <span className="block text-[11px] mt-0.5" style={{ color: theme.textColorBot, opacity: 0.6 }}>Locate store branch or physical address.</span>
                        </div>
                      </button>

                      <button
                        onClick={() => submitMessage('Can you explain your return and refund guidelines? 🔄')}
                        className="p-4 border rounded-2xl hover:scale-[1.01] shadow-sm transition-all duration-200 group flex items-start space-x-3.5 text-left"
                        style={{ background: `${theme.bubbleBot}1c`, borderColor: `${theme.bubbleBot}33`, color: theme.textColorBot }}
                      >
                        <FileText className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-xs font-black group-hover:text-primary transition" style={{ color: theme.textColorBot }}>Refund Guidelines</span>
                          <span className="block text-[11px] mt-0.5" style={{ color: theme.textColorBot, opacity: 0.6 }}>Learn about return policies and warranties.</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4.2 Welcome greetings block (formatted flat list style) */}
                {messages.length > 0 && (
                  <div className="flex justify-start items-start gap-4 animate-in fade-in">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white overflow-hidden shrink-0 border dark:border-zinc-800 shadow-sm"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {ai.ai_logo_url ? (
                        <img src={ai.ai_logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Bot className="h-4.5 w-4.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                        {ai.ai_name || `${ai.name} Assistant`}
                      </span>
                    <div className="text-[15px] leading-relaxed select-text font-medium" style={{ color: theme.textColorBot }}>
                      {renderMessageContent(theme.welcomeMessage)}
                    </div>
                    </div>
                  </div>
                )}

                {/* 4.3 Message stream listings (Grok style side-by-side feed layout) */}
                {messages.map((m) => (
                  <div 
                    key={m.id} 
                    className={`flex items-start gap-4 ${
                      m.role === 'user' ? 'justify-end' : 'justify-start'
                    } animate-in fade-in`}
                  >
                    {/* Bot Avatar Left */}
                    {m.role === 'model' && (
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white overflow-hidden shrink-0 border dark:border-zinc-800 shadow-sm"
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        {ai.ai_logo_url ? (
                          <img src={ai.ai_logo_url} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <Bot className="h-4.5 w-4.5" />
                        )}
                      </div>
                    )}

                    <div className={`min-w-0 ${m.role === 'user' ? 'flex flex-col items-end' : 'flex-1'}`}>
                      <span className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                        {m.role === 'user' ? 'You' : (ai.ai_name || `${ai.name} Assistant`)}
                      </span>
                      
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
                        <div className="text-[15px] leading-relaxed select-text font-medium" style={{ color: theme.textColorBot }}>
                          {renderMessageContent(m.content)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white overflow-hidden shrink-0 border dark:border-zinc-800 shadow-sm"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {ai.ai_logo_url ? (
                        <img src={ai.ai_logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Bot className="h-4.5 w-4.5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                        {ai.ai_name || `${ai.name} Assistant`}
                      </span>
                      <div
                        className="rounded-full px-4.5 py-2.5 bg-zinc-100 dark:bg-zinc-900 border dark:border-zinc-800 text-zinc-500 w-fit text-xs flex items-center space-x-1.5"
                      >
                        <span className="animate-bounce font-extrabold">.</span>
                        <span className="animate-bounce delay-75 font-extrabold">.</span>
                        <span className="animate-bounce delay-150 font-extrabold">.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alert notification block */}
                {errorText && (
                  <div className="max-w-3xl mx-auto p-4 bg-red-500/10 border border-red-500/25 text-red-500 rounded-2xl text-xs flex items-center space-x-2 animate-in fade-in">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                    <span>{errorText}</span>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Bottom floating capsule prompt box */}
            <div className="p-4 md:p-6 shrink-0 bg-transparent">
              <form
                onSubmit={handleSend}
                className="max-w-3xl mx-auto border shadow-2xl rounded-2xl flex items-center space-x-2 p-2 focus-within:ring-1 focus-within:ring-primary/45 transition duration-200"
                style={{ background: theme.bgColor === '#ffffff' ? '#ffffff' : `${theme.bubbleBot}1c`, borderColor: `${theme.bubbleBot}33`, color: theme.textColorBot }}
              >
                <input
                  type="text"
                  ref={chatInputRef}
                  required
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Message ${ai.ai_name || ai.name}...`}
                  className="flex-1 bg-transparent border-0 outline-none px-4 py-3.5 text-sm focus:ring-0"
                  style={{ color: theme.textColorBot }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="p-3.5 rounded-xl flex items-center justify-center text-white transition hover:opacity-90 active:scale-95 shadow shrink-0"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
              <div className="text-[10px] text-center mt-3 text-zinc-400 font-medium">
                {ai.ai_name || ai.name} can make mistakes. Verify important business details.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
