import type { Handler } from '@netlify/functions';
import { getCurrentUser } from '../lib/auth';

export const handler: Handler = async (event) => {
  const user = await getCurrentUser(event.headers);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ detail: 'Unauthorized' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        verified: user.verified,
      }
    })
  };
};
