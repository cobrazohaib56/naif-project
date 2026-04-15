import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { sendWelcomeEmail } from "@/lib/email";

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = first.email?.[0] ?? first.password?.[0] ?? "Invalid registration data";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const name = parsed.data.name?.trim() || null;
    const normalizedEmail = email.toLowerCase().trim();

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        email: normalizedEmail,
        password_hash,
        role: "student",
        name,
      })
      .select("id, email, role, name")
      .single();

    if (error || !user) {
      console.error("[register] Supabase insert error:", error?.message ?? "no user returned");
      if (error?.code === "23505") {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: error?.message ?? "Failed to create account" },
        { status: 500 }
      );
    }

    // MUST await the email — fire-and-forget dies on serverless/Render free tier
    // Use a timeout so email issues don't block registration forever
    let emailSent = false;
    try {
      emailSent = await Promise.race([
        sendWelcomeEmail(user.email, name),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 12000)),
      ]);
    } catch (emailErr) {
      console.error("[register] Email error:", emailErr instanceof Error ? emailErr.message : emailErr);
    }

    console.log(`[register] User created: ${user.email}, welcome email sent: ${emailSent}`);

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        emailSent,
      },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[register] Unexpected error:", msg);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
