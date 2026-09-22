// URL helpers — ported from scraper.py (normalize_url / get_domain / is_same_domain).

/** Trim, ensure an https scheme, and strip trailing slashes from the path. */
export function normalizeUrl(raw: string): string {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.protocol}//${u.host}${path}${u.search}${u.hash}`;
  } catch {
    return url;
  }
}

/** Registrable host (lowercased, incl. port) of the normalized URL. */
export function getDomain(url: string): string {
  try {
    return new URL(normalizeUrl(url)).host.toLowerCase();
  } catch {
    return "";
  }
}

/** True when `url` is on `baseDomain` or a subdomain of it. */
export function isSameDomain(url: string, baseDomain: string): boolean {
  try {
    const host = new URL(url).host.toLowerCase();
    return host === baseDomain || host.endsWith("." + baseDomain);
  } catch {
    return false;
  }
}

/** Join a possibly-relative href against a base URL (urljoin equivalent). */
export function joinUrl(base: string, href: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/** Strip query + fragment and trailing slash (used when enqueueing discovered links). */
export function stripQueryFragment(url: string): string | null {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.protocol}//${u.host}${path}`;
  } catch {
    return null;
  }
}
