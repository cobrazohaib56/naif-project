import { NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { getEmailConfigStatus, sendCustomEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const body = await request.json().catch(() => ({}));
    const to = body.to as string;

    if (!to || !to.includes("@")) {
      return NextResponse.json({ error: "Provide a valid 'to' email" }, { status: 400 });
    }

    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpStatus = getEmailConfigStatus();

    if (smtpStatus.SMTP_USER === "MISSING" || smtpStatus.SMTP_PASS === "MISSING") {
      return NextResponse.json({
        error: "SMTP not configured",
        details: smtpStatus,
      }, { status: 500 });
    }

    console.log(`[email-test] Attempting test email to: ${to} from: ${smtpUser}`);

    const sent = await sendCustomEmail(
      to,
      "Test Email - AI Study Companion",
      `<h2 style="color:#4F46E5;">Email is working!</h2>
       <p>If you're reading this, your SMTP configuration is correct.</p>
       <p><strong>From:</strong> ${smtpUser}</p>
       <p><strong>To:</strong> ${to}</p>
       <p><strong>Time:</strong> ${new Date().toISOString()}</p>`
    );

    if (!sent) {
      return NextResponse.json({
        error: "Email send failed — check Render logs for the detailed error from Gmail",
        hint: "Common causes: wrong App Password, 2FA not enabled on Gmail, or Gmail blocked the connection",
      }, { status: 500 });
    }

    return NextResponse.json({
      message: `Test email sent successfully to ${to}`,
      from: smtpUser,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
