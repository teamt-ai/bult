'use client'

import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Bot, Send, RefreshCw, AlertCircle, LogIn, Mail, MapPin } from 'lucide-react'

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

  // Visitor Authentication State
  const [visitorEmail, setVisitorEmail] = useState<string>('')
  const [emailInput, setEmailInput] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchAi()
  }, [])

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

    // Check LocalStorage for visitor email
    const savedEmail = localStorage.getItem('visitorEmail')
    if (savedEmail) {
      setVisitorEmail(savedEmail)
      await initializeSessionAndHistory(savedEmail, data.id)
    }

    setLoading(false)
  }

  const initializeSessionAndHistory = async (email: string, aiId: string) => {
    // Generate Session ID
    const sessId = Math.random().toString(36).substring(2, 15)
    setSessionId(sessId)

    // Insert Chat Session linked to email
    await supabase.from('chat_sessions').insert({
      ai_id: aiId,
      visitor_session_id: sessId,
      visitor_email: email
    })

    // Fetch conversation history across all sessions for this customer
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('ai_id', aiId)
      .eq('visitor_email', email)

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id)
      const { data: msgs, error: msgsError } = await supabase
        .from('chat_messages')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: true })

      if (msgs && !msgsError) {
        setMessages(msgs.map((m: any) => ({
          id: m.id,
          role: m.role === 'user' ? 'user' : 'model',
          content: m.content
        })))
      }
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput.trim()) return
    setAuthLoading(true)

    const email = emailInput.trim().toLowerCase()
    localStorage.setItem('visitorEmail', email)
    setVisitorEmail(email)

    if (ai) {
      await initializeSessionAndHistory(email, ai.id)
    }

    setAuthLoading(false)
  }

  const handleSignOut = () => {
    localStorage.removeItem('visitorEmail')
    setVisitorEmail('')
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
      // Keep only last 8 messages for context history
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
        className="w-full max-w-4xl h-screen md:h-[680px] border shadow-2xl md:rounded-3xl flex flex-col overflow-hidden relative"
        style={{ borderColor: `${theme.bubbleBot}44`, backgroundColor: theme.bgColor }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ borderBottomColor: `${theme.bubbleBot}33` }}
        >
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white overflow-hidden shrink-0"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {ai.logo_url ? (
                <img src={ai.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Bot className="h-5 w-5" />
              )}
            </div>
            <div>
              <h1 className="font-bold text-sm md:text-base leading-tight" style={{ color: theme.textColorBot }}>
                {ai.name}
              </h1>
              {ai.location && (
                <span className="text-[10px] opacity-60 flex items-center gap-1 mt-0.5" style={{ color: theme.textColorBot }}>
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>{ai.location}</span>
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {visitorEmail && (
              <button
                onClick={handleSignOut}
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border hover:bg-red-500/10 hover:text-red-500 transition"
                style={{ color: theme.textColorBot, borderColor: `${theme.bubbleBot}88` }}
              >
                Sign Out
              </button>
            )}
            <span className="text-[10px] px-2 py-1 rounded bg-slate-500/10 border uppercase tracking-wider opacity-60 font-semibold" style={{ color: theme.textColorBot }}>
              Active Assistant
            </span>
          </div>
        </div>

        {/* 1. Sign-In Screen (If email is not provided) */}
        {!visitorEmail ? (
          <div className="flex-1 flex items-center justify-center p-6 md:p-12">
            <div className="max-w-md w-full text-center space-y-6">
              <div 
                className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center text-white overflow-hidden shadow-md"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {ai.logo_url ? (
                  <img src={ai.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Bot className="h-8 w-8" />
                )}
              </div>
              
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: theme.textColorBot }}>
                  Chat with {ai.name}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Enter your email address to initiate the chat session. This helps us remember your past orders and preferences.
                </p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="flex items-center bg-slate-100 dark:bg-slate-900 border rounded-2xl px-3 focus-within:ring-1 focus-within:ring-primary">
                  <Mail className="h-4.5 w-4.5 text-slate-400 shrink-0 mr-2" />
                  <input
                    type="email"
                    ref={emailInputRef}
                    required
                    placeholder="Enter your email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="flex-1 bg-transparent border-0 outline-none py-3 text-sm focus:ring-0"
                    style={{ color: theme.textColorBot }}
                  />
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
                  <span>{authLoading ? 'Signing in...' : 'Sign In & Start Chat'}</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* 2. Interactive Chat Screen */
          <>
            {/* Message Panel */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
              {/* Welcome Message */}
              <div className="flex justify-start">
                <div
                  className="max-w-[85%] rounded-2xl rounded-tl-none p-3.5 text-sm md:text-base leading-relaxed shadow-sm"
                  style={{ backgroundColor: theme.bubbleBot, color: theme.textColorBot }}
                >
                  {theme.welcomeMessage}
                </div>
              </div>

              {/* Chat Messages */}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-sm md:text-base leading-relaxed shadow-sm ${
                      m.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'
                    }`}
                    style={{
                      backgroundColor: m.role === 'user' ? theme.bubbleUser : theme.bubbleBot,
                      color: m.role === 'user' ? theme.textColorUser : theme.textColorBot,
                    }}
                  >
                    {m.content}
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
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorText}</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Panel */}
            <form
              onSubmit={handleSend}
              className="p-4 border-t flex space-x-2 bg-white dark:bg-slate-900"
              style={{ borderTopColor: `${theme.bubbleBot}33`, backgroundColor: theme.bgColor }}
            >
              <input
                type="text"
                ref={chatInputRef}
                required
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask ${ai.name} something...`}
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
        <div className="text-[9px] text-center pb-2 opacity-40 font-mono uppercase tracking-wider" style={{ color: theme.textColorBot }}>
          Powered by Bult.AI
        </div>
      </div>
    </div>
  )
}
