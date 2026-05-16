import type { Handler } from '@netlify/functions';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../lib/db';
import { users, userSessions } from '../db/schema';
import { generateToken } from '../lib/auth';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  
  const { session_id } = JSON.parse(event.body || '{}');
  if (!session_id) {
    return { statusCode: 400, body: JSON.stringify({ detail: 'session_id required' }) };
  }

  // Fetch session data from Emergent
  const res = await fetch('https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data', {
    headers: { 'X-Session-ID': session_id }
  });

  if (!res.ok) {
    return { statusCode: 401, body: JSON.stringify({ detail: 'Invalid Emergent session' }) };
  }

  const data = await res.json();
  const email = data.email?.toLowerCase();
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ detail: 'Emergent session missing email' }) };
  }

  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    const user_id = `user_${Math.random().toString(36).slice(2, 14)}`;
    user = {
      user_id,
      email,
      name: data.name || email.split('@')[0],
      picture: data.picture,
      verified: true,
      auth_provider: 'google',
      plan: 'free',
      notes_used: 0,
      notes_quota: 50,
      created_at: new Date(),
    } as any;
    await db.insert(users).values(user);
  } else {
    await db.update(users)
      .set({
        name: data.name || user.name,
        picture: data.picture || user.picture,
        verified: true,
        last_login: new Date(),
      })
      .where(eq(users.user_id, user.user_id));
  }

  // Save session token
  if (data.session_token) {
    await db.insert(userSessions).values({
      session_token: data.session_token,
      user_id: user.user_id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }).onConflictDoUpdate({
      target: userSessions.session_token,
      set: { expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
    });
  }

  const token = generateToken(user.user_id);

  return {
    statusCode: 200,
    body: JSON.stringify({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        plan: user.plan,
        verified: true,
      }
    })
  };
};
