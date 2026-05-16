import type { Handler } from '@netlify/functions';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { users } from '../db/schema';
import { generateToken } from '../lib/auth';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  
  const { email, otp } = JSON.parse(event.body || '{}');
  if (!email || !otp) {
    return { statusCode: 400, body: JSON.stringify({ detail: 'Email & OTP required' }) };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user) {
    return { statusCode: 404, body: JSON.stringify({ detail: 'User not found' }) };
  }

  if (!user.otp_expires || user.otp_expires < new Date()) {
    return { statusCode: 400, body: JSON.stringify({ detail: 'OTP expired' }) };
  }

  if (user.otp !== otp) {
    return { statusCode: 401, body: JSON.stringify({ detail: 'Invalid OTP' }) };
  }

  await db.update(users)
    .set({ verified: true, otp: null, otp_expires: null })
    .where(eq(users.user_id, user.user_id));

  const token = generateToken(user.user_id);

  return {
    statusCode: 200,
    body: JSON.stringify({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        verified: true,
      }
    })
  };
};
