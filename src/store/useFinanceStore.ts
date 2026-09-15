import { create } from 'zustand';
import { generateLocalId } from '../lib/id';
import { loadCollection, loadValue, saveCollection, saveValue } from '../lib/storage';
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

interface FinanceState {
  transactions: Transaction[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  savingsGoals: SavingsGoal[];
  investments: Investment[];
  subscriptions: Subscription[];
  incomeRecords: IncomeRecord[];
  currency: CurrencyCode;
  filter: TransactionFilter;

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
}

// Persists a whole collection to localStorage after every mutation,
// mirroring each LocalXRepository's _persist() call in the Dart app.
function persist(name: string, items: unknown[]) {
  saveCollection(name, items);
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: loadCollection<Transaction>('transactions'),
  categories: loadCollection<Category>('categories'),
  paymentMethods: loadCollection<PaymentMethod>('payment_methods'),
  savingsGoals: loadCollection<SavingsGoal>('savings_goals'),
  investments: loadCollection<Investment>('investments'),
  subscriptions: loadCollection<Subscription>('subscriptions'),
  incomeRecords: loadCollection<IncomeRecord>('income'),
  currency: loadValue<CurrencyCode>('currency', 'usd'),
  filter: EMPTY_FILTER,

  addTransaction: (t) => {
    const record: Transaction = { ...t, id: generateLocalId(), createdAt: new Date().toISOString() };
    const transactions = [...get().transactions, record];
    persist('transactions', transactions);
    set({ transactions });
  },
  updateTransaction: (t) => {
    const transactions = get().transactions.map((x) => (x.id === t.id ? t : x));
    persist('transactions', transactions);
    set({ transactions });
  },
  deleteTransaction: (id) => {
    const transactions = get().transactions.filter((x) => x.id !== id);
    persist('transactions', transactions);
    set({ transactions });
  },
  restoreTransaction: (t) => {
    const transactions = [...get().transactions, t];
    persist('transactions', transactions);
    set({ transactions });
  },

  addCategory: (c) => {
    const record: Category = { ...c, id: generateLocalId(), createdAt: new Date().toISOString() };
    const categories = [...get().categories, record];
    persist('categories', categories);
    set({ categories });
  },
  updateCategory: (c) => {
    const categories = get().categories.map((x) => (x.id === c.id ? c : x));
    persist('categories', categories);
    set({ categories });
  },
  deleteCategory: (id) => {
    const categories = get().categories.filter((x) => x.id !== id);
    persist('categories', categories);
    set({ categories });
  },
  restoreCategory: (c) => {
    const categories = [...get().categories, c];
    persist('categories', categories);
    set({ categories });
  },

  addPaymentMethod: (m) => {
    const record: PaymentMethod = { ...m, id: generateLocalId(), createdAt: new Date().toISOString() };
    const paymentMethods = [...get().paymentMethods, record];
    persist('payment_methods', paymentMethods);
    set({ paymentMethods });
  },
  deletePaymentMethod: (id) => {
    const paymentMethods = get().paymentMethods.filter((x) => x.id !== id);
    persist('payment_methods', paymentMethods);
    set({ paymentMethods });
  },
  restorePaymentMethod: (m) => {
    const paymentMethods = [...get().paymentMethods, m];
    persist('payment_methods', paymentMethods);
    set({ paymentMethods });
  },

  addSavingsGoal: (g) => {
    const record: SavingsGoal = { ...g, id: generateLocalId(), createdAt: new Date().toISOString() };
    const savingsGoals = [...get().savingsGoals, record];
    persist('savings_goals', savingsGoals);
    set({ savingsGoals });
  },
  updateSavingsGoal: (g) => {
    const savingsGoals = get().savingsGoals.map((x) => (x.id === g.id ? g : x));
    persist('savings_goals', savingsGoals);
    set({ savingsGoals });
  },
  deleteSavingsGoal: (id) => {
    const savingsGoals = get().savingsGoals.filter((x) => x.id !== id);
    persist('savings_goals', savingsGoals);
    set({ savingsGoals });
  },
  restoreSavingsGoal: (g) => {
    const savingsGoals = [...get().savingsGoals, g];
    persist('savings_goals', savingsGoals);
    set({ savingsGoals });
  },

  addInvestment: (i) => {
    const record: Investment = { ...i, id: generateLocalId(), createdAt: new Date().toISOString() };
    const investments = [...get().investments, record];
    persist('investments', investments);
    set({ investments });
  },
  updateInvestment: (i) => {
    const investments = get().investments.map((x) => (x.id === i.id ? i : x));
    persist('investments', investments);
    set({ investments });
  },
  deleteInvestment: (id) => {
    const investments = get().investments.filter((x) => x.id !== id);
    persist('investments', investments);
    set({ investments });
  },
  restoreInvestment: (i) => {
    const investments = [...get().investments, i];
    persist('investments', investments);
    set({ investments });
  },

  addSubscription: (s) => {
    const record: Subscription = { ...s, id: generateLocalId(), createdAt: new Date().toISOString() };
    const subscriptions = [...get().subscriptions, record];
    persist('subscriptions', subscriptions);
    set({ subscriptions });
  },
  updateSubscription: (s) => {
    const subscriptions = get().subscriptions.map((x) => (x.id === s.id ? s : x));
    persist('subscriptions', subscriptions);
    set({ subscriptions });
  },
  deleteSubscription: (id) => {
    const subscriptions = get().subscriptions.filter((x) => x.id !== id);
    persist('subscriptions', subscriptions);
    set({ subscriptions });
  },
  restoreSubscription: (s) => {
    const subscriptions = [...get().subscriptions, s];
    persist('subscriptions', subscriptions);
    set({ subscriptions });
  },

  addIncomeRecord: (r) => {
    const record: IncomeRecord = { ...r, id: generateLocalId(), createdAt: new Date().toISOString() };
    const incomeRecords = [...get().incomeRecords, record];
    persist('income', incomeRecords);
    set({ incomeRecords });
  },
  updateIncomeRecord: (r) => {
    const incomeRecords = get().incomeRecords.map((x) => (x.id === r.id ? r : x));
    persist('income', incomeRecords);
    set({ incomeRecords });
  },
  deleteIncomeRecord: (id) => {
    const incomeRecords = get().incomeRecords.filter((x) => x.id !== id);
    persist('income', incomeRecords);
    set({ incomeRecords });
  },
  restoreIncomeRecord: (r) => {
    const incomeRecords = [...get().incomeRecords, r];
    persist('income', incomeRecords);
    set({ incomeRecords });
  },

  setCurrency: (c) => {
    saveValue('currency', c);
    set({ currency: c });
  },
  applyFilter: (f) => set({ filter: f }),
  clearFilter: () => set({ filter: EMPTY_FILTER }),
}));
