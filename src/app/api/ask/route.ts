import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { GURUJI_SYSTEM_PROMPT } from '@/lib/guruji-prompt';
import { searchWeb, formatSearchContext } from '@/lib/search';
import { checkRateLimit } from '@/lib/rate-limit';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Model fallback chain — if primary hits quota, try next
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

async function generateWithFallback(userMessage: string) {
  for (const model of MODELS) {
    try {
      console.log(`Trying model: ${model}`);
      const response = await genAI.models.generateContent({
        model,
        contents: userMessage,
        config: {
          systemInstruction: GURUJI_SYSTEM_PROMPT,
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      });
      return response.text;
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      const isQuotaError = error.status === 429 || 
        (error.message && error.message.includes('quota')) ||
        (error.message && error.message.includes('exhausted')) ||
        (error.message && error.message.includes('RESOURCE_EXHAUSTED'));
      
      if (isQuotaError && model !== MODELS[MODELS.length - 1]) {
        console.log(`Model ${model} quota exhausted, falling back...`);
        continue;
      }
      throw err;
    }
  }
  throw new Error('All models exhausted');
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'Please ask a question!' }, { status: 400 });
    }

    if (question.trim().length > 1000) {
      return NextResponse.json({ error: 'Question is too long. Please keep it under 1000 characters.' }, { status: 400 });
    }

    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json({
        error: 'You have reached your daily limit of 10 questions. Please come back tomorrow! 🙏',
        rateLimited: true,
      }, { status: 429 });
    }

    // Search the web for context
    const searchResults = await searchWeb(question.trim());
    const searchContext = formatSearchContext(searchResults);

    // Build prompt
    const userMessage = `${question.trim()}${searchContext}`;

    // Generate response with fallback
    const answer = await generateWithFallback(userMessage) 
      || 'I apologize, I could not generate an answer. Please try again.';

    // Return answer with sources
    return NextResponse.json({
      answer,
      sources: searchResults.map((r) => ({ title: r.title, url: r.url })),
      remaining: rateCheck.remaining,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    console.error('API Error:', error);
    
    // Friendly message for quota errors
    const isQuotaError = error.status === 429 || 
      (error.message && (error.message.includes('quota') || error.message.includes('exhausted')));
    
    if (isQuotaError) {
      return NextResponse.json(
        { error: 'Guruji is resting 🧘 — our AI capacity is temporarily full. Please try again in a few minutes.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
