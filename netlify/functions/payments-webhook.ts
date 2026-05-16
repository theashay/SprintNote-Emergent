import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { db } from '../lib/db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any,
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body || '',
      sig || '',
      webhookSecret || ''
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan;

    if (userId) {
      console.log(`Updating user ${userId} to plan ${plan}`);
      await db
        .update(users)
        .set({ plan: 'pro' }) // Or specific plan name
        .where(eq(users.user_id, userId));
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};
