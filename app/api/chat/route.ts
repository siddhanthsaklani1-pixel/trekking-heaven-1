import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { buildSystemPrompt } from '@/lib/chat-context';
import { isChatRateLimited } from '@/lib/chat';
import { WHATSAPP_URL } from '@/lib/constants';

export const runtime = 'nodejs';

const MODEL = 'gemini-3.6-flash';
const MAX_HISTORY = 12;

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(MAX_HISTORY),
});

const FALLBACK_MESSAGE = `Sorry, I'm having trouble connecting right now. You can reach our team directly on WhatsApp (${WHATSAPP_URL}) or through the Contact page — they usually reply within 24 hours.`;

function getClientIp(request: NextRequest): string | undefined {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim();
  return request.headers.get('x-real-ip') || undefined;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
  }

  const ip = getClientIp(request);
  if (await isChatRateLimited(ip)) {
    return NextResponse.json(
      { reply: "You've sent a lot of messages — please wait a few minutes, or reach us on WhatsApp for a quick reply." },
      { status: 200 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set.');
    return NextResponse.json({ reply: FALLBACK_MESSAGE }, { status: 200 });
  }

  const history = parsed.data.messages.slice(-MAX_HISTORY);

  try {
    const systemPrompt = await buildSystemPrompt();

    const callGemini = (maxOutputTokens: number) =>
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: history.map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens,
            },
          }),
          signal: AbortSignal.timeout(30000),
        }
      );

    let geminiRes = await callGemini(1536);

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => '');
      console.error('Gemini API error:', geminiRes.status, errText);
      return NextResponse.json({ reply: FALLBACK_MESSAGE }, { status: 200 });
    }

    let data = await geminiRes.json();
    let candidate = data?.candidates?.[0];

    // If the model got cut off mid-answer (hit the token cap), retry once with
    // a much bigger budget instead of returning a half-finished message.
    if (candidate?.finishReason === 'MAX_TOKENS') {
      const retryRes = await callGemini(3072);
      if (retryRes.ok) {
        const retryData = await retryRes.json();
        if (retryData?.candidates?.[0]?.content?.parts?.[0]?.text) {
          data = retryData;
          candidate = retryData.candidates[0];
        }
      }
    }

    const reply: string | undefined = candidate?.content?.parts?.[0]?.text;

    if (!reply) {
      const blockReason = data?.promptFeedback?.blockReason;
      if (blockReason) {
        return NextResponse.json({
          reply: "I can't help with that request — feel free to ask me about treks, gear, or booking instead!",
        });
      }
      console.error('Gemini API returned no reply:', JSON.stringify(data));
      return NextResponse.json({ reply: FALLBACK_MESSAGE }, { status: 200 });
    }

    return NextResponse.json({ reply: reply.trim() });
  } catch (err) {
    console.error('Chat request failed:', err);
    return NextResponse.json({ reply: FALLBACK_MESSAGE }, { status: 200 });
  }
}
