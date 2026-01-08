import nodemailer from 'nodemailer';

// Email configuration - supports multiple providers
// Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD in environment
// Or use SENDGRID_API_KEY for SendGrid
// Or use Gmail with GMAIL_USER and GMAIL_APP_PASSWORD

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  // Check for SendGrid
  if (process.env.SENDGRID_API_KEY) {
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
    console.log('Email configured with SendGrid');
    return transporter;
  }

  // Check for Gmail
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    console.log('Email configured with Gmail');
    return transporter;
  }

  // Check for generic SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
    console.log('Email configured with SMTP');
    return transporter;
  }

  // Fallback: create a test account for development (emails won't actually be sent)
  console.warn('No email configuration found. Emails will be logged but not sent.');
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: 'test@ethereal.email',
      pass: 'test',
    },
  });
  return transporter;
}

export function isEmailConfigured(): boolean {
  return !!(
    process.env.SENDGRID_API_KEY ||
    (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) ||
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
  );
}

const EMAIL_FROM = process.env.EMAIL_FROM || 'OECS Learning Hub <noreply@oecslearninghub.com>';
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
  if (!isEmailConfigured()) {
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
    const transport = getTransporter();
    await transport.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: `Welcome to ${APP_NAME} - Set Your Password`,
      html: getBaseTemplate(content),
    });
    console.log(`Welcome email sent to ${email}`);
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
  if (!isEmailConfigured()) {
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
    const transport = getTransporter();
    await transport.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: `${APP_NAME} - Password Reset Request`,
      html: getBaseTemplate(content),
    });
    console.log(`Password reset email sent to ${email}`);
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
