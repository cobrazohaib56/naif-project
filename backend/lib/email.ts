import nodemailer from "nodemailer";

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const APP_NAME = "AI Study Companion";

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn("[email] SMTP_USER or SMTP_PASS env var is missing — email will not be sent");
    return null;
  }
  if (_transporter) return _transporter;

  console.log(`[email] Creating SMTP transporter: smtp.gmail.com:587, user=${SMTP_USER}, pass length=${SMTP_PASS.length}`);

  _transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return _transporter;
}

async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  console.log(`[email] Sending "${subject}" to ${to}...`);

  try {
    const info = await transporter.sendMail({
      from: `"${APP_NAME}" <${SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[email] SUCCESS — sent to ${to}, messageId: ${info.messageId}`);
    return true;
  } catch (err: unknown) {
    _transporter = null;
    const errMsg = err instanceof Error ? err.message : String(err);
    const errCode = (err as { code?: string })?.code ?? "unknown";
    const errResp = (err as { responseCode?: number })?.responseCode;
    console.error(`[email] FAILED to send to ${to} — code: ${errCode}, responseCode: ${errResp}, message: ${errMsg}`);
    return false;
  }
}

export async function sendWelcomeEmail(to: string, name?: string | null): Promise<boolean> {
  const greeting = name ? `Hi ${name}` : "Hi there";
  return sendMail(
    to,
    `Welcome to ${APP_NAME}!`,
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#4F46E5;margin-bottom:8px;">${greeting}, welcome to ${APP_NAME}!</h2>
      <p style="color:#374151;">Your account has been created successfully. Here's what you can do:</p>
      <ul style="color:#374151;line-height:1.8;">
        <li>Upload and AI-summarize your study notes</li>
        <li>Chat with AI about any uploaded document</li>
        <li>Take quizzes to test your knowledge</li>
        <li>Use the writing coach to improve your essays</li>
        <li>Ask the AI assistant questions about course materials</li>
      </ul>
      <p style="color:#374151;">You can sign in at any time to get started.</p>
      <p style="color:#9CA3AF;font-size:12px;margin-top:32px;">- The ${APP_NAME} Team</p>
    </div>`
  );
}

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  name?: string | null
): Promise<boolean> {
  const greeting = name ? `Hi ${name}` : "Hi";
  return sendMail(
    to,
    `Reset your ${APP_NAME} password`,
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#4F46E5;">Password Reset Request</h2>
      <p style="color:#374151;">${greeting},</p>
      <p style="color:#374151;">We received a request to reset your password. Click the button below:</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${resetLink}"
           style="background-color:#4F46E5;color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;">
          Reset Password
        </a>
      </div>
      <p style="color:#6B7280;font-size:13px;">
        This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.
      </p>
      <p style="color:#9CA3AF;font-size:12px;margin-top:32px;">- The ${APP_NAME} Team</p>
    </div>`
  );
}

export async function sendCustomEmail(
  to: string,
  subject: string,
  bodyHtml: string
): Promise<boolean> {
  return sendMail(
    to,
    subject,
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      ${bodyHtml}
      <p style="color:#9CA3AF;font-size:12px;margin-top:32px;">- ${APP_NAME}</p>
    </div>`
  );
}
