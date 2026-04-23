import { auth } from "@/auth";

export async function getSession() {
  return auth();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

// Admin role was removed per product decision: every authenticated user has
// full access. Kept as a no-op so existing call sites don't need to be touched
// and so future re-introduction of RBAC has a single obvious hook.
export function requireAdmin(_session: { user?: { role?: string } }) {
  return;
}
