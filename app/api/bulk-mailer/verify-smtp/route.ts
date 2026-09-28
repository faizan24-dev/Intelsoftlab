// POST /api/bulk-mailer/verify-smtp — open a connection and authenticate only.
// Nothing is sent; this just confirms the credentials before a campaign runs.

import { verifyTransport } from "@/lib/bulk-mailer/transport";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { host?: unknown; port?: unknown; secure?: unknown; user?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const host = typeof body.host === "string" ? body.host.trim() : "";
  const port = Number(body.port);
  if (!host) return Response.json({ error: "An SMTP host is required." }, { status: 400 });
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    return Response.json({ error: "The SMTP port must be between 1 and 65535." }, { status: 400 });
  }

  const result = await verifyTransport({
    host,
    port,
    secure: body.secure === true,
    user: typeof body.user === "string" ? body.user : "",
    password: typeof body.password === "string" ? body.password : "",
  });

  return Response.json(result);
}
