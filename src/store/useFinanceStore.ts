import { create } from 'zustand';
import { fetchState, pushState, type ServerState } from '../lib/api';
import { generateLocalId } from '../lib/id';
import { loadValue, saveValue } from '../lib/storage';
import { useToastStore } from './useToastStore';
import {
  EMPTY_FILTER,
  type TransactionFilter,
} from '../lib/transactionFiltering';
import type {
  BankAllocation,
  BankColumn,
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
  bankAllocations: BankAllocation[];
  bankColumns: BankColumn[];
  currency: CurrencyCode;
  filter: TransactionFilter;

  /** The profile (Me / Partner / Shared) this store's data belongs to —
   *  set once by `init`, then used by every subsequent server call so
   *  mutations don't each need it threaded through. */
  profileId: string | null;

  /** Loads the given ledger from the server — on startup and whenever the
   *  active ledger changes. */
  init: (profileId: string) => Promise<void>;
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

  /** Returns the new row's id so the page can focus it. */
  addBankAllocation: (a: Omit<BankAllocation, 'id' | 'createdAt'>) => string;
  updateBankAllocation: (a: BankAllocation) => void;
  deleteBankAllocation: (id: string) => void;
  /** Puts a deleted row back where it was — row order is meaningful in the
   *  Banks table, unlike the other collections, which are sorted on display. */
  restoreBankAllocation: (a: BankAllocation, index: number) => void;

  addBankColumn: (c: Omit<BankColumn, 'id' | 'createdAt'>) => void;
  updateBankColumn: (c: BankColumn) => void;
  /** Rows keep their value for a deleted column (under its old id), so
   *  Undo brings the data back with it. */
  deleteBankColumn: (id: string) => void;
  restoreBankColumn: (c: BankColumn, index: number) => void;

  setCurrency: (c: CurrencyCode) => void;
  applyFilter: (f: TransactionFilter) => void;
  clearFilter: () => void;

  /** Replaces every collection wholesale — the backend for Settings'
   *  "Import data". Omitted collections are left untouched rather than
   *  cleared, so a backup file missing a newer field/collection can still
   *  be restored without wiping everything else. */
  restoreAll: (data: Partial<FinanceBackupData>) => void;
  /** Drops all loaded data and this device's offline caches of it — on
   *  sign-out, so the next account here never sees the previous one's. */
  reset: () => void;
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
  bankAllocations: BankAllocation[];
  bankColumns: BankColumn[];
  currency: CurrencyCode;
}

const LAST_KNOWN_STATE_KEY = 'lastKnownServerState';
/** Namespaced per profile so switching profiles on one device can't show
 *  another profile's cached data while offline. */
function lastKnownStateKey(profileId: string): string {
  return `${LAST_KNOWN_STATE_KEY}.${profileId}`;
}
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
  if (!s.profileId) return;
  const profileId = s.profileId;
  const wasAlreadyPending = s.pendingSync;
  pushState(profileId, {
    transactions: s.transactions,
    categories: s.categories,
    paymentMethods: s.paymentMethods,
    savingsGoals: s.savingsGoals,
    investments: s.investments,
    subscriptions: s.subscriptions,
    incomeRecords: s.incomeRecords,
    purchases: s.purchases,
    carExpenses: s.carExpenses,
    bankAllocations: s.bankAllocations,
    bankColumns: s.bankColumns,
    currency: s.currency,
  })
    .then((saved) => {
      saveValue(lastKnownStateKey(profileId), saved);
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
  profileId: null,

  transactions: [],
  categories: [],
  paymentMethods: [],
  savingsGoals: [],
  investments: [],
  subscriptions: [],
  incomeRecords: [],
  purchases: [],
  carExpenses: [],
  bankAllocations: [],
  bankColumns: [],
  currency: 'usd',
  filter: EMPTY_FILTER,

  init: async (profileId) => {
    set({ status: 'loading', profileId });
    try {
      const server = await fetchState(profileId);
      saveValue(lastKnownStateKey(profileId), server);
      set({ ...server, status: 'ready', isOnline: true, pendingSync: false });
    } catch (err) {
      console.error('Failed to load from server', err);
      // No connection on first load — fall back to whatever this browser
      // last saw from the server (saved after every successful load/sync)
      // so the app still opens with your real data instead of an error
      // screen, offline-first rather than offline-broken.
      const cached = loadValue<ServerState | null>(lastKnownStateKey(profileId), null);
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
    const profileId = get().profileId;
    if (get().status !== 'ready' || !profileId) return;
    if (get().pendingSync) {
      syncToServer(get, set);
      return;
    }
    try {
      const server = await fetchState(profileId);
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
        bankAllocations: server.bankAllocations,
        bankColumns: server.bankColumns,
        currency: server.currency,
        isOnline: true,
      });
      saveValue(lastKnownStateKey(profileId), server);
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

  addBankAllocation: (a) => {
    const record: BankAllocation = { ...a, id: generateLocalId(), createdAt: new Date().toISOString() };
    set({ bankAllocations: [...get().bankAllocations, record] });
    syncToServer(get, set);
    return record.id;
  },
  updateBankAllocation: (a) => {
    set({ bankAllocations: get().bankAllocations.map((x) => (x.id === a.id ? a : x)) });
    syncToServer(get, set);
  },
  deleteBankAllocation: (id) => {
    set({ bankAllocations: get().bankAllocations.filter((x) => x.id !== id) });
    syncToServer(get, set);
  },
  restoreBankAllocation: (a, index) => {
    const next = [...get().bankAllocations];
    next.splice(Math.min(index, next.length), 0, a);
    set({ bankAllocations: next });
    syncToServer(get, set);
  },

  addBankColumn: (c) => {
    const record: BankColumn = { ...c, id: generateLocalId(), createdAt: new Date().toISOString() };
    set({ bankColumns: [...get().bankColumns, record] });
    syncToServer(get, set);
  },
  updateBankColumn: (c) => {
    set({ bankColumns: get().bankColumns.map((x) => (x.id === c.id ? c : x)) });
    syncToServer(get, set);
  },
  deleteBankColumn: (id) => {
    set({ bankColumns: get().bankColumns.filter((x) => x.id !== id) });
    syncToServer(get, set);
  },
  restoreBankColumn: (c, index) => {
    const next = [...get().bankColumns];
    next.splice(Math.min(index, next.length), 0, c);
    set({ bankColumns: next });
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
    if (data.bankAllocations) updates.bankAllocations = data.bankAllocations;
    if (data.bankColumns) updates.bankColumns = data.bankColumns;
    if (data.currency) updates.currency = data.currency;
    set(updates);
    syncToServer(get, set);
  },

  reset: () => {
    try {
      const prefix = `moneymap.finance.${LAST_KNOWN_STATE_KEY}.`;
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(prefix)) localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
    set({
      status: 'loading',
      isOnline: true,
      pendingSync: false,
      profileId: null,
      transactions: [],
      categories: [],
      paymentMethods: [],
      savingsGoals: [],
      investments: [],
      subscriptions: [],
      incomeRecords: [],
      purchases: [],
      carExpenses: [],
      bankAllocations: [],
      bankColumns: [],
      currency: 'usd',
      filter: EMPTY_FILTER,
    });
  },
}));
