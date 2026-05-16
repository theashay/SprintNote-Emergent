import type { Handler } from '@netlify/functions';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '../lib/db';
import { users } from '../db/schema';
import { generateToken } from '../lib/auth';
import { sendOtpEmail } from '../lib/mail';

function genOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  
  const { email, password } = JSON.parse(event.body || '{}');
  if (!email || !password) {
    return { statusCode: 400, body: JSON.stringify({ detail: 'Email & password required' }) };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  
  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    return { statusCode: 401, body: JSON.stringify({ detail: 'Invalid email or password' }) };
  }

  if (!user.verified) {
    // Re-issue OTP
    const otp = genOtp();
    const otp_expires = new Date(Date.now() + 10 * 60 * 1000);
    await db.update(users)
      .set({ otp, otp_expires })
      .where(eq(users.user_id, user.user_id));
    
    console.log(`[OTP LOGIN] ${user.email}: ${otp}`);
    await sendOtpEmail(user.email, otp);

    return { 
      statusCode: 403, 
      body: JSON.stringify({ 
        detail: 'Email not verified. A new OTP has been sent.', 
        otp_required: true, 
        email: user.email,
        dev_otp: otp 
      }) 
    };
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
        plan: user.plan,
        verified: user.verified
      },
    }),
  };
};
