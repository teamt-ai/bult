import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '@/lib/supabase'

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  CNY: '元',
  INR: '₹',
  AED: 'AED',
  NGN: '₦',
  GHS: '₵',
  ZAR: 'R',
  KES: 'KSh',
  EGP: 'E£'
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || ''
    const { aiId, message, sessionId, history, visitorEmail } = await req.json()

    if (!aiId || !message || !sessionId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 1. Fetch AI details (including location and bot identity)
    const { data: ai, error: aiError } = await supabase
      .from('business_ais')
      .select('name, theme_settings, location, ai_name, ai_logo_url')
      .eq('id', aiId)
      .single()

    if (aiError || !ai) {
      return NextResponse.json({ error: 'AI Assistant not found' }, { status: 404 })
    }

    // 2. Fetch the visitor's full chat history across sessions if visitorEmail is provided
    let customerHistoryText = ''
    if (visitorEmail) {
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('ai_id', aiId)
        .eq('visitor_email', visitorEmail)

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id)
        const { data: pastMsgs } = await supabase
          .from('chat_messages')
          .select('role, content, created_at')
          .in('session_id', sessionIds)
          .order('created_at', { ascending: true })

        if (pastMsgs && pastMsgs.length > 0) {
          customerHistoryText = pastMsgs.map(m => {
            const dateStr = new Date(m.created_at).toLocaleDateString()
            return `[Session ${dateStr}] ${m.role === 'user' ? 'Customer' : 'AI'}: ${m.content}`
          }).join('\n')
        }
      }
    }

    // 3. Fetch all sources for this AI
    const { data: sources, error: sourcesError } = await supabase
      .from('business_sources')
      .select('title, content, category')
      .eq('ai_id', aiId)

    if (sourcesError) {
      return NextResponse.json({ error: 'Failed to fetch knowledge sources' }, { status: 500 })
    }

    // Extract structured business profile if present
    const profileRow = sources?.find(s => s.category === 'business_profile')
    const remainingSources = sources?.filter(s => s.category !== 'business_profile') || []

    let businessProfileContext = ''
    if (profileRow) {
      try {
        const parsed = JSON.parse(profileRow.content)
        const companyInfo: any[] = parsed.company_info || []
        const goodsServices: any[] = parsed.goods_services || []
        const curCode = parsed.currency || 'USD'
        const curSymbol = CURRENCY_SYMBOLS[curCode] || '$'

        businessProfileContext += '### BUSINESS PROFILE\n\n'
        
        if (ai.location) {
          businessProfileContext += `**Location / Address**: ${ai.location}\n\n`
        }

        if (companyInfo.length > 0) {
          businessProfileContext += '#### COMPANY INFORMATION\n'
          companyInfo.forEach((b: any) => {
            businessProfileContext += `- **${b.title}**: ${b.content.replace(/\n/g, ' ')}\n`
          })
          businessProfileContext += '\n'
        }

        if (goodsServices.length > 0) {
          businessProfileContext += '#### GOODS & SERVICES CATALOG\n'
          
          const formatCatalog = (categories: any[], depth: number = 0): string => {
            let output = ''
            const indent = '  '.repeat(depth)
            categories.forEach(cat => {
              output += `${indent}- Category: ${cat.name}\n`
              if (cat.items && cat.items.length > 0) {
                cat.items.forEach((item: any) => {
                  const finalPrice = item.discountType === 'percent' 
                    ? item.price * (1 - item.discountValue / 100)
                    : item.discountType === 'value'
                      ? Math.max(0, item.price - item.discountValue)
                      : item.price
                  let priceStr = `${curSymbol}${finalPrice.toFixed(2)}`
                  if (item.discountType !== 'none') {
                    priceStr += ` (Reduced from ${curSymbol}${item.price.toFixed(2)})`
                  }
                  output += `${indent}  - Item: ${item.name} | Price: ${priceStr}\n`
                  if (item.image) {
                    output += `${indent}    Image URL: ${item.image}\n`
                  }
                  if (item.description) {
                    output += `${indent}    Description: ${item.description}\n`
                  }
                })
              }
              if (cat.subcategories && cat.subcategories.length > 0) {
                output += formatCatalog(cat.subcategories, depth + 1)
              }
            })
            return output
          }

          businessProfileContext += formatCatalog(goodsServices, 0)
        }
      } catch (e) {
        console.error('Failed to parse business profile JSON:', e)
      }
    }

    // 4. Token-saving RAG / Source Selection for remaining flat sources
    let selectedSources = remainingSources || []
    
    // Calculate total character count of remaining sources
    const totalChars = selectedSources.reduce((acc, s) => acc + (s.title.length + s.content.length), 0)

    // If remaining knowledge base is larger than 8,000 characters (~1,500 tokens), search and rank
    if (totalChars > 8000) {
      const queryWords = message.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter((w: string) => w.length > 2)
      
      const scoredSources = selectedSources.map(s => {
        let score = 0
        const titleLower = s.title.toLowerCase()
        const contentLower = s.content.toLowerCase()
        
        queryWords.forEach((word: string) => {
          if (titleLower.includes(word)) score += 10
          if (contentLower.includes(word)) {
            const matches = contentLower.split(word).length - 1
            score += matches * 2
          }
        })
        return { ...s, score }
      })

      scoredSources.sort((a, b) => b.score - a.score)
      selectedSources = scoredSources.slice(0, 5)
    }

    // Format remaining sources into a readable text block
    const remainingSourcesContext = selectedSources.map((s, idx) => {
      return `ADDITIONAL SOURCE ${idx + 1}: [Title: ${s.title}] (Category: ${s.category})\nContent:\n${s.content}\n---`
    }).join('\n\n')

    const finalContext = [
      businessProfileContext,
      remainingSourcesContext ? `### ADDITIONAL INFORMATION\n\n${remainingSourcesContext}` : ''
    ].filter(Boolean).join('\n\n')

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

    // 6. Call Gemini 3.5 Flash via Google SDK with Salesperson System Instructions
    const botName = ai.ai_name || `${ai.name} Assistant`
    const aiClient = new GoogleGenerativeAI(apiKey)
    const model = aiClient.getGenerativeModel({
      model: 'gemini-3.5-flash',
      systemInstruction: `You are ${botName}, the official AI Assistant and the world's best sales marketer working for ${ai.name}.
Your job is to answer customer questions using ONLY the provided business sources and catalog, maximize sales conversion, and cross-sell related products.

CRITICAL RULES & SELLING STRATEGY:
1. Answer questions using ONLY the facts explicitly stated in the business sources and catalog below.
2. Refusal Rule: If they ask something completely unrelated to the business (e.g. "write a python script", "explain photosynthesis"), reply exactly with: "I'm sorry, I don't have that information. I am only trained to answer questions about ${ai.name} based on official business records."
3. Alternative Recommendation Rule (VERY IMPORTANT): If a customer asks for a product, size, or color we do NOT have in our catalog, do NOT just say "we don't have it." Look for similar or related items in that same niche from our catalog and suggest them enthusiastically.
   Example: If they ask for a "blue Chanel bag" and we only have a "red Gucci bag", say: "We don't have a blue Chanel bag right now, but we have a stunning red Gucci bag that matches that elegant style, or a blue wallet that could complement it!"
4. Cross-Selling Rule (VERY IMPORTANT): Suggest matching accessories or complementary items. If they order a bag, ask if they need shoes or a wallet to go with it. Gently suggest matching items from the catalog throughout the conversation.
5. Customer Context Rule: Review the provided CUSTOMER CONVERSATION HISTORY. If they refer to past orders or questions (e.g., "the shoe I ordered last month, do you still have it?"), locate that item in the history, verify its availability in the current catalog, and answer appropriately.
6. Product Image Rule: If the customer asks to see the image or photo of any goods/products, or asks "can I see it?", you MUST provide the image by rendering the exact Image URL associated with that product in the catalog in standard markdown image format: ![Product Name](Image URL). Do not make up URLs; only use the exact URLs provided in the catalog.

OFFICIAL BUSINESS SOURCES:
${finalContext || 'No business information has been uploaded yet.'}

CUSTOMER CONVERSATION HISTORY:
${customerHistoryText || 'This is the customer\'s first conversation.'}`,
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
