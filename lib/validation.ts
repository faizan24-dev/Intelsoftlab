// URL validation — ported from utils.py is_valid_url().

const URL_RE = new RegExp(
  "^(?:https?://)?" +
    "(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\\.)+[A-Z]{2,6}\\.?|" +
    "localhost|\\d{1,3}(?:\\.\\d{1,3}){3})" +
    "(?::\\d+)?(?:/?|[/?]\\S+)$",
  "i",
);

export function isValidUrl(url: string): boolean {
  return URL_RE.test(url.trim());
}
