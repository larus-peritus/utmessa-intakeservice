import { resend, isEmailEnabled } from './resend-client';
import {
  buildingStartedEmail,
  waitingForInputEmail,
  completedEmail,
  failedEmail,
  type EmailTemplateData,
} from './templates';

/**
 * Email notification service for POC Builder
 *
 * Sends transactional emails on status changes:
 * - Building started (status: running)
 * - Waiting for input (status: waiting)
 * - Completed (status: deployed)
 * - Failed (status: failed/abandoned)
 */

// Email sender configuration
const FROM_EMAIL = process.env.EMAIL_FROM || 'POC Smiður <noreply@utmessa.peritus.is>';

export interface SendEmailOptions {
  to: string;
  ideaTitle: string;
  token: string;
  status: string;
  waitingQuestion?: string;
  demoUrl?: string;
  repoUrl?: string;
  reason?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Build the receipt URL from token
 */
function buildReceiptUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://utmessa.peritus.is';
  return `${baseUrl}/i/${token}`;
}

/**
 * Send email notification based on status change
 *
 * @param options - Email options including recipient, idea details, and status
 * @returns Result with success status and message ID or error
 */
export async function sendStatusEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, ideaTitle, token, status, waitingQuestion, demoUrl, repoUrl, reason } = options;

  // Check if email is enabled
  if (!isEmailEnabled()) {
    console.log('[Email] Skipping email - RESEND_API_KEY not configured');
    return { success: false, error: 'Email not configured' };
  }

  // Validate email address
  if (!to || !to.includes('@')) {
    console.log('[Email] Skipping email - invalid email address');
    return { success: false, error: 'Invalid email address' };
  }

  // Build template data
  const templateData: EmailTemplateData = {
    title: ideaTitle,
    token,
    receiptUrl: buildReceiptUrl(token),
    demoUrl,
    repoUrl,
    waitingQuestion,
    reason,
  };

  // Select template based on status
  let emailContent: { subject: string; html: string } | null = null;

  switch (status) {
    case 'running':
      // Only send "building started" email when first transitioning to running
      emailContent = buildingStartedEmail(templateData);
      break;

    case 'waiting':
      emailContent = waitingForInputEmail(templateData);
      break;

    case 'deployed':
      emailContent = completedEmail(templateData);
      break;

    case 'failed':
    case 'abandoned':
      emailContent = failedEmail(templateData);
      break;

    default:
      // Don't send emails for other status changes
      console.log(`[Email] No email template for status: ${status}`);
      return { success: false, error: `No template for status: ${status}` };
  }

  try {
    console.log(`[Email] Sending ${status} notification to ${to} for idea "${ideaTitle}"`);

    const result = await resend!.emails.send({
      from: FROM_EMAIL,
      to,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (result.error) {
      console.error('[Email] Send failed:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[Email] Sent successfully, ID: ${result.data?.id}`);
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Send error:', message);
    return { success: false, error: message };
  }
}

/**
 * Check if a status change should trigger an email
 */
export function shouldSendEmail(
  newStatus: string,
  previousStatus?: string,
  hasEmail?: boolean
): boolean {
  // No email address provided
  if (!hasEmail) {
    return false;
  }

  // Status changes that trigger emails
  const emailTriggers = ['running', 'waiting', 'deployed', 'failed', 'abandoned'];

  if (!emailTriggers.includes(newStatus)) {
    return false;
  }

  // For 'running', only send if transitioning from claimed (first time running)
  if (newStatus === 'running' && previousStatus !== 'claimed') {
    return false;
  }

  return true;
}
