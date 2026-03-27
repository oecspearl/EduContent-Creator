import { Resend } from 'resend';

// Email configuration using Resend
// Set RESEND_API_KEY in environment variables

let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('Email configured with Resend');
  }
  return resend;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'OECS LearnBoard <notifications@oecslearning.org>';
const APP_NAME = process.env.APP_NAME || 'OECS Learning Hub';
const APP_URL = process.env.APP_URL || process.env.HEROKU_APP_URL || 'http://localhost:5000';

// Email templates
function getBaseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .button {
      display: inline-block;
      background: #6366f1;
      color: white !important;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #4f46e5;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #6b7280;
      font-size: 14px;
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 10px 10px;
      background: white;
    }
    .info-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 15px;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${APP_NAME}</h1>
  </div>
  <div class="content">
    ${content}
  </div>
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
    <p>This email was sent automatically. Please do not reply directly to this email.</p>
  </div>
</body>
</html>
`;
}

export async function sendWelcomeEmail(
  email: string,
  fullName: string,
  resetToken: string,
  className?: string
): Promise<boolean> {
  const client = getResendClient();

  if (!client) {
    console.log(`[EMAIL NOT CONFIGURED] Would send welcome email to ${email}`);
    console.log(`Reset link: ${APP_URL}/reset-password?token=${resetToken}`);
    return false;
  }

  const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;

  const content = `
    <h2>Welcome to ${APP_NAME}!</h2>
    <p>Hi ${fullName},</p>
    <p>Your teacher has created an account for you${className ? ` and enrolled you in <strong>${className}</strong>` : ''}.</p>
    <p>To get started, you need to set up your password:</p>
    <div style="text-align: center;">
      <a href="${resetLink}" class="button">Set Your Password</a>
    </div>
    <div class="info-box">
      <p><strong>Your login email:</strong> ${email}</p>
    </div>
    <p>This link will expire in 24 hours for security reasons.</p>
    <p>If you didn't expect this email or have any questions, please contact your teacher.</p>
  `;

  try {
    const { data, error } = await client.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `Welcome to ${APP_NAME} - Set Your Password`,
      html: getBaseTemplate(content),
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }

    console.log(`Welcome email sent to ${email}`, data);
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  fullName: string,
  resetToken: string
): Promise<boolean> {
  const client = getResendClient();

  if (!client) {
    console.log(`[EMAIL NOT CONFIGURED] Would send password reset email to ${email}`);
    console.log(`Reset link: ${APP_URL}/reset-password?token=${resetToken}`);
    return false;
  }

  const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;

  const content = `
    <h2>Password Reset Request</h2>
    <p>Hi ${fullName},</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <div style="text-align: center;">
      <a href="${resetLink}" class="button">Reset Password</a>
    </div>
    <p>This link will expire in 1 hour for security reasons.</p>
    <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    <div class="info-box">
      <p><strong>Can't click the button?</strong> Copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 12px;">${resetLink}</p>
    </div>
  `;

  try {
    const { data, error } = await client.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `${APP_NAME} - Password Reset Request`,
      html: getBaseTemplate(content),
    });

    if (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }

    console.log(`Password reset email sent to ${email}`, data);
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

export async function sendBulkWelcomeEmails(
  students: Array<{ email: string; fullName: string; resetToken: string }>,
  className: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const student of students) {
    const success = await sendWelcomeEmail(
      student.email,
      student.fullName,
      student.resetToken,
      className
    );
    if (success) {
      sent++;
    } else {
      failed++;
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { sent, failed };
}

export async function sendAssignmentNotificationEmail(
  email: string,
  studentName: string,
  contentTitle: string,
  contentType: string,
  className: string,
  contentId: string,
  dueDate?: Date | null,
  instructions?: string | null
): Promise<boolean> {
  const client = getResendClient();

  if (!client) {
    console.log(`[EMAIL NOT CONFIGURED] Would send assignment notification to ${email}`);
    return false;
  }

  const contentLink = `${APP_URL}/public/${contentId}`;
  const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : null;

  const contentTypeLabel = contentType
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const content = `
    <h2>New Assignment Available</h2>
    <p>Hi ${studentName},</p>
    <p>Your teacher has assigned new content for you in <strong>${className}</strong>:</p>
    <div class="info-box">
      <p><strong>Title:</strong> ${contentTitle}</p>
      <p><strong>Type:</strong> ${contentTypeLabel}</p>
      ${formattedDueDate ? `<p><strong>Due Date:</strong> ${formattedDueDate}</p>` : ''}
      ${instructions ? `<p><strong>Instructions:</strong> ${instructions}</p>` : ''}
    </div>
    <div style="text-align: center;">
      <a href="${contentLink}" class="button">Start Learning</a>
    </div>
    <p>Click the button above to access your assignment and begin working on it.</p>
    <div class="info-box">
      <p><strong>Can't click the button?</strong> Copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 12px;">${contentLink}</p>
    </div>
  `;

  try {
    const { data, error } = await client.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `New Assignment: ${contentTitle} - ${APP_NAME}`,
      html: getBaseTemplate(content),
    });

    if (error) {
      console.error('Failed to send assignment notification email:', error);
      return false;
    }

    console.log(`Assignment notification email sent to ${email}`, data);
    return true;
  } catch (error) {
    console.error('Failed to send assignment notification email:', error);
    return false;
  }
}

export async function sendBulkAssignmentNotifications(
  students: Array<{ email: string; fullName: string }>,
  contentTitle: string,
  contentType: string,
  className: string,
  contentId: string,
  dueDate?: Date | null,
  instructions?: string | null
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const student of students) {
    const success = await sendAssignmentNotificationEmail(
      student.email,
      student.fullName,
      contentTitle,
      contentType,
      className,
      contentId,
      dueDate,
      instructions
    );
    if (success) {
      sent++;
    } else {
      failed++;
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { sent, failed };
}
