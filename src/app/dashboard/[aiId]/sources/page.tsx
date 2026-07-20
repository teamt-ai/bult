'use client'

import React, { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus, Database, Trash2, Edit3, Save, HelpCircle, FileText, Info, DollarSign, RefreshCw, Sparkles, Check } from 'lucide-react'
import Link from 'next/link'

const CATEGORY_ICONS = {
  about: Info,
  products: DollarSign,
  faq: HelpCircle,
  policies: FileText,
  custom: Database,
}

export default function SourcesManager({ params }: { params: { aiId: string } }) {
  const [ai, setAi] = useState<any>(null)
  const [sources, setSources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Edit/Create Form State
  const [category, setCategory] = useState('about')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchAiAndSources()
  }, [])

  const fetchAiAndSources = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      window.location.href = '/dashboard'
      return
    }

    const { data: aiData, error: aiError } = await supabase
      .from('business_ais')
      .select('*')
      .eq('id', params.aiId)
      .single()

    if (aiError || !aiData) {
      window.location.href = '/dashboard'
      return
    }

    setAi(aiData)

    const { data: sourcesData } = await supabase
      .from('business_sources')
      .select('*')
      .eq('ai_id', params.aiId)
      .order('created_at', { ascending: false })

    if (sourcesData) setSources(sourcesData)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!title.trim() || !content.trim()) {
      setFormError('Title and Content are required')
      return
    }

    setActionLoading(true)

    if (editingId) {
      // Update
      const { error } = await supabase
        .from('business_sources')
        .update({
          category,
          title: title.trim(),
          content: content.trim(),
        })
        .eq('id', editingId)

      if (error) {
        setFormError(error.message)
      } else {
        setEditingId(null)
        setTitle('')
        setContent('')
        fetchAiAndSources()
      }
    } else {
      // Create
      const { error } = await supabase.from('business_sources').insert({
        ai_id: params.aiId,
        category,
        title: title.trim(),
        content: content.trim(),
      })

      if (error) {
        setFormError(error.message)
      } else {
        setTitle('')
        setContent('')
        fetchAiAndSources()
      }
    }
    setActionLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this business source? The AI will no longer know about this information.')) return
    const { error } = await supabase.from('business_sources').delete().eq('id', id)
    if (!error) {
      fetchAiAndSources()
    }
  }

  const handleEdit = (source: any) => {
    setEditingId(source.id)
    setCategory(source.category)
    setTitle(source.title)
    setContent(source.content)
  }

  const totalCharacters = sources.reduce((acc, curr) => acc + (curr.title.length + curr.content.length), 0)
  const isDirectPromptMode = totalCharacters < 8000

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Knowledge Base: <span className="gradient-text">{ai?.name}</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Add products, services, operating hours, return policies, customer support rules, and general info.
            </p>
          </div>

          {/* Token usage alert badge */}
          <div className={`p-4 rounded-2xl border text-xs max-w-sm flex items-start space-x-3 ${
            isDirectPromptMode 
              ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' 
              : 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400'
          }`}>
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wider block">Token Saving System</span>
              <p className="mt-1">
                {totalCharacters.toLocaleString()} characters stored.{' '}
                {isDirectPromptMode ? (
                  <strong>Direct Mode Active:</strong>
                ) : (
                  <strong>FTS RAG Mode Active:</strong>
                )}{' '}
                {isDirectPromptMode
                  ? 'All data fits in the system instructions. Instant responses, perfect retrieval.'
                  : 'Fuzzy postgres index search will dynamically scan and pick the top 5 blocks per message to save cost.'}
              </p>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Panel: Creator Editor */}
          <div className="lg:col-span-5">
            <div className="bg-white dark:bg-slate-950 border rounded-3xl p-6 shadow-sm sticky top-24">
              <h3 className="text-xl font-bold mb-4">
                {editingId ? 'Edit Information Source' : 'Add New Source Block'}
              </h3>

              {formError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="about">About the Business</option>
                    <option value="products">Products & Services (Pricing)</option>
                    <option value="faq">FAQ (Frequently Asked Questions)</option>
                    <option value="policies">Policies (Terms, Return, Refund)</option>
                    <option value="custom">Custom Info / General News</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Source Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Return Policy, Standard Price List, Opening Hours"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Details / Content</label>
                  <textarea
                    rows={8}
                    required
                    placeholder="Input detailed information about this topic. You can paste lists, paragraphs, menus, tables, or FAQs."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex space-x-2 pt-2">
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null)
                        setTitle('')
                        setContent('')
                      }}
                      className="flex-1 py-3 border rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition text-sm"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-3 rounded-xl font-bold gradient-btn flex items-center justify-center space-x-2 text-sm"
                  >
                    <Save className="h-4 w-4" />
                    <span>{editingId ? 'Save Source' : 'Create Source'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Panel: List of Existing Sources */}
          <div className="lg:col-span-7 space-y-6">
            <h3 className="text-xl font-bold flex items-center space-x-2">
              <span>Active Sources</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full border bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                {sources.length} total
              </span>
            </h3>

            {sources.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-950 rounded-3xl border p-8 shadow-sm">
                <Database className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300">Your Knowledge Base is Empty</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Add content blocks on the left. The AI needs business info to answer customer support tickets.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sources.map((src) => {
                  const Icon = CATEGORY_ICONS[src.category as keyof typeof CATEGORY_ICONS] || Database
                  return (
                    <div
                      key={src.id}
                      className="bg-white dark:bg-slate-950 border rounded-3xl p-6 shadow-sm flex items-start justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="p-1.5 bg-slate-100 dark:bg-slate-850 rounded-lg text-slate-500">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {src.category}
                          </span>
                        </div>

                        <h4 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                          {src.title}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed line-clamp-4">
                          {src.content}
                        </p>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => handleEdit(src)}
                          className="p-2 text-slate-500 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg border transition"
                          title="Edit Source"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(src.id)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg border transition"
                          title="Delete Source"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
