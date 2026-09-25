// Steps C & D — webmail / disposable provider detection and role accounts.

/** Consumer mailbox providers. Deliverable, but not a business address. */
const WEBMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.co.in",
  "yahoo.fr", "yahoo.de", "ymail.com", "rocketmail.com", "hotmail.com",
  "hotmail.co.uk", "hotmail.fr", "hotmail.de", "outlook.com", "outlook.fr",
  "live.com", "live.co.uk", "msn.com", "aol.com", "aim.com", "icloud.com",
  "me.com", "mac.com", "protonmail.com", "protonmail.ch", "proton.me",
  "pm.me", "zoho.com", "zohomail.com", "gmx.com", "gmx.de", "gmx.net",
  "web.de", "mail.com", "mail.ru", "inbox.ru", "bk.ru", "list.ru",
  "yandex.com", "yandex.ru", "ya.ru", "qq.com", "163.com", "126.com",
  "sina.com", "naver.com", "daum.net", "hanmail.net", "rediffmail.com",
  "comcast.net", "verizon.net", "att.net", "sbcglobal.net", "bellsouth.net",
  "cox.net", "charter.net", "btinternet.com", "sky.com", "orange.fr",
  "free.fr", "laposte.net", "libero.it", "virgilio.it", "t-online.de",
  "seznam.cz", "wp.pl", "o2.pl", "interia.pl", "abv.bg", "bol.com.br",
  "uol.com.br", "terra.com.br", "hotmail.com.br", "live.com.au",
  "optusnet.com.au", "bigpond.com", "shaw.ca", "rogers.com", "telus.net",
]);

/** Throwaway inbox services — mail sent here is read once and discarded. */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "tempmail.com", "temp-mail.org", "temp-mail.io",
  "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
  "sharklasers.com", "grr.la", "spam4.me", "10minutemail.com",
  "10minutemail.net", "20minutemail.com", "throwawaymail.com",
  "yopmail.com", "yopmail.fr", "yopmail.net", "trashmail.com",
  "trashmail.net", "trash-mail.com", "getnada.com", "nada.email",
  "dispostable.com", "fakeinbox.com", "mailnesia.com", "mytemp.email",
  "maildrop.cc", "mohmal.com", "tempinbox.com", "emailondeck.com",
  "burnermail.io", "anonaddy.me", "mailsac.com", "inboxkitten.com",
  "moakt.com", "tmail.ws", "luxusmail.org", "spambog.com", "spamgourmet.com",
  "jetable.org", "mailcatch.com", "tempr.email", "discard.email",
  "mail-temporaire.fr", "einrot.com", "gustr.com", "rhyta.com",
  "superrito.com", "teleworm.us", "cuvox.de", "dayrep.com", "armyspy.com",
  "fleckens.hu", "jourrapide.com", "0-mail.com", "33mail.com",
]);

/** Suffixes that mark a whole family of throwaway hosts. */
const DISPOSABLE_SUFFIXES = [
  ".mailinator.com", ".temp-mail.org", ".guerrillamail.com", ".yopmail.com",
  ".33mail.com", ".anonaddy.com", ".duck.com",
];

/** Shared inboxes — real, but nobody's personal address. */
const ROLE_LOCAL_PARTS = new Set([
  "admin", "administrator", "support", "info", "information", "sales",
  "contact", "contacts", "hello", "hi", "help", "helpdesk", "service",
  "services", "team", "office", "mail", "email", "enquiry", "enquiries",
  "inquiry", "inquiries", "marketing", "press", "media", "pr", "careers",
  "career", "jobs", "recruitment", "hr", "billing", "accounts", "accounting",
  "finance", "invoice", "invoices", "legal", "privacy", "security", "abuse",
  "webmaster", "hostmaster", "postmaster", "noreply", "no-reply", "donotreply",
  "newsletter", "subscribe", "unsubscribe", "feedback", "orders", "order",
  "shop", "store", "booking", "bookings", "reservations", "partners",
  "partnership", "business", "general", "root", "sysadmin", "noc", "ops",
  "dev", "developers", "devops", "it", "tech", "customerservice",
  "customercare", "reception", "welcome", "ask", "mailbox",
]);

export interface ProviderInfo {
  webmail: boolean;
  disposable: boolean;
  role: boolean;
  professional: boolean;
}

export function inspectProvider(localPart: string, domain: string): ProviderInfo {
  const d = domain.toLowerCase();
  const webmail = WEBMAIL_DOMAINS.has(d);
  const disposable =
    DISPOSABLE_DOMAINS.has(d) || DISPOSABLE_SUFFIXES.some((suffix) => d.endsWith(suffix));

  // Strip +tags, then treat "sales-uk" / "info.de" as the same role inbox.
  // The token rule is capped at two parts on purpose: without it a long
  // personal local part ("no-such-mailbox-zzq91") matches on one stray token.
  const base = localPart.toLowerCase().replace(/\+.*$/, "");
  const tokens = base.split(/[._-]/).filter(Boolean);
  const role =
    ROLE_LOCAL_PARTS.has(base) ||
    (tokens.length <= 2 && tokens.some((t) => ROLE_LOCAL_PARTS.has(t)));

  return { webmail, disposable, role, professional: !webmail && !disposable };
}

export function isWebmail(domain: string): boolean {
  return WEBMAIL_DOMAINS.has(domain.toLowerCase());
}
