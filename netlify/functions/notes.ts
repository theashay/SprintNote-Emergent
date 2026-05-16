import type { Handler } from '@netlify/functions';
import { eq, and, desc, sql, or, ilike } from 'drizzle-orm';
import { db } from '../lib/db';
import { notes, users } from '../db/schema';
import { getCurrentUser } from '../lib/auth';

export const handler: Handler = async (event) => {
  const user = await getCurrentUser(event.headers);
  if (!user) return { statusCode: 401, body: JSON.stringify({ detail: 'Unauthorized' }) };

  // GET /api/notes (List)
  if (event.httpMethod === 'GET') {
    const { folder, favorite, q } = event.queryStringParameters || {};
    
    const conditions = [eq(notes.user_id, user.user_id)];
    if (folder && folder !== 'All Notes') {
      conditions.push(eq(notes.folder, folder));
    }
    if (favorite === 'true') {
      conditions.push(eq(notes.favorite, true));
    }
    if (q) {
      conditions.push(
        or(
          ilike(notes.title, `%${q}%`),
          ilike(notes.transcript, `%${q}%`),
          ilike(notes.polished, `%${q}%`)
        ) as any
      );
    }

    const results = await db
      .select()
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.created_at))
      .limit(500);

    return {
      statusCode: 200,
      body: JSON.stringify({ notes: results })
    };
  }

  // POST /api/notes (Create)
  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const note_id = `note_${Math.random().toString(36).slice(2, 14)}`;
    
    const title = body.title || (body.transcript?.trim().split('\n')[0].slice(0, 60) || 'Untitled note');

    const newNote = {
      note_id,
      user_id: user.user_id,
      title,
      transcript: body.transcript || '',
      polished: body.polished || '',
      style: body.style || 'Clear & Simple',
      duration: body.duration || 0,
      folder: body.folder || 'Uncategorized',
      favorite: !!body.favorite,
      tags: body.tags || [],
    };

    const [insertedNote] = await db.insert(notes).values(newNote).returning();
    
    // Increment notes_used
    await db.update(users)
      .set({ notes_used: sql`${users.notes_used} + 1` })
      .where(eq(users.user_id, user.user_id));

    return {
      statusCode: 200,
      body: JSON.stringify({ note: insertedNote })
    };
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
