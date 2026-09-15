// Domain types — ported 1:1 from Pulse's lib/features/finance/domain/*.dart.
// Dates are stored as ISO strings (matching Dart's toIso8601String()) so
// records round-trip through localStorage/JSON exactly like the original
// SharedPreferences-backed repositories.

export type BudgetPeriod = 'weekly' | 'fortnightly' | 'monthly';

export const BUDGET_PERIODS: BudgetPeriod[] = ['weekly', 'fortnightly', 'monthly'];

export const budgetPeriodLabel: Record<BudgetPeriod, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
};

export type BillingCycle = 'weekly' | 'fortnightly' | 'monthly' | 'yearly';

export const BILLING_CYCLES: BillingCycle[] = ['weekly', 'fortnightly', 'monthly', 'yearly'];

export const billingCycleLabel: Record<BillingCycle, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

/** Multiplier to convert an amount at this cycle into its monthly equivalent. */
export const billingCycleMonthlyFactor: Record<BillingCycle, number> = {
  weekly: 52 / 12,
  fortnightly: 26 / 12,
  monthly: 1,
  yearly: 1 / 12,
};

export type IncomeType = 'tfn' | 'abn';

export const incomeTypeLabel: Record<IncomeType, string> = { tfn: 'TFN', abn: 'ABN' };

export type SubscriptionKind = 'subscription' | 'bill';

export const subscriptionKindLabel: Record<SubscriptionKind, string> = {
  subscription: 'Subscription',
  bill: 'Bill',
};

export type CurrencyCode =
  | 'usd' | 'eur' | 'gbp' | 'jpy' | 'inr' | 'aud' | 'cad' | 'cny' | 'chf' | 'krw';

export interface CurrencyInfo {
  code: CurrencyCode;
  isoCode: string;
  displayName: string;
  symbol: string;
  locale: string;
  decimalDigits: number;
  isAustralian: boolean;
}

// Same curated symbols as Currency.symbol in currency.dart — deliberately
// not the "bare" glyph for a few (A$, CN¥, CHF ) so no two currencies here
// render identically.
export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  usd: { code: 'usd', isoCode: 'USD', displayName: 'US Dollar', symbol: '$', locale: 'en-US', decimalDigits: 2, isAustralian: false },
  eur: { code: 'eur', isoCode: 'EUR', displayName: 'Euro', symbol: '€', locale: 'en-US', decimalDigits: 2, isAustralian: false },
  gbp: { code: 'gbp', isoCode: 'GBP', displayName: 'British Pound', symbol: '£', locale: 'en-US', decimalDigits: 2, isAustralian: false },
  jpy: { code: 'jpy', isoCode: 'JPY', displayName: 'Japanese Yen', symbol: '¥', locale: 'ja-JP', decimalDigits: 0, isAustralian: false },
  inr: { code: 'inr', isoCode: 'INR', displayName: 'Indian Rupee', symbol: '₹', locale: 'en-IN', decimalDigits: 2, isAustralian: false },
  aud: { code: 'aud', isoCode: 'AUD', displayName: 'Australian Dollar', symbol: 'A$', locale: 'en-US', decimalDigits: 2, isAustralian: true },
  cad: { code: 'cad', isoCode: 'CAD', displayName: 'Canadian Dollar', symbol: 'C$', locale: 'en-US', decimalDigits: 2, isAustralian: false },
  cny: { code: 'cny', isoCode: 'CNY', displayName: 'Chinese Yuan', symbol: 'CN¥', locale: 'en-US', decimalDigits: 2, isAustralian: false },
  chf: { code: 'chf', isoCode: 'CHF', displayName: 'Swiss Franc', symbol: 'CHF ', locale: 'en-US', decimalDigits: 2, isAustralian: false },
  krw: { code: 'krw', isoCode: 'KRW', displayName: 'South Korean Won', symbol: '₩', locale: 'ko-KR', decimalDigits: 0, isAustralian: false },
};

export interface Transaction {
  id: string;
  name?: string;
  date: string;
  amount: number;
  categoryId?: string;
  paymentMethodId?: string;
  splitAmount?: number;
  splitPaidBack: boolean;
  splitOwedByName?: string;
  note?: string;
  movedToCreditCard: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  budgetAmount?: number;
  period: BudgetPeriod;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  isCreditCard: boolean;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  startDate?: string;
  targetDate?: string;
  bankAccount?: string;
  createdAt: string;
}

export interface Investment {
  id: string;
  name: string;
  type?: string;
  quantity?: number;
  purchasePrice?: number;
  currentValue: number;
  purchaseDate?: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingCycle: BillingCycle;
  kind: SubscriptionKind;
  startDate?: string;
  endDate?: string;
  /** The due date (ISO, date-only) of the most recent cycle logged as a
   *  transaction via "Log payment" — lets the Upcoming list tell an
   *  already-recorded due date apart from one still waiting on you,
   *  without needing to search transactions for a matching entry. */
  lastLoggedDate?: string;
  createdAt: string;
}

export interface IncomeRecord {
  id: string;
  sourceName: string;
  incomeType?: IncomeType;
  dateReceived: string;
  grossAmount: number;
  netAmount?: number;
  taxWithheld?: number;
  superAmount?: number;
  note?: string;
  createdAt: string;
}

/** A big-ticket purchase — laptops, furniture, appliances, anything worth
 *  tracking outside the everyday expense noise in Transactions. */
export interface Purchase {
  id: string;
  name: string;
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
}

export type CarExpenseCategory = 'rego' | 'service' | 'parts';

export const CAR_EXPENSE_CATEGORIES: CarExpenseCategory[] = ['rego', 'service', 'parts'];

export const carExpenseCategoryLabel: Record<CarExpenseCategory, string> = {
  rego: 'Rego',
  service: 'Service',
  parts: 'Parts',
};

export interface CarExpense {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: CarExpenseCategory;
  note?: string;
  createdAt: string;
}

/** monthlyAmount getter from Subscription — cost normalised to a monthly figure. */
export function subscriptionMonthlyAmount(s: Subscription): number {
  return s.amount * billingCycleMonthlyFactor[s.billingCycle];
}

/** gainLoss getter from Investment — only computable when both quantity and
 *  purchasePrice were recorded. */
export function investmentGainLoss(inv: Investment): number | null {
  if (inv.quantity == null || inv.purchasePrice == null) return null;
  return inv.currentValue - inv.quantity * inv.purchasePrice;
}
