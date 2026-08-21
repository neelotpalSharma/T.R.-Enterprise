import nodemailer from 'nodemailer';

export interface SentEmailLog {
  id: string;
  to: string;
  subject: string;
  otp: string;
  verificationToken: string;
  verificationLink: string;
  expiresAt: string;
  sentAt: string;
  htmlContent: string;
  status: 'delivered' | 'simulated' | 'error';
  errorMessage?: string;
}

// In-memory queue of recently sent emails for testing / preview in AI Studio
const sentEmailsLog: SentEmailLog[] = [];

// Lazy transporter configuration
let mailTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (mailTransporter) return mailTransporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true';

  if (host && user && pass) {
    try {
      mailTransporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      console.log(`[Email] Configured custom SMTP transporter (${host}:${port})`);
    } catch (e) {
      console.warn('[Email] Failed to create custom SMTP transporter:', e);
    }
  }

  return mailTransporter;
}

export async function sendVerificationEmail({
  email,
  name,
  otp,
  verificationToken,
  baseUrl,
  expiresInMinutes = 15,
}: {
  email: string;
  name: string;
  otp: string;
  verificationToken: string;
  baseUrl: string;
  expiresInMinutes?: number;
}): Promise<{ success: boolean; logId: string; simulated: boolean }> {
  const logId = 'mail-' + Math.random().toString(36).substring(2, 9);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const verificationLink = `${cleanBaseUrl}/?verify_token=${verificationToken}&email=${encodeURIComponent(email)}`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - T R Enterprise</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px 30px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 14px; margin-bottom: 12px; line-height: 48px; font-size: 24px; color: #ffffff;">
                🔐
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                T R Enterprise
              </h1>
              <p style="margin: 4px 0 0; color: #93c5fd; font-size: 13px; font-weight: 500;">
                Berger Paints & Hardware Store &bull; Secure Auth Portal
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 18px; font-weight: 700;">
                Welcome, ${name || 'Valued User'}!
              </h2>
              <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.6;">
                Thank you for creating an account on the <strong>T R Enterprise</strong> management system. To activate your account and access POS billing & inventory, please verify your email address.
              </p>

              <!-- Option 1: 6-Digit OTP Box -->
              <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 22px; text-align: center; margin: 24px 0;">
                <span style="display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                  Your 6-Digit Verification Code
                </span>
                <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: 'Courier New', Courier, monospace; background: #ffffff; padding: 12px 20px; border-radius: 10px; display: inline-block; border: 1px solid #bfdbfe;">
                  ${otp}
                </div>
                <p style="margin: 10px 0 0; font-size: 12px; color: #64748b;">
                  Enter this OTP on the verification screen.
                </p>
              </div>

              <!-- Option 2: 1-Click Verification Link -->
              <div style="text-align: center; margin: 28px 0 20px;">
                <p style="margin: 0 0 12px; font-size: 13px; color: #475569; font-weight: 500;">
                  Or verify directly with one click:
                </p>
                <a href="${verificationLink}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                  Verify Email Address &rarr;
                </a>
              </div>

              <!-- Security Notice & Expiry -->
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 14px 16px; margin-top: 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="24" valign="top" style="font-size: 16px; line-height: 1;">⏳</td>
                    <td style="padding-left: 8px; font-size: 12px; color: #92400e; line-height: 1.5;">
                      <strong>Expiry Warning:</strong> This verification code and link will expire in <strong>${expiresInMinutes} minutes</strong>. If you did not sign up for an account, please safely ignore this message.
                    </td>
                  </tr>
                </table>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; line-height: 1.6;">
              <p style="margin: 0;">
                T R Enterprise &bull; Authorized Dealer: Berger Paints & Hardware Store<br>
                NH-34, Station Road, Nadia, West Bengal - 741101
              </p>
              <p style="margin: 8px 0 0;">
                Direct Token Link: <a href="${verificationLink}" style="color: #64748b; word-break: break-all;">${verificationLink}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  let simulated = true;
  const transporter = getTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"T R Enterprise Auth" <noreply@trenterprise.com>',
        to: email,
        subject: `[OTP: ${otp}] Verify Your Email - T R Enterprise`,
        html: emailHtml,
        text: `Welcome to T R Enterprise!\n\nYour 6-digit verification code is: ${otp}\n\nOr click this link to verify your email:\n${verificationLink}\n\nThis verification link expires in ${expiresInMinutes} minutes.`,
      });
      simulated = false;
      console.log(`[Email] Live email sent successfully to ${email}`);
    } catch (err: any) {
      console.warn(`[Email] SMTP send failed (${err.message}), logging to simulated inbox.`);
    }
  }

  // Always log to in-memory buffer so the UI can preview it effortlessly
  sentEmailsLog.unshift({
    id: logId,
    to: email,
    subject: `Verify Your Email (${otp}) - T R Enterprise`,
    otp,
    verificationToken,
    verificationLink,
    expiresAt,
    sentAt: new Date().toISOString(),
    htmlContent: emailHtml,
    status: simulated ? 'simulated' : 'delivered',
  });

  // Keep max 50 recent emails in memory
  if (sentEmailsLog.length > 50) {
    sentEmailsLog.pop();
  }

  return { success: true, logId, simulated };
}

export function getRecentEmails(filterEmail?: string): SentEmailLog[] {
  if (filterEmail) {
    const clean = filterEmail.trim().toLowerCase();
    return sentEmailsLog.filter(m => m.to.toLowerCase() === clean);
  }
  return sentEmailsLog;
}

export function clearEmailLogs(): void {
  sentEmailsLog.length = 0;
}
