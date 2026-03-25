import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

const useSecureCookies =
  process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;

const crossSiteCookies: NextAuthConfig["cookies"] = {
  sessionToken: {
    name: `__Secure-next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: "none" as const,
      path: "/",
      secure: true,
    },
  },
  callbackUrl: {
    name: `__Secure-next-auth.callback-url`,
    options: {
      httpOnly: true,
      sameSite: "none" as const,
      path: "/",
      secure: true,
    },
  },
  csrfToken: {
    name: `__Secure-next-auth.csrf-token`,
    options: {
      httpOnly: false,
      sameSite: "none" as const,
      path: "/",
      secure: true,
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email);
        const password = String(credentials.password);

        const { data: user, error } = await supabase
          .from("users")
          .select("id, email, password_hash, role, name, is_active")
          .eq("email", email)
          .single();

        if (error || !user) return null;
        if (user.is_active === false) return null;
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  ...(useSecureCookies && { cookies: crossSiteCookies }),
});
