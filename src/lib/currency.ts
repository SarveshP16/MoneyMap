import { CURRENCIES, type CurrencyCode, type CurrencyInfo } from './types';

/** Formats `amount` under `currency` — ported from finance_format.dart's
 *  NumberFormat.currency(locale, symbol, decimalDigits): grouping/decimals
 *  come from the currency's locale, the symbol is the curated one in
 *  CURRENCIES, not whatever Intl would infer from the locale. */
export function formatCurrency(amount: number, currency: CurrencyInfo): string {
  const negative = amount < 0;
  const body = new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: currency.decimalDigits,
    maximumFractionDigits: currency.decimalDigits,
  }).format(Math.abs(amount));
  return `${negative ? '-' : ''}${currency.symbol}${body}`;
}

export function currencyOf(code: CurrencyCode): CurrencyInfo {
  return CURRENCIES[code];
}
