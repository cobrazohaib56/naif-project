import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const configuredOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

function getAllowedOrigin(request: NextRequest): string {
  const origin = request.headers.get("origin");
  if (origin && (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"))) {
    return origin;
  }
  return configuredOrigin;
}

export function middleware(request: NextRequest) {
  const allowOrigin = getAllowedOrigin(request);
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }
  const res = NextResponse.next();
  res.headers.set("Access-Control-Allow-Origin", allowOrigin);
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}

export const config = {
  // CORS for API and for root / (credentials callback redirects to /, so browser needs CORS there)
  matcher: ["/api/:path*", "/"],
};
