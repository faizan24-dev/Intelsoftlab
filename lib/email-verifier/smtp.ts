// Step E — SMTP RCPT TO probe.
//
// Opens a TCP session to the MX host, gets as far as RCPT TO, and reads the
// server's reply. No DATA command is ever sent, so no mail is delivered.
//
// This step fails *by design* in many environments: most cloud platforms
// (Vercel included) block outbound port 25, and plenty of mail servers accept
// every recipient to avoid leaking their user list. Both cases return an
// honest "blocked" / "catch_all" rather than a guess.

import net from "node:net";
import type { SmtpOutcome } from "@/lib/email-verifier/types";

const CONNECT_TIMEOUT_MS = 4000;
const COMMAND_TIMEOUT_MS = 5000;
const SMTP_PORT = 25;

/** Identity used in the handshake — never receives anything. */
const PROBE_HELO_DOMAIN = process.env.SMTP_PROBE_DOMAIN || "verifier.local";
const PROBE_MAIL_FROM = process.env.SMTP_PROBE_FROM || `postmaster@${PROBE_HELO_DOMAIN}`;

export interface SmtpProbeResult {
  outcome: SmtpOutcome;
  code?: number;
  message?: string;
}

interface Session {
  send(command: string): Promise<{ code: number; text: string }>;
  close(): void;
}

function openSession(host: string): Promise<{ session: Session; greeting: number }> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port: SMTP_PORT });
    socket.setEncoding("utf8");

    let buffer = "";
    let pending: ((reply: { code: number; text: string }) => void) | null = null;
    let timer: NodeJS.Timeout | null = null;

    const clearTimer = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const fail = (err: Error) => {
      clearTimer();
      socket.destroy();
      reject(err);
    };

    /** SMTP replies may span lines: "250-FOO\r\n250 BAR\r\n". */
    const takeCompleteReply = (): { code: number; text: string } | null => {
      const lines = buffer.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^\d{3} /.test(line)) {
          const consumed = lines.slice(0, i + 1).join("\n");
          buffer = buffer.slice(consumed.length).replace(/^\r?\n/, "");
          return { code: Number(line.slice(0, 3)), text: consumed.trim() };
        }
      }
      return null;
    };

    socket.on("data", (chunk: string) => {
      buffer += chunk;
      const reply = takeCompleteReply();
      if (reply && pending) {
        const resolvePending = pending;
        pending = null;
        clearTimer();
        resolvePending(reply);
      }
    });

    socket.on("error", (err) => {
      if (pending) {
        const resolvePending = pending;
        pending = null;
        clearTimer();
        resolvePending({ code: 0, text: err.message });
      } else {
        fail(err);
      }
    });

    socket.on("close", () => {
      if (pending) {
        const resolvePending = pending;
        pending = null;
        clearTimer();
        resolvePending({ code: 0, text: "connection closed" });
      }
    });

    const waitForReply = (): Promise<{ code: number; text: string }> =>
      new Promise((resolveReply) => {
        const immediate = takeCompleteReply();
        if (immediate) return resolveReply(immediate);
        pending = resolveReply;
        timer = setTimeout(() => {
          pending = null;
          resolveReply({ code: 0, text: "timeout waiting for reply" });
        }, COMMAND_TIMEOUT_MS);
      });

    socket.setTimeout(CONNECT_TIMEOUT_MS, () => fail(new Error("connect timeout")));

    socket.once("connect", async () => {
      socket.setTimeout(0);
      const greeting = await waitForReply();
      if (greeting.code !== 220) {
        socket.destroy();
        return reject(new Error(`unexpected greeting: ${greeting.code || "none"}`));
      }
      resolve({
        greeting: greeting.code,
        session: {
          async send(command: string) {
            socket.write(command + "\r\n");
            return waitForReply();
          },
          close() {
            try {
              socket.write("QUIT\r\n");
            } catch {
              /* already gone */
            }
            socket.destroy();
          },
        },
      });
    });
  });
}

/** A local part that will not exist on any real mailbox. */
function randomLocalPart(): string {
  return `no-such-user-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Probe one mailbox. Returns `catch_all` when the server also accepts a
 * guaranteed-nonexistent address at the same domain, which means a 250 on the
 * real address proves nothing.
 */
export async function probeMailbox(
  host: string,
  email: string,
  domain: string,
): Promise<SmtpProbeResult> {
  let session: Session | null = null;
  try {
    const opened = await openSession(host);
    session = opened.session;

    const ehlo = await session.send(`EHLO ${PROBE_HELO_DOMAIN}`);
    if (ehlo.code !== 250) {
      const helo = await session.send(`HELO ${PROBE_HELO_DOMAIN}`);
      if (helo.code !== 250) {
        return { outcome: "blocked", code: helo.code, message: "Server refused the handshake." };
      }
    }

    const mailFrom = await session.send(`MAIL FROM:<${PROBE_MAIL_FROM}>`);
    if (mailFrom.code !== 250) {
      return {
        outcome: "blocked",
        code: mailFrom.code,
        message: "Server rejected the probe sender address.",
      };
    }

    const rcpt = await session.send(`RCPT TO:<${email}>`);

    if (rcpt.code === 250 || rcpt.code === 251) {
      // Accepted — but does it accept everything?
      const control = await session.send(`RCPT TO:<${randomLocalPart()}@${domain}>`);
      if (control.code === 250 || control.code === 251) {
        return {
          outcome: "catch_all",
          code: rcpt.code,
          message: "The server accepts mail for any address at this domain.",
        };
      }
      return { outcome: "accepted", code: rcpt.code, message: firstLine(rcpt.text) };
    }

    if (rcpt.code >= 500 && rcpt.code < 600) {
      return { outcome: "rejected", code: rcpt.code, message: firstLine(rcpt.text) };
    }
    if (rcpt.code >= 400 && rcpt.code < 500) {
      return { outcome: "greylisted", code: rcpt.code, message: firstLine(rcpt.text) };
    }
    return { outcome: "blocked", code: rcpt.code || undefined, message: firstLine(rcpt.text) };
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    const reason =
      err.code === "ECONNREFUSED"
        ? "The mail server refused the connection on port 25."
        : err.code === "ETIMEDOUT" || /timeout/i.test(err.message || "")
          ? "Port 25 is unreachable from this server, so the mailbox could not be probed."
          : err.code === "EHOSTUNREACH" || err.code === "ENETUNREACH"
            ? "The mail server was unreachable."
            : `SMTP probe failed (${err.code || err.message}).`;
    return { outcome: "blocked", message: reason };
  } finally {
    session?.close();
  }
}

function firstLine(text: string): string {
  return (text || "").split(/\r?\n/)[0].slice(0, 200);
}
