import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, name, role, is_active, created_at")
      .eq("role", "student")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(users ?? []);
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const body = await req.json();
    const { userId, is_active } = body;

    if (!userId || typeof is_active !== "boolean") {
      return NextResponse.json(
        { error: "userId and is_active (boolean) are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("users")
      .update({ is_active })
      .eq("id", userId)
      .eq("role", "student")
      .select("id, email, name, role, is_active, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
