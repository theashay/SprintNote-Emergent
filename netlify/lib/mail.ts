import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOtpEmail(email: string, otp: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'SprintNote <onboarding@resend.dev>',
      to: [email],
      subject: 'Your SprintNote Verification Code',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Welcome to SprintNote!</h2>
          <p>Please use the following code to verify your email address:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 20px; background: #f4f4f4; border-radius: 8px; text-align: center; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Mail system error:', err);
    return { success: false, error: err };
  }
}
