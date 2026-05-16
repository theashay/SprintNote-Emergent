import type { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import { getCurrentUser } from '../lib/auth';

const STYLE_PROMPTS: Record<string, string> = {
  'Clear & Simple': "Rewrite the voice transcript as clear, simple, friendly prose. Use short sentences. Fix grammar. Preserve the user's intent and key facts.",
  'Bullet Summary': 'Convert into a tight bullet summary (5-9 bullets).',
  'Professional Notes': 'Rewrite as polished professional notes with bold emphasis (markdown) for key terms.',
  'Meeting Minutes': 'Format as meeting minutes: Attendees, Agenda, Discussion, Decisions, Action Items.',
  Journal: 'Rewrite as a personal first-person journal entry, reflective and warm.',
  'Blog Draft': 'Expand into a short blog draft (3-5 paragraphs) with a hook and closing takeaway.',
  'Task List': "Extract every actionable item as '- [ ] task'.",
};

// Use Gemini if available, fallback to OpenAI
const useGemini = !!process.env.GEMINI_API_KEY;
const openai = new OpenAI({
  apiKey: useGemini ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY || process.env.EMERGENT_LLM_KEY!,
  baseURL: useGemini 
    ? 'https://generativelanguage.googleapis.com/v1beta/openai/' 
    : (process.env.OPENAI_API_KEY ? undefined : 'https://integrations.emergentagent.com/llm'),
});

const MODEL = useGemini ? 'gemini-2.5-flash' : 'gpt-4o';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const user = await getCurrentUser(event.headers);
  if (!user) return { statusCode: 401, body: JSON.stringify({ detail: 'Unauthorized' }) };

  const { transcript, style = 'Clear & Simple', level = 'Medium' } = JSON.parse(event.body || '{}');
  if (!transcript) return { statusCode: 400, body: JSON.stringify({ detail: 'Transcript required' }) };

  const prompt = STYLE_PROMPTS[style] || STYLE_PROMPTS['Clear & Simple'];
  const system = `You are SprintNote, a premium AI writing assistant. ${prompt} Rewriting level: ${level}. Begin output with 'TITLE: <4-6 word title>' on its own line.`;

  try {
    const r = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: transcript },
      ],
    });

    const out = r.choices[0]?.message?.content || '';
    let title: string | null = null;
    let polished = out;

    if (out.toUpperCase().startsWith('TITLE:')) {
      const [first, ...rest] = out.split('\n');
      title = first.replace(/TITLE:/i, '').trim();
      polished = rest.join('\n').trimStart();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ title, polished, style, level }),
    };
  } catch (error: any) {
    console.error('Rewrite error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ detail: 'AI rewrite failed', error: error.message }),
    };
  }
};
