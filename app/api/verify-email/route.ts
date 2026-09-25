// POST /api/verify-email  { email: string, smtp?: boolean }
// → { result: EmailVerification }

import { verifyEmail } from "@/lib/email-verifier";
import type { EmailVerification } from "@/lib/email-verifier/types";

export const runtime = "nodejs";
export const maxDuration = 30;

interface RequestBody {
  email?: unknown;
  /** Set false to skip the SMTP handshake. */
  smtp?: unknown;
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return Response.json({ error: "An `email` is required." }, { status: 400 });
  }
  if (email.length > 320) {
    return Response.json({ error: "That address is too long to be valid." }, { status: 400 });
  }

  try {
    const result = await verifyEmail(email, {
      smtp: body.smtp === false ? false : undefined,
    });
    return Response.json({ result } satisfies { result: EmailVerification });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Verification failed." },
      { status: 500 },
    );
  }
}
