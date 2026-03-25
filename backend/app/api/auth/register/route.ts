import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";

const UNITEN_EMAIL_REGEX = /@uniten\.edu\.my$/i;

const registerSchema = z.object({
  email: z.string().email().refine((e) => UNITEN_EMAIL_REGEX.test(e), {
    message: "Only UNITEN email (@uniten.edu.my) is allowed",
  }),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg =
        first.email?.[0] ?? first.password?.[0] ?? "Invalid registration data";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { email, password, name } = parsed.data;

    const password_hash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        email,
        password_hash,
        role: "student",
        name: name ?? null,
      })
      .select("id, email, role, name")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
