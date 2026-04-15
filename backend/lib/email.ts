import nodemailer from "nodemailer";

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const APP_NAME = "AI Study Companion";

// Singleton transporter — created once, reused across calls
let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn("[email] SMTP_USER or SMTP_PASS not set — email disabled");
    return null;
  }
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // STARTTLS on port 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS, // must be a Gmail App Password (not your Gmail login password)
    },
    tls: {
      rejectUnauthorized: false, // allows Render's cloud environment to connect
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

  try {
    const info = await transporter.sendMail({
      from: `"${APP_NAME}" <${SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[email] Sent to ${to} — messageId: ${info.messageId}`);
    return true;
  } catch (err) {
    // Reset singleton so next call tries a fresh connection
    _transporter = null;
    console.error(`[email] Failed to send to ${to}:`, err instanceof Error ? err.message : err);
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
        <li>📄 Upload and AI-summarize your study notes</li>
        <li>💬 Chat with AI about any uploaded document</li>
        <li>🧠 Take quizzes to test your knowledge</li>
        <li>✍️ Use the writing coach to improve your essays</li>
        <li>🔍 Ask the AI assistant questions about course materials</li>
      </ul>
      <p style="color:#374151;">You can sign in at any time to get started.</p>
      <p style="color:#9CA3AF;font-size:12px;margin-top:32px;">— The ${APP_NAME} Team</p>
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
      <p style="color:#9CA3AF;font-size:12px;margin-top:32px;">— The ${APP_NAME} Team</p>
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
      <p style="color:#9CA3AF;font-size:12px;margin-top:32px;">— ${APP_NAME}</p>
    </div>`
  );
}
