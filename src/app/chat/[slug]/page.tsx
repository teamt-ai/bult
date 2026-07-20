'use client'

import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Bot, Send, RefreshCw, MessageSquare, AlertCircle } from 'lucide-react'

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

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchAi()
  }, [])

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

    // Generate Session ID
    const sessId = Math.random().toString(36).substring(2, 15)
    setSessionId(sessId)

    // Insert Chat Session to DB
    await supabase.from('chat_sessions').insert({
      ai_id: data.id,
      visitor_session_id: sessId
    })

    setLoading(false)
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
      // Keep only last 6 messages for context history to minimize tokens
      const recentHistory = messages.slice(-6).map((m) => ({
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
        className="w-full max-w-4xl h-screen md:h-[650px] border shadow-2xl md:rounded-3xl flex flex-col overflow-hidden"
        style={{ borderColor: `${theme.bubbleBot}44`, backgroundColor: theme.bgColor }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ borderBottomColor: `${theme.bubbleBot}33` }}
        >
          <div className="flex items-center space-x-3">
            <div
              className="p-2 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm md:text-base leading-tight" style={{ color: theme.textColorBot }}>
                {ai.name}
              </h1>
              <span className="text-[10px] md:text-xs opacity-60 block" style={{ color: theme.textColorBot }}>
                Official AI Assistant
              </span>
            </div>
          </div>
          <span className="text-[10px] px-2 py-1 rounded bg-slate-500/10 border uppercase tracking-wider opacity-60" style={{ color: theme.textColorBot }}>
            Strict Knowledge Scope
          </span>
        </div>

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
            required
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${ai.name} something...`}
            className="flex-1 bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary outline-none transition"
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

        {/* Footer branding */}
        <div className="text-[9px] text-center pb-2 opacity-40 font-mono uppercase tracking-wider" style={{ color: theme.textColorBot }}>
          Powered by Bult.AI
        </div>
      </div>
    </div>
  )
}
