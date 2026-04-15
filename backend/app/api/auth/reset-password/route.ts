import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { sendCustomEmail } from "@/lib/email";

const bodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = first.token?.[0] ?? first.password?.[0] ?? "Invalid request";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { token, password } = parsed.data;

    const { data: resetRecord, error: fetchErr } = await supabase
      .from("password_reset_tokens")
      .select("id, user_id, expires_at, used")
      .eq("token", token)
      .single();

    if (fetchErr || !resetRecord) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    if (resetRecord.used) {
      return NextResponse.json({ error: "This reset link has already been used" }, { status: 400 });
    }

    if (new Date(resetRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: "This reset link has expired" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { error: updateErr } = await supabase
      .from("users")
      .update({ password_hash: passwordHash })
      .eq("id", resetRecord.user_id);

    if (updateErr) {
      console.error("Failed to update password:", updateErr.message);
      return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
    }

    await supabase
      .from("password_reset_tokens")
      .update({ used: true })
      .eq("id", resetRecord.id);

    // Send confirmation email
    const { data: user } = await supabase
      .from("users")
      .select("email, name")
      .eq("id", resetRecord.user_id)
      .single();

    if (user) {
      await sendCustomEmail(
        user.email,
        "Your password has been reset",
        `<h2 style="color: #4F46E5;">Password Changed</h2>
         <p>${user.name ? `Hi ${user.name}` : "Hi"},</p>
         <p>Your password has been successfully reset. If you did not make this change, please contact support immediately.</p>`
      );
    }

    return NextResponse.json({ message: "Password reset successfully. You can now log in." });
  } catch (e) {
    console.error("Reset password error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Password reset failed" }, { status: 500 });
  }
}
