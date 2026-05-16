import type { Handler } from '@netlify/functions';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '../lib/db';
import { users } from '../db/schema';
import crypto from 'crypto';
import { sendOtpEmail } from '../lib/mail';

function genOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  
  const { email, password, name } = JSON.parse(event.body || '{}');
  if (!email || !password) {
    return { statusCode: 400, body: JSON.stringify({ detail: 'Email & password required' }) };
  }

  const emailLower = email.toLowerCase();
  const [existing] = await db.select().from(users).where(eq(users.email, emailLower)).limit(1);

  if (existing) {
    if (existing.verified) {
      return { statusCode: 409, body: JSON.stringify({ detail: 'Email already registered' }) };
    }
    // Re-issue OTP
    const otp = genOtp();
    const otp_expires = new Date(Date.now() + 10 * 60 * 1000);
    await db.update(users)
      .set({ otp, otp_expires })
      .where(eq(users.user_id, existing.user_id));
    
    console.log(`[OTP] ${emailLower}: ${otp}`);
    await sendOtpEmail(emailLower, otp);
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, email: emailLower, dev_otp: otp, message: 'OTP re-issued' })
    };
  }

  // Create new user
  const user_id = `user_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const otp = genOtp();
  const otp_expires = new Date(Date.now() + 10 * 60 * 1000);
  const hashedPassword = await bcrypt.hash(password, 10);

  await db.insert(users).values({
    user_id,
    email: emailLower,
    name: name || emailLower.split('@')[0],
    password: hashedPassword,
    verified: false,
    otp,
    otp_expires,
  });

  console.log(`[OTP] ${emailLower}: ${otp}`);
  await sendOtpEmail(emailLower, otp);
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, email: emailLower, dev_otp: otp, message: 'OTP sent' })
  };
};
