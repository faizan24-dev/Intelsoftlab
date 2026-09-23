// Types for the Web Email Finder tool.

/** What the address is for — drives the "Type" column in the results table. */
export type EmailKind = "personal" | "role" | "generic";

export type Confidence = "high" | "medium" | "low";

export interface FoundEmail {
  email: string;
  /** Page URLs the address was found on, most relevant first. */
  sources: string[];
  kind: EmailKind;
  confidence: Confidence;
  /** 0–100 — the raw score behind `confidence`, shown as a tooltip. */
  score: number;
  /** Came from a `mailto:` link rather than page text. */
  viaMailto: boolean;
  /** The address is on the site's own domain (not gmail.com, etc.). */
  onSiteDomain: boolean;
}

export interface EmailFindResult {
  /** The normalized URL that was crawled. */
  url: string;
  domain: string;
  emails: FoundEmail[];
  pagesScanned: string[];
  elapsed: number;
  status: "success" | "fail";
  /** Set when `status` is "fail", or as a warning alongside partial results. */
  error?: string;
}

export interface EmailFindResponse {
  mode: "single" | "bulk";
  results: EmailFindResult[];
}
