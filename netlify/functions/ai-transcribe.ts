import type { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import Busboy from 'busboy';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCurrentUser } from '../lib/auth';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.EMERGENT_LLM_KEY!,
  baseURL: process.env.OPENAI_API_KEY ? undefined : 'https://integrations.emergentagent.com/llm',
});

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const user = await getCurrentUser(event.headers);
  if (!user) return { statusCode: 401, body: JSON.stringify({ detail: 'Unauthorized' }) };

  return new Promise((resolve) => {
    const busboy = Busboy({ headers: event.headers as any });
    let fileBuffer: Buffer | null = null;
    let fileName = 'audio.m4a';
    let fileType = 'audio/m4a';

    busboy.on('file', (name, file, info) => {
      const { filename, mimeType } = info;
      fileName = filename;
      fileType = mimeType;
      const chunks: any[] = [];
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on('finish', async () => {
      if (!fileBuffer) {
        resolve({ statusCode: 400, body: JSON.stringify({ detail: 'No file uploaded' }) });
        return;
      }

      try {
        let transcript = '';

        if (genAI) {
          // Use Gemini 2.5 Flash for transcription
          console.log('Using Gemini (gemini-2.5-flash) for transcription...');
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const result = await model.generateContent([
            'Please transcribe this audio accurately. Only output the transcript, no other text.',
            {
              inlineData: {
                data: fileBuffer.toString('base64'),
                mimeType: fileType,
              },
            },
          ]);
          transcript = result.response.text();
        } else {
          // Use OpenAI Whisper
          const transcription = await openai.audio.transcriptions.create({
            file: await OpenAI.toFile(fileBuffer, fileName, { type: fileType }),
            model: 'whisper-1',
          });
          transcript = transcription.text;
        }

        resolve({
          statusCode: 200,
          body: JSON.stringify({ transcript }),
        });
      } catch (error: any) {
        console.error('Transcription error:', error);
        resolve({
          statusCode: 500,
          body: JSON.stringify({ detail: 'Transcription failed', error: error.message }),
        });
      }
    });

    busboy.on('error', (err: any) => {
      resolve({ statusCode: 500, body: JSON.stringify({ detail: 'Form parsing error', error: err.message }) });
    });

    const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64') : Buffer.from(event.body || '');
    busboy.end(body);
  }) as Promise<any>;
};
