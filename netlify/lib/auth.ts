import jwt from 'jsonwebtoken';
import { eq, and, gt } from 'drizzle-orm';
import { db } from './db';
import { users, userSessions } from '../db/schema';

export async function getCurrentUser(headers: Record<string, string | undefined>) {
  const auth = headers.authorization;
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  const token = auth.split(' ')[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
    const [user] = await db.select().from(users).where(eq(users.user_id, decoded.sub)).limit(1);
    if (user) return user;
  } catch (e) {
    // Maybe it's an Emergent session token
    const [session] = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.session_token, token),
          gt(userSessions.expires_at, new Date())
        )
      )
      .limit(1);
    
    if (session) {
      const [user] = await db.select().from(users).where(eq(users.user_id, session.user_id)).limit(1);
      return user || null;
    }
  }
  return null;
}

export function generateToken(userId: string) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET!, { expiresIn: '30d' });
}
