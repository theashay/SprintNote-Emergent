import type { Handler } from '@netlify/functions';
import { eq, and } from 'drizzle-orm';
import { db } from '../lib/db';
import { notes } from '../db/schema';
import { getCurrentUser } from '../lib/auth';

export const handler: Handler = async (event) => {
  const user = await getCurrentUser(event.headers);
  if (!user) return { statusCode: 401, body: JSON.stringify({ detail: 'Unauthorized' }) };

  // Extract ID from query param (via netlify redirect) or path
  const noteId = event.queryStringParameters?.id || event.path.split('/').pop();

  if (!noteId) return { statusCode: 400, body: JSON.stringify({ detail: 'Note ID required' }) };

  // GET /api/notes/:id
  if (event.httpMethod === 'GET') {
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.note_id, noteId), eq(notes.user_id, user.user_id)))
      .limit(1);

    if (!note) return { statusCode: 404, body: JSON.stringify({ detail: 'Note not found' }) };

    return {
      statusCode: 200,
      body: JSON.stringify({ note })
    };
  }

  // PUT /api/notes/:id
  if (event.httpMethod === 'PUT') {
    const body = JSON.parse(event.body || '{}');
    const update: any = { ...body, updated_at: new Date() };
    delete update.note_id;
    delete update.user_id;
    delete update.created_at;

    await db.update(notes)
      .set(update)
      .where(and(eq(notes.note_id, noteId), eq(notes.user_id, user.user_id)));

    const [updatedNote] = await db
      .select()
      .from(notes)
      .where(eq(notes.note_id, noteId))
      .limit(1);

    if (!updatedNote) return { statusCode: 404, body: JSON.stringify({ detail: 'Note not found' }) };

    return {
      statusCode: 200,
      body: JSON.stringify({ note: updatedNote })
    };
  }

  // DELETE /api/notes/:id
  if (event.httpMethod === 'DELETE') {
    await db.delete(notes)
      .where(and(eq(notes.note_id, noteId), eq(notes.user_id, user.user_id)));

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
