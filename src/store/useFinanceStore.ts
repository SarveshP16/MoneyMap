import { create } from 'zustand';
import { fetchState, pushState } from '../lib/api';
import { generateLocalId } from '../lib/id';
import { loadCollection, loadValue } from '../lib/storage';
import { useToastStore } from './useToastStore';
import {
  EMPTY_FILTER,
  type TransactionFilter,
} from '../lib/transactionFiltering';
import type {
  Category,
  CurrencyCode,
  IncomeRecord,
  Investment,
  PaymentMethod,
  SavingsGoal,
  Subscription,
  Transaction,
} from '../lib/types';

export type SyncStatus = 'loading' | 'ready' | 'error';

interface FinanceState {
  status: SyncStatus;

  transactions: Transaction[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  savingsGoals: SavingsGoal[];
  investments: Investment[];
  subscriptions: Subscription[];
  incomeRecords: IncomeRecord[];
  currency: CurrencyCode;
  filter: TransactionFilter;

  /** Loads from the server once at startup. If the server has never been
   *  written to (a brand-new container/volume) and this browser still has
   *  data from MoneyMap's old localStorage-only days, that data is
   *  uploaded as the starting state instead of being silently orphaned. */
  init: () => Promise<void>;
  /** Re-fetches from the server and overwrites local collections — what
   *  the sync-polling hook calls so a change made on another device
   *  actually shows up here. */
  refreshFromServer: () => Promise<void>;

  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
  restoreTransaction: (t: Transaction) => void;

  addCategory: (c: Omit<Category, 'id' | 'createdAt'>) => void;
  updateCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;
  restoreCategory: (c: Category) => void;

  addPaymentMethod: (m: Omit<PaymentMethod, 'id' | 'createdAt'>) => void;
  deletePaymentMethod: (id: string) => void;
  restorePaymentMethod: (m: PaymentMethod) => void;

  addSavingsGoal: (g: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
  updateSavingsGoal: (g: SavingsGoal) => void;
  deleteSavingsGoal: (id: string) => void;
  restoreSavingsGoal: (g: SavingsGoal) => void;

  addInvestment: (i: Omit<Investment, 'id' | 'createdAt'>) => void;
  updateInvestment: (i: Investment) => void;
  deleteInvestment: (id: string) => void;
  restoreInvestment: (i: Investment) => void;

  addSubscription: (s: Omit<Subscription, 'id' | 'createdAt'>) => void;
  updateSubscription: (s: Subscription) => void;
  deleteSubscription: (id: string) => void;
  restoreSubscription: (s: Subscription) => void;

  addIncomeRecord: (r: Omit<IncomeRecord, 'id' | 'createdAt'>) => void;
  updateIncomeRecord: (r: IncomeRecord) => void;
  deleteIncomeRecord: (id: string) => void;
  restoreIncomeRecord: (r: IncomeRecord) => void;

  setCurrency: (c: CurrencyCode) => void;
  applyFilter: (f: TransactionFilter) => void;
  clearFilter: () => void;

  /** Replaces every collection wholesale — the backend for Settings'
   *  "Import data". Omitted collections are left untouched rather than
   *  cleared, so a backup file missing a newer field/collection can still
   *  be restored without wiping everything else. */
  restoreAll: (data: Partial<FinanceBackupData>) => void;
}

export interface FinanceBackupData {
  transactions: Transaction[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  savingsGoals: SavingsGoal[];
  investments: Investment[];
  subscriptions: Subscription[];
  incomeRecords: IncomeRecord[];
  currency: CurrencyCode;
}

const LEGACY_LOCALSTORAGE_KEYS = {
  transactions: 'transactions',
  categories: 'categories',
  paymentMethods: 'payment_methods',
  savingsGoals: 'savings_goals',
  investments: 'investments',
  subscriptions: 'subscriptions',
  incomeRecords: 'income',
} as const;

function readLegacyLocalStorage(): FinanceBackupData {
  return {
    transactions: loadCollection<Transaction>(LEGACY_LOCALSTORAGE_KEYS.transactions),
    categories: loadCollection<Category>(LEGACY_LOCALSTORAGE_KEYS.categories),
    paymentMethods: loadCollection<PaymentMethod>(LEGACY_LOCALSTORAGE_KEYS.paymentMethods),
    savingsGoals: loadCollection<SavingsGoal>(LEGACY_LOCALSTORAGE_KEYS.savingsGoals),
    investments: loadCollection<Investment>(LEGACY_LOCALSTORAGE_KEYS.investments),
    subscriptions: loadCollection<Subscription>(LEGACY_LOCALSTORAGE_KEYS.subscriptions),
    incomeRecords: loadCollection<IncomeRecord>(LEGACY_LOCALSTORAGE_KEYS.incomeRecords),
    currency: loadValue<CurrencyCode>('currency', 'usd'),
  };
}

function isEmptyBackup(data: FinanceBackupData): boolean {
  return (
    data.transactions.length === 0 &&
    data.categories.length === 0 &&
    data.paymentMethods.length === 0 &&
    data.savingsGoals.length === 0 &&
    data.investments.length === 0 &&
    data.subscriptions.length === 0 &&
    data.incomeRecords.length === 0
  );
}

/** Pushes the full current state to the server after a local mutation —
 *  optimistic: the UI already reflects the change, this just fires the
 *  sync in the background and surfaces a toast if it fails, rather than
 *  blocking every click on a network round trip. */
function syncToServer(get: () => FinanceState) {
  const s = get();
  pushState({
    transactions: s.transactions,
    categories: s.categories,
    paymentMethods: s.paymentMethods,
    savingsGoals: s.savingsGoals,
    investments: s.investments,
    subscriptions: s.subscriptions,
    incomeRecords: s.incomeRecords,
    currency: s.currency,
  }).catch((err: unknown) => {
    console.error('Failed to sync to server', err);
    useToastStore.getState().show("Couldn't sync that change — check the connection");
  });
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  status: 'loading',

  transactions: [],
  categories: [],
  paymentMethods: [],
  savingsGoals: [],
  investments: [],
  subscriptions: [],
  incomeRecords: [],
  currency: 'usd',
  filter: EMPTY_FILTER,

  init: async () => {
    try {
      const server = await fetchState();
      if (server.updatedAt === null) {
        // Server has never been written to — this is a fresh container/
        // volume. If this browser still has data from before the sync
        // backend existed, adopt it as the starting state instead of
        // just showing an empty app.
        const legacy = readLegacyLocalStorage();
        if (!isEmptyBackup(legacy)) {
          const saved = await pushState(legacy);
          set({ ...saved, status: 'ready' });
          return;
        }
      }
      set({ ...server, status: 'ready' });
    } catch (err) {
      console.error('Failed to load from server', err);
      set({ status: 'error' });
    }
  },

  refreshFromServer: async () => {
    if (get().status !== 'ready') return;
    try {
      const server = await fetchState();
      set({
        transactions: server.transactions,
        categories: server.categories,
        paymentMethods: server.paymentMethods,
        savingsGoals: server.savingsGoals,
        investments: server.investments,
        subscriptions: server.subscriptions,
        incomeRecords: server.incomeRecords,
        currency: server.currency,
      });
    } catch (err) {
      // A transient network blip shouldn't disrupt an already-working
      // session — just try again on the next poll.
      console.error('Background refresh failed', err);
    }
  },

  addTransaction: (t) => {
    const record: Transaction = { ...t, id: generateLocalId(), createdAt: new Date().toISOString() };
    set({ transactions: [...get().transactions, record] });
    syncToServer(get);
  },
  updateTransaction: (t) => {
    set({ transactions: get().transactions.map((x) => (x.id === t.id ? t : x)) });
    syncToServer(get);
  },
  deleteTransaction: (id) => {
    set({ transactions: get().transactions.filter((x) => x.id !== id) });
    syncToServer(get);
  },
  restoreTransaction: (t) => {
    set({ transactions: [...get().transactions, t] });
    syncToServer(get);
  },

  addCategory: (c) => {
    const record: Category = { ...c, id: generateLocalId(), createdAt: new Date().toISOString() };
    set({ categories: [...get().categories, record] });
    syncToServer(get);
  },
  updateCategory: (c) => {
    set({ categories: get().categories.map((x) => (x.id === c.id ? c : x)) });
    syncToServer(get);
  },
  deleteCategory: (id) => {
    set({ categories: get().categories.filter((x) => x.id !== id) });
    syncToServer(get);
  },
  restoreCategory: (c) => {
    set({ categories: [...get().categories, c] });
    syncToServer(get);
  },

  addPaymentMethod: (m) => {
    const record: PaymentMethod = { ...m, id: generateLocalId(), createdAt: new Date().toISOString() };
    set({ paymentMethods: [...get().paymentMethods, record] });
    syncToServer(get);
  },
  deletePaymentMethod: (id) => {
    set({ paymentMethods: get().paymentMethods.filter((x) => x.id !== id) });
    syncToServer(get);
  },
  restorePaymentMethod: (m) => {
    set({ paymentMethods: [...get().paymentMethods, m] });
    syncToServer(get);
  },

  addSavingsGoal: (g) => {
    const record: SavingsGoal = { ...g, id: generateLocalId(), createdAt: new Date().toISOString() };
    set({ savingsGoals: [...get().savingsGoals, record] });
    syncToServer(get);
  },
  updateSavingsGoal: (g) => {
    set({ savingsGoals: get().savingsGoals.map((x) => (x.id === g.id ? g : x)) });
    syncToServer(get);
  },
  deleteSavingsGoal: (id) => {
    set({ savingsGoals: get().savingsGoals.filter((x) => x.id !== id) });
    syncToServer(get);
  },
  restoreSavingsGoal: (g) => {
    set({ savingsGoals: [...get().savingsGoals, g] });
    syncToServer(get);
  },

  addInvestment: (i) => {
    const record: Investment = { ...i, id: generateLocalId(), createdAt: new Date().toISOString() };
    set({ investments: [...get().investments, record] });
    syncToServer(get);
  },
  updateInvestment: (i) => {
    set({ investments: get().investments.map((x) => (x.id === i.id ? i : x)) });
    syncToServer(get);
  },
  deleteInvestment: (id) => {
    set({ investments: get().investments.filter((x) => x.id !== id) });
    syncToServer(get);
  },
  restoreInvestment: (i) => {
    set({ investments: [...get().investments, i] });
    syncToServer(get);
  },

  addSubscription: (s) => {
    const record: Subscription = { ...s, id: generateLocalId(), createdAt: new Date().toISOString() };
    set({ subscriptions: [...get().subscriptions, record] });
    syncToServer(get);
  },
  updateSubscription: (s) => {
    set({ subscriptions: get().subscriptions.map((x) => (x.id === s.id ? s : x)) });
    syncToServer(get);
  },
  deleteSubscription: (id) => {
    set({ subscriptions: get().subscriptions.filter((x) => x.id !== id) });
    syncToServer(get);
  },
  restoreSubscription: (s) => {
    set({ subscriptions: [...get().subscriptions, s] });
    syncToServer(get);
  },

  addIncomeRecord: (r) => {
    const record: IncomeRecord = { ...r, id: generateLocalId(), createdAt: new Date().toISOString() };
    set({ incomeRecords: [...get().incomeRecords, record] });
    syncToServer(get);
  },
  updateIncomeRecord: (r) => {
    set({ incomeRecords: get().incomeRecords.map((x) => (x.id === r.id ? r : x)) });
    syncToServer(get);
  },
  deleteIncomeRecord: (id) => {
    set({ incomeRecords: get().incomeRecords.filter((x) => x.id !== id) });
    syncToServer(get);
  },
  restoreIncomeRecord: (r) => {
    set({ incomeRecords: [...get().incomeRecords, r] });
    syncToServer(get);
  },

  setCurrency: (c) => {
    set({ currency: c });
    syncToServer(get);
  },
  applyFilter: (f) => set({ filter: f }),
  clearFilter: () => set({ filter: EMPTY_FILTER }),

  restoreAll: (data) => {
    const updates: Partial<FinanceState> = {};
    if (data.transactions) updates.transactions = data.transactions;
    if (data.categories) updates.categories = data.categories;
    if (data.paymentMethods) updates.paymentMethods = data.paymentMethods;
    if (data.savingsGoals) updates.savingsGoals = data.savingsGoals;
    if (data.investments) updates.investments = data.investments;
    if (data.subscriptions) updates.subscriptions = data.subscriptions;
    if (data.incomeRecords) updates.incomeRecords = data.incomeRecords;
    if (data.currency) updates.currency = data.currency;
    set(updates);
    syncToServer(get);
  },
}));
