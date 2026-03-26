import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { GURUJI_SYSTEM_PROMPT } from '@/lib/guruji-prompt';
import { searchWeb, formatSearchContext } from '@/lib/search';
import { checkRateLimit } from '@/lib/rate-limit';
import { auth } from '@/auth';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Please sign in to ask Guruji a question. 🙏' },
        { status: 401 }
      );
    }

    const { question } = await req.json();

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'Please ask a question!' }, { status: 400 });
    }

    if (question.trim().length > 1000) {
      return NextResponse.json({ error: 'Question is too long. Please keep it under 1000 characters.' }, { status: 400 });
    }

    // Rate limiting — now per user email instead of IP
    const userKey = session.user.email;
    const rateCheck = checkRateLimit(userKey);
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

    // Generate response with Gemini
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userMessage,
      config: {
        systemInstruction: GURUJI_SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    const answer = response.text || 'I apologize, I could not generate an answer. Please try again.';

    // Return answer with sources
    return NextResponse.json({
      answer,
      sources: searchResults.map((r) => ({ title: r.title, url: r.url })),
      remaining: rateCheck.remaining,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
