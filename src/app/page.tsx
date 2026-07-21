'use client'

import React, { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { Bot, Sparkles, Database, ShieldAlert, Cpu, Palette, Send, ArrowRight, CheckCircle } from 'lucide-react'

// Mock Data for the Sandbox Chatbot
const MOCK_BUSINESS_INFO = {
  name: "Bult Brew Cafe",
  about: "A premium artisanal cafe serving hand-drip single-origin coffees and freshly baked pastries.",
  hours: "Monday - Friday: 7 AM - 6 PM. Saturday - Sunday: 8 AM - 4 PM.",
  specialties: "Signature Lavender Latte ($5.50), Pistachio Croissant ($4.70), and Cold Brew Float ($6.00)."
}

const MOCK_MESSAGES_PRESETS = [
  "What is your signature coffee?",
  "Are you open on Sundays?",
  "What is the capital of France?"
]

export default function LandingPage() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'bot'; text: string }>>([
    { role: 'bot', text: `Welcome to ${MOCK_BUSINESS_INFO.name}! Ask me anything about our menu, hours, or services.` }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return
    const newMessages = [...messages, { role: 'user' as const, text }]
    setMessages(newMessages)
    setInputValue('')
    setIsTyping(true)

    // Simulate AI thinking (RAG and Gemini 3.5 Flash mimic)
    setTimeout(() => {
      let reply = ""
      const q = text.toLowerCase()

      if (q.includes('signature') || q.includes('coffee') || q.includes('specialties') || q.includes('menu') || q.includes('drink') || q.includes('food')) {
        reply = `Our specialty items are: ${MOCK_BUSINESS_INFO.specialties}`
      } else if (q.includes('open') || q.includes('sunday') || q.includes('hours') || q.includes('time') || q.includes('saturday')) {
        reply = `Here are our opening hours: ${MOCK_BUSINESS_INFO.hours}`
      } else if (q.includes('about') || q.includes('what is') || q.includes('bult brew')) {
        reply = `${MOCK_BUSINESS_INFO.name}: ${MOCK_BUSINESS_INFO.about}`
      } else {
        reply = `I'm sorry, I don't have that information. I am only programmed to answer questions about ${MOCK_BUSINESS_INFO.name} based on its official business profile. If you have questions about our coffee, menu, or hours, feel free to ask!`
      }

      setMessages(prev => [...prev, { role: 'bot' as const, text: reply }])
      setIsTyping(false)
    }, 800)
  }

  return (
    <div className="relative min-h-screen grid-bg">
      <Navbar />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border bg-slate-50 dark:bg-slate-900 text-xs font-semibold mb-6 animate-pulse">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Powered by Gemini 3.5 Flash API</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
          <span className="text-[1.08em] font-black tracking-tight inline-block mr-1">Bult</span> your own custom AI for your <span className="gradient-text">Business</span>
        </h1>
        
        <p className="mt-6 text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
          Feed it your products, opening hours, terms, and FAQs. Share a public link, and let it handle customer support with zero hallucination.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/dashboard" className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold gradient-btn flex items-center justify-center space-x-2 text-lg">
            <span>Create Your AI Now</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
          <a href="#sandbox" className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold border hover:bg-slate-50 dark:hover:bg-slate-900 transition flex items-center justify-center space-x-2 text-lg">
            <span>Try Sandbox</span>
          </a>
        </div>
      </section>

      {/* Live Sandbox Interactive Section */}
      <section id="sandbox" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 scroll-mt-20">
        <div className="bg-white dark:bg-slate-950 rounded-3xl border shadow-2xl p-6 md:p-8 grid md:grid-cols-12 gap-8 items-center">
          {/* Left panel: Info fed by Creator */}
          <div className="md:col-span-5 space-y-6">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-primary">Creator Panel</span>
              <h2 className="text-3xl font-extrabold mt-1">Knowledge Source</h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border">
                <span className="text-xs font-bold text-slate-400">ABOUT US</span>
                <p className="text-sm font-medium mt-1">{MOCK_BUSINESS_INFO.about}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border">
                <span className="text-xs font-bold text-slate-400">OPENING HOURS</span>
                <p className="text-sm font-medium mt-1">{MOCK_BUSINESS_INFO.hours}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border">
                <span className="text-xs font-bold text-slate-400">MENU SPECIALTIES</span>
                <p className="text-sm font-medium mt-1">{MOCK_BUSINESS_INFO.specialties}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>The AI will refuse to answer any query that isn't derived from this box.</span>
            </div>
          </div>

          {/* Right panel: Chat UI */}
          <div className="md:col-span-7 flex flex-col h-[480px] bg-slate-50 dark:bg-slate-900/50 rounded-2xl border overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm font-bold">{MOCK_BUSINESS_INFO.name} Bot</span>
              </div>
              <span className="text-xs text-slate-400">Public Link Preview</span>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'gradient-btn rounded-tr-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border rounded-tl-none'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 border rounded-2xl rounded-tl-none p-3 text-xs text-slate-400 flex items-center space-x-1">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce delay-100">.</span>
                    <span className="animate-bounce delay-200">.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Preset prompts */}
            <div className="p-3 border-t bg-white dark:bg-slate-900 flex flex-wrap gap-2">
              {MOCK_MESSAGES_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition font-medium text-slate-500 dark:text-slate-400"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input field */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage(inputValue)
              }}
              className="p-3 bg-white dark:bg-slate-900 border-t flex space-x-2"
            >
              <input
                type="text"
                placeholder="Ask about our cafe..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button type="submit" className="p-2 rounded-xl gradient-btn flex items-center justify-center">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Bento Grid Feature Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-wider font-extrabold text-primary">Engineered Excellence</span>
          <h2 className="text-4xl font-extrabold mt-2">Engineered for <span className="gradient-text">world class</span> businesses</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-4 text-base">
            Every layer of Bult is optimized to give customers accurate details and maximum conversion.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-white dark:bg-slate-950 p-8 rounded-3xl border card-gradient flex flex-col justify-between">
            <div className="p-3 bg-blue-500/10 text-primary w-fit rounded-2xl mb-6">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Visual Business Builder</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Add products, services, opening hours, return policies, and FAQs. Model your business visually using a hierarchical catalog category tree.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-white dark:bg-slate-950 p-8 rounded-3xl border card-gradient flex flex-col justify-between">
            <div className="p-3 bg-indigo-500/10 text-primary w-fit rounded-2xl mb-6">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">World-Class AI Salesperson</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Create a highly persuasive, intelligent digital representative that knows your business catalog inside out. Recommend niche matches, cross-sell products, and convert visitors to buyers.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-white dark:bg-slate-950 p-8 rounded-3xl border card-gradient flex flex-col justify-between">
            <div className="p-3 bg-purple-500/10 text-primary w-fit rounded-2xl mb-6">
              <Palette className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Custom Brand Identity</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Make the assistant uniquely yours. Fully customize your chatbot's background theme, chat bubble styles, avatars, and welcome messages to present a unified brand experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 glass mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 dark:text-slate-400 space-y-4">
          <div className="flex justify-center items-center font-bold text-sm">
            <span>Bul<span className="gradient-text">t</span></span>
          </div>
          <p>© {new Date().getFullYear()} Bult. Created with Google Gemini 1.5 Flash.</p>
        </div>
      </footer>
    </div>
  )
}
