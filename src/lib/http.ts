import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { env } from "@/lib/env";

export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.corsOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function json(data: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, {
    ...init,
    headers: { ...corsHeaders(), ...(init?.headers ?? {}) },
  });
}

export function error(message: string, status = 400, extra?: Record<string, unknown>) {
  return json({ error: message, ...extra }, { status });
}

type RouteCtx<P> = { params: Promise<P> };

/** Envelopa um handler: converte ZodError em 422 e erros inesperados em 500. */
export function handle<P = Record<string, string>>(
  fn: (req: Request, ctx: RouteCtx<P>) => Promise<NextResponse>,
) {
  return async (req: Request, ctx: RouteCtx<P>) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ZodError) {
        return error(err.issues[0]?.message ?? "Dados invalidos", 422);
      }
      if (err instanceof HttpError) {
        return error(err.message, err.status);
      }
      console.error("[api] erro inesperado", err);
      return error("Erro interno", 500);
    }
  };
}

export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
