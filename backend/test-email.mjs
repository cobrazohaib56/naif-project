/**
 * Standalone email test — run directly from terminal:
 *
 *   node test-email.mjs YOUR_GMAIL YOUR_APP_PASSWORD RECIPIENT_EMAIL
 *
 * Example:
 *   node test-email.mjs admin@gmail.com "abcd efgh ijkl mnop" naif@gmail.com
 */

import nodemailer from "nodemailer";

const [,, smtpUser, smtpPass, to] = process.argv;

if (!smtpUser || !smtpPass || !to) {
  console.error("\nUsage:  node test-email.mjs <SMTP_USER> <SMTP_PASS> <TO_EMAIL>\n");
  console.error("Example: node test-email.mjs mygmail@gmail.com 'abcdefghijklmnop' recipient@gmail.com\n");
  process.exit(1);
}

console.log(`\nSMTP_USER: ${smtpUser}`);
console.log(`SMTP_PASS: ${"*".repeat(smtpPass.length)} (${smtpPass.length} chars)`);
console.log(`TO:        ${to}`);
console.log(`\nConnecting to smtp.gmail.com:587 ...\n`);

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: { user: smtpUser, pass: smtpPass },
  tls: { rejectUnauthorized: false },
});

try {
  // Step 1: Verify connection
  await transporter.verify();
  console.log("SMTP connection verified OK\n");

  // Step 2: Send test email
  const info = await transporter.sendMail({
    from: `"Test" <${smtpUser}>`,
    to,
    subject: "Test Email from AI Study Companion",
    html: `<h2>It works!</h2><p>Email sent at ${new Date().toISOString()}</p>`,
  });

  console.log(`Email SENT successfully!`);
  console.log(`  messageId: ${info.messageId}`);
  console.log(`\nCheck the inbox of ${to} (also check spam)\n`);
} catch (err) {
  console.error(`\nFAILED: ${err.message}\n`);
  if (err.message.includes("535")) {
    console.error(">>> This means Gmail rejected your credentials.");
    console.error(">>> Make sure you're using a Gmail App Password, NOT your regular password.");
    console.error(">>> Steps: Google Account → Security → 2-Step Verification → App Passwords\n");
  }
  if (err.message.includes("ECONNREFUSED") || err.message.includes("ETIMEDOUT")) {
    console.error(">>> Cannot connect to smtp.gmail.com — check your network/firewall.\n");
  }
  process.exit(1);
}
