// Step B — DNS MX lookup.

import { Resolver } from "node:dns/promises";

export interface MxResult {
  found: boolean;
  /** Mail exchangers, lowest priority number first. */
  hosts: string[];
  /** Set when the lookup itself failed rather than returning no records. */
  error?: string;
}

const DNS_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * Resolve the domain's mail exchangers.
 * A domain with no MX but a valid A record can still accept mail (implicit MX),
 * so that case is reported as found with the domain itself as the host.
 */
export async function lookupMx(domain: string): Promise<MxResult> {
  const resolver = new Resolver({ timeout: DNS_TIMEOUT_MS, tries: 2 });

  try {
    const records = await withTimeout(resolver.resolveMx(domain), DNS_TIMEOUT_MS, "MX lookup");
    const hosts = records
      .filter((r) => r.exchange)
      .sort((a, b) => a.priority - b.priority)
      .map((r) => r.exchange.replace(/\.$/, ""));
    if (hosts.length) return { found: true, hosts };
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code;
    // ENODATA / ENOTFOUND are answers, not failures — fall through to the A
    // record check below. Anything else is a real resolver problem.
    if (code && code !== "ENODATA" && code !== "ENOTFOUND") {
      return { found: false, hosts: [], error: `DNS lookup failed (${code}).` };
    }
  }

  // RFC 5321 §5.1: no MX means fall back to the address record.
  try {
    const a = await withTimeout(resolver.resolve4(domain), DNS_TIMEOUT_MS, "A lookup");
    if (a.length) return { found: true, hosts: [domain] };
  } catch {
    /* no A record either */
  }

  return { found: false, hosts: [] };
}
