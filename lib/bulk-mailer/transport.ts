// Nodemailer transport factory.
//
// Credentials live only in the request that created the campaign and in the
// campaign's in-memory record. They are never written to disk, never logged,
// and never returned by the status endpoint.

import nodemailer, { type Transporter } from "nodemailer";
import type { SmtpConfig } from "@/lib/bulk-mailer/types";

const CONNECTION_TIMEOUT_MS = 15_000;

export function createTransport(smtp: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: CONNECTION_TIMEOUT_MS,
    socketTimeout: CONNECTION_TIMEOUT_MS,
    // One connection, reused for the whole campaign.
    pool: true,
    maxConnections: 1,
    maxMessages: Infinity,
  });
}

export interface VerifyResult {
  ok: boolean;
  message: string;
}

/** Open a connection and authenticate, without sending anything. */
export async function verifyTransport(smtp: SmtpConfig): Promise<VerifyResult> {
  let transporter: Transporter | null = null;
  try {
    transporter = createTransport(smtp);
    await transporter.verify();
    return { ok: true, message: `Connected to ${smtp.host}:${smtp.port} and authenticated.` };
  } catch (e) {
    return { ok: false, message: describeSmtpError(e) };
  } finally {
    transporter?.close();
  }
}

/** Turn a nodemailer/SMTP error into something a user can act on. */
export function describeSmtpError(error: unknown): string {
  const err = error as NodeJS.ErrnoException & { responseCode?: number; response?: string };
  const code = err?.code;
  const response = (err?.response || "").split(/\r?\n/)[0];

  if (code === "EAUTH") {
    return `Authentication failed — check the username and password. ${response}`.trim();
  }
  if (code === "ECONNREFUSED") {
    return "The SMTP server refused the connection — check the host and port.";
  }
  if (code === "ETIMEDOUT" || code === "ESOCKET" || code === "ECONNECTION") {
    return "Could not reach the SMTP server — check the host, port, and whether outbound SMTP is allowed from this server.";
  }
  if (code === "EDNS" || code === "ENOTFOUND") {
    return "The SMTP host could not be resolved — check the hostname.";
  }
  if (code === "EENVELOPE") {
    return `The server rejected the sender or recipient. ${response}`.trim();
  }
  if (code === "EMESSAGE") {
    return `The server rejected the message. ${response}`.trim();
  }
  if (err?.responseCode && response) return `SMTP ${err.responseCode}: ${response}`;
  return err?.message || "Unknown SMTP error.";
}
