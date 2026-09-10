import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/http";

/**
 * Responde o preflight (OPTIONS) e injeta headers de CORS em toda resposta de
 * /api. Os handlers ja setam CORS via `json()`/`error()`; o proxy cobre respostas
 * geradas pelo proprio Next (404, 405, etc.).
 */
export default function proxy(req: Request) {
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
  }
  const res = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders())) {
    res.headers.set(key, value);
  }
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
