import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { sendCustomEmail } from "@/lib/email";

const bodySchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(10000),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Valid to, subject, and body are required" }, { status: 400 });
    }

    const { to, subject, body: emailBody } = parsed.data;
    const htmlBody = emailBody.replace(/\n/g, "<br>");
    const sent = await sendCustomEmail(to, subject, `<p>${htmlBody}</p>`);

    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send email. Check SMTP configuration." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Email sent successfully" });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Admin email error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
