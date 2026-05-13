// AI rewrite — mirrors /api/ai/rewrite in /app/backend/server.py
import type { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import jwt from 'jsonwebtoken';

const STYLE_PROMPTS: Record<string, string> = {
  'Clear & Simple': "Rewrite the voice transcript as clear, simple, friendly prose. Use short sentences. Fix grammar. Preserve the user's intent and key facts.",
  'Bullet Summary': 'Convert into a tight bullet summary (5-9 bullets).',
  'Professional Notes': 'Rewrite as polished professional notes with bold emphasis (markdown) for key terms.',
  'Meeting Minutes': 'Format as meeting minutes: Attendees, Agenda, Discussion, Decisions, Action Items.',
  Journal: 'Rewrite as a personal first-person journal entry, reflective and warm.',
  'Blog Draft': 'Expand into a short blog draft (3-5 paragraphs) with a hook and closing takeaway.',
  'Task List': "Extract every actionable item as '- [ ] task'.",
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.EMERGENT_LLM_KEY!,
  baseURL: process.env.OPENAI_API_KEY ? undefined : 'https://integrations.emergentagent.com/llm',
});

export const handler: Handler = async (event) => {
  const auth = event.headers.authorization || event.headers.Authorization;
  if (!auth?.startsWith('Bearer ')) return { statusCode: 401, body: 'unauthorized' };
  try {
    jwt.verify(auth.slice(7), process.env.JWT_SECRET!);
  } catch {
    return { statusCode: 401, body: 'unauthorized' };
  }
  const { transcript, style = 'Clear & Simple', level = 'Medium' } = JSON.parse(event.body || '{}');
  const prompt = STYLE_PROMPTS[style] || STYLE_PROMPTS['Clear & Simple'];
  const system =
    `You are SprintNote, a premium AI writing assistant. ${prompt} Rewriting level: ${level}. Begin output with 'TITLE: <4-6 word title>' on its own line.`;

  const r = await openai.chat.completions.create({
    model: 'gpt-5.2',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: transcript },
    ],
  });
  const out = r.choices[0]?.message?.content || '';
  let title: string | null = null;
  let polished = out;
  if (out.startsWith('TITLE:')) {
    const [first, ...rest] = out.split('\n');
    title = first.replace('TITLE:', '').trim();
    polished = rest.join('\n').trimStart();
  }
  return { statusCode: 200, body: JSON.stringify({ title, polished, style, level }) };
};
