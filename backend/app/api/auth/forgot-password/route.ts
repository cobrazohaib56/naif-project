import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";
import { sendPasswordResetEmail } from "@/lib/email";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const { email } = parsed.data;

    const { data: user } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("email", email)
      .single();

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ message: "If an account with that email exists, a reset link has been sent." });
    }

    // Invalidate any existing tokens for this user
    await supabase
      .from("password_reset_tokens")
      .update({ used: true })
      .eq("user_id", user.id)
      .eq("used", false);

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const { error: insertErr } = await supabase.from("password_reset_tokens").insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    });

    if (insertErr) {
      console.error("Failed to create reset token:", insertErr.message);
      return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
    }

    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;
    const emailSent = await sendPasswordResetEmail(user.email, resetLink, user.name);

    if (!emailSent) {
      console.error(
        `[forgot-password] FAILED to send reset email to ${user.email}. ` +
        "Check that SMTP_USER and SMTP_PASS are set correctly (Gmail requires an App Password). " +
        `FRONTEND_URL=${FRONTEND_URL}`
      );
    }

    return NextResponse.json({ message: "If an account with that email exists, a reset link has been sent." });
  } catch (e) {
    console.error("Forgot password error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
