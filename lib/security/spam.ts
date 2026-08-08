/**
 * Spam classification for public form submissions (contact form, and any
 * future public form that emails the team).
 *
 * Three outcomes:
 *  - "clean"      -> store + notify admin by email
 *  - "quarantine" -> store only, no email (visible in admin inbox)
 *  - "spam"       -> drop silently (bot gets a 200 so it stops retrying)
 */

export type SpamVerdict = "clean" | "quarantine" | "spam";

export type SpamFields = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message: string;
  preferredStore?: string;
};

export type SpamResult = {
  verdict: SpamVerdict;
  reasons: string[];
};

const URL_PATTERN = /https?:\/\/\S+|www\.\S+\.\S+|\b[a-z0-9][a-z0-9-]*\.[a-z]{2,}\/\S+/i;

const SPAM_KEYWORDS = [
  "casino", "slot", "poker", "betting", "gambling", "crypto", "bitcoin",
  "earn money", "make money", "click here", "free money", "win cash",
  "spin", "jackpot", "reel", "psee.io", "bit.ly", "tinyurl",
  // crypto/phishing "transfer" scams (graph.org and similar redirect chains)
  "transfer to you", "sign in >>>", "sign in <<<", "graph.org", "balance-",
  // backlink / SEO outreach spam
  "backlink", "guest post", "link exchange", "domain rating", "dr30",
  "seo boost", "5 quality local business", "5 local business websites",
  // crypto payout / wallet drainer wave (Aug 2026)
  "usdt", "usdc", "ethereum", "binance", "metamask", "wallet", "airdrop",
  "withdraw", "payout", "you have received", "claim your", "seed phrase",
];

/** Any emoji or pictographic symbol. Real names / subjects never contain these. */
const EMOJI_PATTERN =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{20E3}]/u;

/** "439252 USD", "USD 439252", "570360 USDT", "656064 Dollars" */
const CURRENCY_AMOUNT_PATTERN =
  /(\d[\d\s.,]{2,}\s*(usd|usdt|usdc|eur|btc|eth|dollars?|euros?)|\b(usd|usdt|usdc|eur|btc|eth|dollars?)\s*\d[\d\s.,]{2,})/i;

/** ">>>", "<<<", "->>", "=>>" — arrow bait used to push the victim to a link. */
const ARROW_BAIT_PATTERN = /(->{2,}|=>{2,}|>{3,}|<{3,})/;

/** Scripts we never expect from Serbian/EN customers: CJK, Arabic, Hebrew, Thai, Devanagari. */
const FOREIGN_SCRIPT_PATTERN =
  /[֐-׿؀-ۿऀ-ॿ฀-๿぀-ヿ一-鿿가-힯]/;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@,;]+\.[a-z]{2,}$/i;

const digitCount = (value: string) => (value.match(/\d/g) || []).length;

export function classifySubmission(fields: SpamFields): SpamResult {
  const name = fields.name || "";
  const email = fields.email || "";
  const subject = fields.subject || "";
  const message = fields.message || "";
  const identity = [name, email, subject].join(" ");
  const all = [
    name, email, fields.phone || "", fields.company || "",
    subject, message, fields.preferredStore || "",
  ].join(" ");
  const lower = all.toLowerCase();

  const reasons: string[] = [];

  if (URL_PATTERN.test(all)) reasons.push("url");
  const keyword = SPAM_KEYWORDS.find((kw) => lower.includes(kw));
  if (keyword) reasons.push(`keyword:${keyword}`);
  if (EMOJI_PATTERN.test(identity)) reasons.push("emoji-in-identity");
  if (CURRENCY_AMOUNT_PATTERN.test(all)) reasons.push("currency-amount");
  if (ARROW_BAIT_PATTERN.test(all)) reasons.push("arrow-bait");
  if (FOREIGN_SCRIPT_PATTERN.test(all)) reasons.push("foreign-script");
  if (digitCount(name) >= 4) reasons.push("digits-in-name");
  if (!EMAIL_PATTERN.test(email)) reasons.push("malformed-email");

  if (reasons.length > 0) return { verdict: "spam", reasons };

  // Milder signals: keep the message but do not wake anyone up over it.
  const soft: string[] = [];
  const letters = message.replace(/[^a-zA-ZčćžšđČĆŽŠĐ]/g, "");
  if (letters.length >= 12 && letters === letters.toUpperCase()) soft.push("all-caps");
  if (message.trim().length < 10) soft.push("too-short");
  if (message.trim().toLowerCase() === name.trim().toLowerCase()) soft.push("message-equals-name");

  if (soft.length > 0) return { verdict: "quarantine", reasons: soft };

  return { verdict: "clean", reasons: [] };
}
