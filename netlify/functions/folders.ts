import type { Handler } from '@netlify/functions';
import { eq, sql } from 'drizzle-orm';
import { db } from '../lib/db';
import { notes } from '../db/schema';
import { getCurrentUser } from '../lib/auth';

export const handler: Handler = async (event) => {
  const user = await getCurrentUser(event.headers);
  if (!user) return { statusCode: 401, body: JSON.stringify({ detail: 'Unauthorized' }) };

  const results = await db
    .select({
      name: notes.folder,
      count: sql<number>`count(*)`
    })
    .from(notes)
    .where(eq(notes.user_id, user.user_id))
    .groupBy(notes.folder)
    .orderBy(sql`count(*) desc`);

  if (results.length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify({ folders: [{ name: 'Uncategorized', count: 0 }] })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ folders: results })
  };
};
