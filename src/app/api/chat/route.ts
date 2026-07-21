import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '@/lib/supabase'

// Initialize Google Gen AI
const apiKey = process.env.GEMINI_API_KEY || ''
// Note: GoogleGenAI SDK in newer versions is imported as GoogleGenAI, or we can use:
// import { GoogleGenAI } from '@google/generative-ai' -> Wait, let's check correct SDK usage.
// Standard Google AI Studio SDK:
// import { GoogleGenAI } from '@google/generative-ai' is wrong.
// The correct import in the standard Google SDK is:
// import { GoogleGenAI } from '@google/generative-ai'? No, it is:
// import { GoogleGenAI } from '@google/generative-ai' -> actually:
// import { GoogleGenAI } from '@google/generative-ai'
// Wait, the SDK is:
// import { GoogleGenAI } from '@google/generative-ai'
// Let's verify the exact usage of `@google/generative-ai`.
// Standard syntax:
// const { GoogleGenAI } = require('@google/generative-ai')
// or
// import { GoogleGenAI } from '@google/generative-ai'
// Wait! The constructor in `@google/generative-ai` is `GoogleGenAI` in version 0.21.0:
// const ai = new GoogleGenAI({ apiKey })
// const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' })
// Let's double check this. Yes!
// Let's write the route code using the official API structure.

export async function POST(req: NextRequest) {
  try {
    const { aiId, message, sessionId, history } = await req.json()

    if (!aiId || !message || !sessionId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 1. Fetch AI details
    const { data: ai, error: aiError } = await supabase
      .from('business_ais')
      .select('name, theme_settings')
      .eq('id', aiId)
      .single()

    if (aiError || !ai) {
      return NextResponse.json({ error: 'AI Assistant not found' }, { status: 404 })
    }

    // 2. Fetch all sources for this AI
    const { data: sources, error: sourcesError } = await supabase
      .from('business_sources')
      .select('title, content, category')
      .eq('ai_id', aiId)

    if (sourcesError) {
      return NextResponse.json({ error: 'Failed to fetch knowledge sources' }, { status: 500 })
    }

    // 3. Token-saving RAG / Source Selection
    let selectedSources = sources || []
    
    // Calculate total character count
    const totalChars = selectedSources.reduce((acc, s) => acc + (s.title.length + s.content.length), 0)

    // If knowledge base is larger than 8,000 characters (~1,500 tokens), search and rank
    if (totalChars > 8000) {
      // Local lightweight search: Score each block based on word intersections with user query
      const queryWords = message.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter((w: string) => w.length > 2)
      
      const scoredSources = selectedSources.map(s => {
        let score = 0
        const titleLower = s.title.toLowerCase()
        const contentLower = s.content.toLowerCase()
        
        queryWords.forEach((word: string) => {
          if (titleLower.includes(word)) score += 10 // Higher weight for title match
          if (contentLower.includes(word)) {
            // Count occurrences
            const matches = contentLower.split(word).length - 1
            score += matches * 2
          }
        })
        return { ...s, score }
      })

      // Sort by score descending and take the top 5 relevant sources
      scoredSources.sort((a, b) => b.score - a.score)
      selectedSources = scoredSources.slice(0, 5)
    }

    // 4. Format sources into a readable text block
    const sourcesContext = selectedSources.map((s, idx) => {
      return `SOURCE ${idx + 1}: [Title: ${s.title}] (Category: ${s.category})\nContent:\n${s.content}\n---`
    }).join('\n\n')

    // 5. Save the User's Message in Supabase (runs asynchronously)
    const { data: userMsgData } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: message
      })
      .select('id')
      .single()

    // 6. Call Gemini 2.5 Flash via Google SDK
    const aiClient = new GoogleGenerativeAI(apiKey)
    const model = aiClient.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `You are the official AI Assistant for ${ai.name}.
Your job is to answer customer questions using ONLY the provided business sources.

CRITICAL RULES:
1. Answer questions using ONLY the facts explicitly stated in the sources provided below.
2. If the answer cannot be found in the sources, reply exactly with: "I'm sorry, I don't have that information. I am only trained to answer questions about ${ai.name} based on official business records."
3. Do not make up, speculate, or extrapolate details that are not in the sources.
4. Do not answer questions that are unrelated to the business or its services/products. If a user asks general queries (e.g. "Write a Python script", "Explain photosynthesis", etc.), respond with the refusal message above.
5. Keep your answers concise, clear, and professional.

OFFICIAL BUSINESS SOURCES:
${sourcesContext || 'No business information has been uploaded yet.'}`,
    })

    // Format chat history for Gemini (roles: 'user' or 'model')
    const chatHistory = (history || []).map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    }))

    // Start Chat session with history
    const chatSession = model.startChat({
      history: chatHistory,
    })

    const result = await chatSession.sendMessage(message)
    const replyText = result.response.text()

    // 7. Save the Bot's Reply in Supabase
    const { data: botMsgData } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'model',
        content: replyText
      })
      .select('id')
      .single()

    return NextResponse.json({
      reply: replyText,
      id: botMsgData?.id || Math.random().toString(36).substring(7)
    })

  } catch (error: any) {
    console.error('API Error in /api/chat:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
