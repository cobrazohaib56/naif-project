import nodemailer from "nodemailer";

const APP_NAME = "AI Study Companion";

let _transporter: nodemailer.Transporter | null = null;
let _transporterKey: string | null = null;

function getSmtpConfig(): { user: string; pass: string; rawPassLength: number } | null {
  const user = process.env.SMTP_USER?.trim();
  const rawPass = process.env.SMTP_PASS?.trim();
  const pass = rawPass?.replace(/\s+/g, "");

  if (!user || !pass) {
    console.warn("[email] SMTP_USER or SMTP_PASS env var is missing — email will not be sent");
    return null;
  }

  return { user, pass, rawPassLength: rawPass?.length ?? 0 };
}

export function getEmailConfigStatus() {
  const user = process.env.SMTP_USER?.trim() ?? "";
  const rawPass = process.env.SMTP_PASS?.trim() ?? "";
  const normalizedPass = rawPass.replace(/\s+/g, "");

  return {
    SMTP_USER: user ? "SET" : "MISSING",
    SMTP_PASS: normalizedPass
      ? `SET (raw length: ${rawPass.length}, normalized length: ${normalizedPass.length})`
      : "MISSING",
  };
}

function getTransporter(): { transporter: nodemailer.Transporter; from: string } | null {
  const config = getSmtpConfig();
  if (!config) return null;

  const transporterKey = `${config.user}:${config.pass}`;
  if (_transporter && _transporterKey === transporterKey) {
    return { transporter: _transporter, from: config.user };
  }

  console.log(
    `[email] Creating SMTP transporter: smtp.gmail.com:587, user=${config.user}, ` +
      `pass length=${config.pass.length}${config.rawPassLength !== config.pass.length ? ` (normalized from ${config.rawPassLength})` : ""}`
  );

  _transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  _transporterKey = transporterKey;

  return { transporter: _transporter, from: config.user };
}

async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const mailer = getTransporter();
  if (!mailer) return false;

  console.log(`[email] Sending "${subject}" to ${to}...`);

  try {
    const info = await mailer.transporter.sendMail({
      from: `"${APP_NAME}" <${mailer.from}>`,
      to,
      subject,
      html,
    });
    console.log(`[email] SUCCESS — sent to ${to}, messageId: ${info.messageId}`);
    return true;
  } catch (err: unknown) {
    _transporter = null;
    _transporterKey = null;
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
