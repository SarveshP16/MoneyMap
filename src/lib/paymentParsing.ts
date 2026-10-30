// Turns the raw wallet/bank notifications queued by the Android app's
// PaymentNotificationListener into payments to review: amount, merchant and
// the card used. Pure functions only, so it runs (and can be tested) off
// the device. Every notification app words these differently, so each
// pattern is deliberately loose; the review step is what catches a bad
// guess.

/** One notification as the native listener stored it. */
export interface RawCapture {
  id: string;
  packageName: string;
  appName: string;
  title: string;
  text: string;
  /** Epoch milliseconds. */
  postedAt: number;
}

/** A payment waiting for review — possibly several notifications (Google
 *  Wallet's receipt plus the bank's alert) describing the same tap. */
export interface PendingPayment {
  ids: string[];
  amount: number;
  merchant?: string;
  cardLast4?: string;
  postedAt: number;
  packageName: string;
  appName: string;
}

const WALLET_APPS = new Set(['com.google.android.apps.walletnfcrel', 'com.samsung.android.spay']);

/** A currency marker then an amount: "$12.50", "A$1,234", "AUD 12.50". */
const AMOUNT = /(?:\b[A-Z]{1,3}\$|\$|£|€|₹|¥|\b(?:AUD|USD|NZD|GBP|EUR|INR|CAD)\s?)\s?(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+(?:\.\d{2})?)/;
/** Money coming in, or a payment that didn't go through. */
const NOT_A_PURCHASE =
  /\b(declined|unsuccessful|failed|refund(?:ed)?|received|deposit(?:ed)?|credited|incoming|sent you|paid you|balance (?:is|of)|low balance|top.?up|reversal)\b/i;
/** "Visa ••1234", "card ending in 1234", "card 1234", "xx1234". */
const CARD = /(?:[•·*●]{2,}\s?|\bx{2,}|ending(?: in)?\s+|\bcard\s+)(\d{4})\b/i;
/** "... at WOOLWORTHS 1234 SYDNEY on 12 Mar" or "... to Jane Citizen." */
const AT_MERCHANT = /\b(?:at|to)\s+(.+?)(?=\s+(?:on|using|with|via|from|for)\b|\s+-\s|[.!](?:\s|$)|$)/i;
/** Titles that name the alert, not the shop. */
const GENERIC_TITLE = /payment|purchase|transaction|spen[dt]|card|alert|notification|account|netbank|you paid|wallet/i;
const LOCATION_SUFFIX = /^(?:AU|AUS|NSW|VIC|QLD|SA|WA|TAS|NT|ACT|NZ|US|GB)$/i;

/** Notifications for the same tap from two apps land within this window. */
const SAME_PAYMENT_WINDOW_MS = 5 * 60 * 1000;

export function parseCapture(raw: RawCapture): PendingPayment | null {
  const combined = `${raw.title}\n${raw.text}`;
  if (NOT_A_PURCHASE.test(combined)) return null;

  const amountMatch = AMOUNT.exec(raw.text) ?? AMOUNT.exec(raw.title);
  if (!amountMatch) return null;
  const amount = Number.parseFloat(amountMatch[1].replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return {
    ids: [raw.id],
    amount,
    merchant: findMerchant(raw),
    cardLast4: CARD.exec(combined)?.[1],
    postedAt: raw.postedAt,
    packageName: raw.packageName,
    appName: raw.appName,
  };
}

function findMerchant(raw: RawCapture): string | undefined {
  const fromText = AT_MERCHANT.exec(raw.text)?.[1] ?? AT_MERCHANT.exec(raw.title)?.[1];
  if (fromText) {
    const tidy = tidyMerchant(fromText);
    if (tidy) return tidy;
  }
  // Google Wallet titles its receipt with the shop's name.
  const title = raw.title.trim();
  if (title && !AMOUNT.test(title) && !GENERIC_TITLE.test(title) && title !== raw.appName) {
    return tidyMerchant(title);
  }
  return undefined;
}

/** "WOOLWORTHS 1234 SYDNEY AU" -> "Woolworths Sydney". */
export function tidyMerchant(raw: string): string | undefined {
  const words = raw.replace(/\s+/g, ' ').trim().replace(/[.,;:]+$/, '').split(' ');
  const kept = words.filter((w) => !/^[\d#*-]+$/.test(w));
  while (kept.length > 1 && LOCATION_SUFFIX.test(kept[kept.length - 1])) kept.pop();
  let name = kept.join(' ').slice(0, 60).trim();
  if (!name) return undefined;
  if (name === name.toUpperCase()) {
    name = name.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  }
  return name;
}

/** Parses every capture and folds the wallet receipt and bank alert for
 *  one tap into a single payment. `skipped` are the captures that turned
 *  out not to be purchases, for the caller to clear from the queue. */
export function groupCaptures(captures: RawCapture[]): { payments: PendingPayment[]; skipped: string[] } {
  const payments: PendingPayment[] = [];
  const skipped: string[] = [];
  for (const raw of [...captures].sort((a, b) => a.postedAt - b.postedAt)) {
    const parsed = parseCapture(raw);
    if (!parsed) {
      skipped.push(raw.id);
      continue;
    }
    const twin = payments.find(
      (p) =>
        p.packageName !== parsed.packageName &&
        Math.round(p.amount * 100) === Math.round(parsed.amount * 100) &&
        Math.abs(p.postedAt - parsed.postedAt) <= SAME_PAYMENT_WINDOW_MS,
    );
    if (!twin) {
      payments.push(parsed);
      continue;
    }
    twin.ids.push(...parsed.ids);
    twin.cardLast4 ??= parsed.cardLast4;
    if (parsed.merchant && (!twin.merchant || WALLET_APPS.has(parsed.packageName))) {
      twin.merchant = parsed.merchant;
    }
  }
  return { payments: payments.reverse(), skipped };
}

/** What a merchant's category is remembered under, most specific first:
 *  its first two words, then its first word alone, so the wallet's
 *  "Woolworths" and the bank's "Woolworths Sydney" find each other. */
export function merchantKeys(merchant: string): string[] {
  const words = merchant
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return [];
  return words.length > 1 ? [words.slice(0, 2).join(' '), words[0]] : [words[0]];
}

/** Choices remembered from earlier reviews: merchant key -> category id,
 *  and "card:1234" / "app:<package>" -> payment method id. */
export interface CaptureRules {
  categories: Record<string, string>;
  paymentMethods: Record<string, string>;
}

export const EMPTY_RULES: CaptureRules = { categories: {}, paymentMethods: {} };

export function suggestFor(
  payment: PendingPayment,
  rules: CaptureRules,
  categoryIds: string[],
  paymentMethods: { id: string; name: string }[],
): { categoryId: string; paymentMethodId: string } {
  const keys = payment.merchant ? merchantKeys(payment.merchant) : [];
  const categoryId = keys.map((k) => rules.categories[k]).find((id) => id && categoryIds.includes(id)) ?? '';

  const exists = (id?: string) => (id && paymentMethods.some((m) => m.id === id) ? id : undefined);
  const last4 = payment.cardLast4;
  const paymentMethodId =
    (last4 && exists(rules.paymentMethods[`card:${last4}`])) ||
    (last4 && paymentMethods.find((m) => m.name.includes(last4))?.id) ||
    exists(rules.paymentMethods[`app:${payment.packageName}`]) ||
    '';

  return { categoryId, paymentMethodId };
}

export function rememberChoice(
  rules: CaptureRules,
  payment: PendingPayment,
  categoryId: string,
  paymentMethodId: string,
): CaptureRules {
  const categories = { ...rules.categories };
  const paymentMethods = { ...rules.paymentMethods };
  for (const key of payment.merchant ? merchantKeys(payment.merchant) : []) {
    if (categoryId) categories[key] = categoryId;
    else delete categories[key];
  }
  if (paymentMethodId) {
    if (payment.cardLast4) paymentMethods[`card:${payment.cardLast4}`] = paymentMethodId;
    paymentMethods[`app:${payment.packageName}`] = paymentMethodId;
  }
  return { categories, paymentMethods };
}
