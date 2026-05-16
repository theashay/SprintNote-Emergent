import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { getCurrentUser } from '../lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any,
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const user = await getCurrentUser(event.headers);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ detail: 'Unauthorized' }) };
  }

  try {
    const { plan } = JSON.parse(event.body || '{}');
    
    // In a real app, you would have these Price IDs in Stripe Dashboard
    const priceId = plan === 'annual' 
      ? (process.env.STRIPE_PRICE_ANNUAL || 'price_annual_placeholder')
      : (process.env.STRIPE_PRICE_MONTHLY || 'price_monthly_placeholder');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:8081'}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:8081'}/paywall`,
      customer_email: user.email,
      metadata: {
        user_id: user.user_id,
        plan: plan,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (e: any) {
    console.error('Stripe error:', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ detail: e.message }),
    };
  }
};
