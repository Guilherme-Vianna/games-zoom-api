import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export function GET() {
  return json({ status: "ok", service: "games-zoom-api", time: new Date().toISOString() });
}
