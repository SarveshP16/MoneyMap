import { create } from 'zustand';
import { fetchState, pushState, type ServerState } from '../lib/api';
import { generateLocalId } from '../lib/id';
import { loadCollection, loadValue, saveValue } from '../lib/storage';
import { useToastStore } from './useToastStore';
import {
  EMPTY_FILTER,
  type TransactionFilter,
} from '../lib/transactionFiltering';
import type {
  CarExpense,
  Category,
  CurrencyCode,
  IncomeRecord,
  Investment,
  PaymentMethod,
  Purchase,
  SavingsGoal,
  Subscription,
  Transaction,
} from '../lib/types';

export type SyncStatus = 'loading' | 'ready' | 'error';

interface FinanceState {
  status: SyncStatus;
  /** Whether the last request to the server (a poll, a push, the initial
   *  load) actually succeeded — the ground truth the UI's offline indicator
   *  follows, rather than the browser's own online/offline signal, since
   *  that reflects the network interface, not whether this specific server
   *  is actually reachable over it. */
  isOnline: boolean;
  /** True when a mutation's push to the server failed and hasn't been
   *  retried successfully yet — the change is only saved locally until
   *  then. Blocks pulling from the server (that would silently discard it)
   *  until it's flushed. */
  pendingSync: boolean;

  transactions: Transaction[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  savingsGoals: SavingsGoal[];
  investments: Investment[];
  subscriptions: Subscription[];
  incomeRecords: IncomeRecord[];
  purchases: Purchase[];
  carExpenses: CarExpense[];
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
  /** Creates a transaction for one due cycle of `subscription` and marks
   *  that cycle logged, in one state update — the "Log payment" action on
   *  the Upcoming list. */
  logSubscriptionPayment: (subscription: Subscription, dueDateIso: string) => void;

  addIncomeRecord: (r: Omit<IncomeRecord, 'id' | 'createdAt'>) => void;
  updateIncomeRecord: (r: IncomeRecord) => void;
  deleteIncomeRecord: (id: string) => void;
  restoreIncomeRecord: (r: IncomeRecord) => void;

  addPurchase: (p: Omit<Purchase, 'id' | 'createdAt'>) => void;
  updatePurchase: (p: Purchase) => void;
  deletePurchase: (id: string) => void;
  restorePurchase: (p: Purchase) => void;

  addCarExpense: (c: Omit<CarExpense, 'id' | 'createdAt'>) => void;
  updateCarExpense: (c: CarExpense) => void;
  deleteCarExpense: (id: string) => void;
  restoreCarExpense: (c: CarExpense) => void;

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
  purchases: Purchase[];
  carExpenses: CarExpense[];
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
    // Purchases and car expenses didn't exist in MoneyMap's old
    // localStorage-only days — nothing to recover, they simply start empty.
    purchases: [],
    carExpenses: [],
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

const LAST_KNOWN_STATE_KEY = 'lastKnownServerState';
type SetState = (partial: Partial<FinanceState>) => void;

/** Pushes the full current state to the server after a local mutation —
 *  optimistic: the UI already reflects the change, this just fires the
 *  sync in the background. On failure the change stays only local
 *  (pendingSync flips on, so the offline indicator shows and the next poll
 *  or reconnect retries this same push instead of pulling and discarding
 *  it) rather than being lost. Also used directly to retry a previously
 *  failed push, which is why it checks whether pendingSync was already set
 *  before toasting — a mutation made while already known-offline shouldn't
 *  pop a new toast on top of the one still showing. */
function syncToServer(get: () => FinanceState, set: SetState) {
  const s = get();
  const wasAlreadyPending = s.pendingSync;
  pushState({
    transactions: s.transactions,
    categories: s.categories,
    paymentMethods: s.paymentMethods,
    savingsGoals: s.savingsGoals,
    investments: s.investments,
    subscriptions: s.subscriptions,
    incomeRecords: s.incomeRecords,
    purchases: s.purchases,
    carExpenses: s.carExpenses,
    currency: s.currency,
  })
    .then((saved) => {
      saveValue(LAST_KNOWN_STATE_KEY, saved);
      set({ pendingSync: false, isOnline: true });
    })
    .catch((err: unknown) => {
      console.error('Failed to sync to server', err);
      set({ pendingSync: true, isOnline: false });
      if (!wasAlreadyPending) {
        useToastStore.getState().show("You're offline — this'll sync once you're back online.");
      }
    });
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  status: 'loading',
  isOnline: true,
  pendingSync: false,

  transactions: [],
  categories: [],
  paymentMethods: [],
  savingsGoals: [],
  investments: [],
  subscriptions: [],
  incomeRecords: [],
  purchases: [],
  carExpenses: [],
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
          saveValue(LAST_KNOWN_STATE_KEY, saved);
          set({ ...saved, status: 'ready', isOnline: true, pendingSync: false });
          return;
        }
      }
      saveValue(LAST_KNOWN_STATE_KEY, server);
      set({ ...server, status: 'ready', isOnline: true, pendingSync: false });
    } catch (err) {
      console.error('Failed to load from server', err);
      // No connection on first load — fall back to whatever this browser
      // last saw from the server (saved after every successful load/sync)
      // so the app still opens with your real data instead of an error
      // screen, offline-first rather than offline-broken.
      const cached = loadValue<ServerState | null>(LAST_KNOWN_STATE_KEY, null);
      if (cached) {
        set({ ...cached, status: 'ready', isOnline: false, pendingSync: false });
      } else {
        set({ status: 'error' });
      }
    }
  },

  /** The poll-interval / regained-connectivity path: pulls whatever changed
   *  on another device — unless there's a local change still waiting to be
   *  pushed (pendingSync), in which case pulling would overwrite it with
   *  the server's older copy, so this retries the push instead. */
  refreshFromServer: async () => {
    if (get().status !== 'ready') return;
    if (get().pendingSync) {
      syncToServer(get, set);
      return;
    }
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
        purchases: server.purchases,
        carExpenses: server.carExpenses,
        currency: server.currency,
        isOnline: true,
      });
      saveValue(LAST_KNOWN_STATE_KEY, server);
    } catch (err) {
      // A transient network blip shouldn't disrupt an already-working
      // session — just try again on the next poll.
      console.error('Background refresh failed', err);
      set({ isOnline: false });
    }
  },

  addTransaction: (t) => {
    const record: Transaction = { ...t, id: generateLocalId(), createdAt: new Date().toISOString() };
    set({ transactions: [...get().transactions, record] });
    syncToServer(get, set);
  },
  updateTransaction: (t) => {
    set({ transactions: get().transactions.map((x) => (x.id === t.id ? t : x)) });
    syncToServer(get, set);
  },
  deleteTransaction: (id) => {
    set({ transactions: get().transactions.filter((x) => x.id !== id) });
    syncToServer(get, set);
  },
  restoreTransaction: (t) => {
    set({ transactions: [...get().transactions, t] });
    syncToServer(get, set);
  },

  addCategory: (c) => {
    const record: Category = { ...c, id: generateLocalId(), createdAt: new Date().toISOString() };
    set({ categories: [...get().categories, record] });
    syncToServer(get, set);
  },
  updateCategory: (c) => {
    set({ categories: get().categories.map((x) => (x.id === c.id ? c : x)) });
    syncToServer(get, set);
  },
  deleteCategory: (id) => {
    set({ categories: get().categories.filter((x) => x.id !== id) });
    syncToServer(get, set);
  },
  restoreCategory: (c) => {
    set({ categories: [...get().categories, c] });
    syncToServer(get, set);
  },

  addPaymentMethod: (m) => {
    const record: PaymentMethod = { ...m, id: generateLocalId(), createdAt: new Date().toISOString() };
    set({ paymentMethods: [...get().paymentMethods, record] });
    syncToServer(get, set);
  },
  deletePaymentMethod: (id) => {
    set({ paymentMethods: get().paymentMethods.filter((x) => x.id !== id) });
    syncToServer(get, set);
  },
  restorePaymentMethod: (m) => {
    set({ paymentMethods: [...get().paymentMethods, m] });
    syncToServer(get, set);
  },

  addSavingsGoal: (g) => {
    const record: SavingsGoal = { ...g, id: generateLocalId(), createdAt: new Date().toISOString() };
    set({ savingsGoals: [...get().savingsGoals, record] });
    syncToServer(get, set);
  },
  updateSavingsGoal: (g) => {
    set({ savingsGoals: get().savingsGoals.map((x) => (x.id === g.id ? g : x)) });
    syncToServer(get, set);
  },
  deleteSavingsGoal: (id) => {
    set({ savingsGoals: get().savingsGoals.filter((x) => x.id !== id) });
    syncToServer(get, set);
  },
  restoreSavingsGoal: (g) => {
    set({ savingsGoals: [...get().savingsGoals, g] });
    syncToServer(get, set);
  },

  addInvestment: (i) => {
    const record: Investment = { ...i, id: generateLocalId(), createdAt: new Date().toISOString() };
    set({ investments: [...get().investments, record] });
    syncToServer(get, set);
  },
  updateInvestment: (i) => {
    set({ investments: get().investments.map((x) => (x.id === i.id ? i : x)) });
    syncToServer(get, set);
  },
  deleteInvestment: (id) => {
    set({ investments: get().investments.filter((x) => x.id !== id) });
    syncToServer(get, set);
  },
  restoreInvestment: (i) => {
    set({ investments: [...get().investments, i] });
    syncToServer(get, set);
  },

  addSubscription: (s) => {
    const record: Subscription = { ...s, id: generateLocalId(), createdAt: new Date().toISOString() };
    set({ subscriptions: [...get().subscriptions, record] });
    syncToServer(get, set);
  },
  updateSubscription: (s) => {
    set({ subscriptions: get().subscriptions.map((x) => (x.id === s.id ? s : x)) });
    syncToServer(get, set);
  },
  deleteSubscription: (id) => {
    set({ subscriptions: get().subscriptions.filter((x) => x.id !== id) });
    syncToServer(get, set);
  },
  restoreSubscription: (s) => {
    set({ subscriptions: [...get().subscriptions, s] });
    syncToServer(get, set);
  },
  logSubscriptionPayment: (subscription, dueDateIso) => {
    const record: Transaction = {
      id: generateLocalId(),
      name: subscription.name,
      date: dueDateIso,
      amount: subscription.amount,
      splitPaidBack: false,
      movedToCreditCard: false,
      createdAt: new Date().toISOString(),
    };
    set({
      transactions: [...get().transactions, record],
      subscriptions: get().subscriptions.map((x) => (x.id === subscription.id ? { ...x, lastLoggedDate: dueDateIso } : x)),
    });
    syncToServer(get, set);
  },

  addIncomeRecord: (r) => {
    const record: IncomeRecord = { ...r, id: generateLocalId(), createdAt: new Date().toISOString() };
    set({ incomeRecords: [...get().incomeRecords, record] });
    syncToServer(get, set);
  },
  updateIncomeRecord: (r) => {
    set({ incomeRecords: get().incomeRecords.map((x) => (x.id === r.id ? r : x)) });
    syncToServer(get, set);
  },
  deleteIncomeRecord: (id) => {
    set({ incomeRecords: get().incomeRecords.filter((x) => x.id !== id) });
    syncToServer(get, set);
  },
  restoreIncomeRecord: (r) => {
    set({ incomeRecords: [...get().incomeRecords, r] });
    syncToServer(get, set);
  },

  addPurchase: (p) => {
    const record: Purchase = { ...p, id: generateLocalId(), createdAt: new Date().toISOString() };
    set({ purchases: [...get().purchases, record] });
    syncToServer(get, set);
  },
  updatePurchase: (p) => {
    set({ purchases: get().purchases.map((x) => (x.id === p.id ? p : x)) });
    syncToServer(get, set);
  },
  deletePurchase: (id) => {
    set({ purchases: get().purchases.filter((x) => x.id !== id) });
    syncToServer(get, set);
  },
  restorePurchase: (p) => {
    set({ purchases: [...get().purchases, p] });
    syncToServer(get, set);
  },

  addCarExpense: (c) => {
    const record: CarExpense = { ...c, id: generateLocalId(), createdAt: new Date().toISOString() };
    set({ carExpenses: [...get().carExpenses, record] });
    syncToServer(get, set);
  },
  updateCarExpense: (c) => {
    set({ carExpenses: get().carExpenses.map((x) => (x.id === c.id ? c : x)) });
    syncToServer(get, set);
  },
  deleteCarExpense: (id) => {
    set({ carExpenses: get().carExpenses.filter((x) => x.id !== id) });
    syncToServer(get, set);
  },
  restoreCarExpense: (c) => {
    set({ carExpenses: [...get().carExpenses, c] });
    syncToServer(get, set);
  },

  setCurrency: (c) => {
    set({ currency: c });
    syncToServer(get, set);
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
    if (data.purchases) updates.purchases = data.purchases;
    if (data.carExpenses) updates.carExpenses = data.carExpenses;
    if (data.currency) updates.currency = data.currency;
    set(updates);
    syncToServer(get, set);
  },
}));
