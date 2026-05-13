import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { users } from '../db/schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  const { email, password } = JSON.parse(event.body || '{}');
  if (!email || !password) return { statusCode: 400, body: JSON.stringify({ detail: 'Email & password required' }) };

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    return { statusCode: 401, body: JSON.stringify({ detail: 'Invalid email or password' }) };
  }
  const token = jwt.sign({ sub: user.userId }, process.env.JWT_SECRET!, { expiresIn: '30d' });
  return {
    statusCode: 200,
    body: JSON.stringify({
      token,
      user: { user_id: user.userId, email: user.email, name: user.name, plan: user.plan, verified: user.verified },
    }),
  };
};
