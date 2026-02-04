import { Resend } from 'resend';

/**
 * Resend email client singleton
 *
 * Requires RESEND_API_KEY environment variable
 */

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey && process.env.NODE_ENV === 'production') {
  console.warn('[Email] RESEND_API_KEY not set - emails will not be sent');
}

export const resend = apiKey ? new Resend(apiKey) : null;

/**
 * Check if email sending is enabled
 */
export function isEmailEnabled(): boolean {
  return resend !== null;
}
