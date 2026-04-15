import nodemailer from "nodemailer";

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const APP_NAME = "AI Study Companion";

function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("SMTP not configured (SMTP_USER / SMTP_PASS missing). Skipping email to:", to);
    return false;
  }
  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${SMTP_USER}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("Failed to send email:", err instanceof Error ? err.message : err);
    return false;
  }
}

export async function sendWelcomeEmail(to: string, name?: string | null): Promise<boolean> {
  const greeting = name ? `Hi ${name}` : "Hi there";
  return sendMail(
    to,
    `Welcome to ${APP_NAME}!`,
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">${greeting}, welcome to ${APP_NAME}!</h2>
      <p>Your account has been created successfully. You can now:</p>
      <ul>
        <li>Upload and summarize your study notes</li>
        <li>Chat with AI about your documents</li>
        <li>Take quizzes to test your knowledge</li>
        <li>Use the writing coach to improve your essays</li>
      </ul>
      <p>Log in to get started!</p>
      <p style="color: #6B7280; font-size: 12px; margin-top: 32px;">
        &mdash; The ${APP_NAME} Team
      </p>
    </div>
    `
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
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Password Reset Request</h2>
      <p>${greeting},</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetLink}"
           style="background-color: #4F46E5; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p style="color: #6B7280; font-size: 14px;">
        This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
      </p>
      <p style="color: #6B7280; font-size: 12px; margin-top: 32px;">
        &mdash; The ${APP_NAME} Team
      </p>
    </div>
    `
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
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${bodyHtml}
      <p style="color: #6B7280; font-size: 12px; margin-top: 32px;">
        &mdash; ${APP_NAME}
      </p>
    </div>
    `
  );
}
