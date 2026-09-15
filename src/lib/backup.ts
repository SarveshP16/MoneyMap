// Whole-data backup/restore — MoneyMap's only real safety net while
// everything lives in localStorage. Mirrors Pulse's Settings "Export data"
// / "Import data" (data_backup_service.dart), adapted to a browser
// download/file-picker instead of the filesystem.

import { CURRENCIES, type CarExpense, type Category, type CurrencyCode, type IncomeRecord, type Investment, type PaymentMethod, type Purchase, type SavingsGoal, type Subscription, type Transaction } from './types';
import type { FinanceBackupData } from '../store/useFinanceStore';
import { formatIsoDate } from './dates';

const BACKUP_VERSION = 1;

interface BackupFile extends FinanceBackupData {
  app: 'moneymap';
  version: number;
  exportedAt: string;
}

export function downloadBackup(data: FinanceBackupData): void {
  const file: BackupFile = { app: 'moneymap', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), ...data };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `moneymap-backup-${formatIsoDate(new Date())}.json`;
  // Must be in the DOM for .click() to reliably trigger a download in every
  // browser, and the object URL must outlive the click — revoking it
  // synchronously races the browser actually reading the blob and can
  // silently drop the download.
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Loose structural validation — enough to catch "wrong file" without
 *  being so strict that a backup from a slightly older/newer version of
 *  the app gets rejected. Unknown/missing fields are just omitted from
 *  the result, which `restoreAll` already treats as "leave untouched". */
export function parseBackup(raw: string): Partial<FinanceBackupData> {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error('That file isn’t valid JSON.');
  }
  if (typeof json !== 'object' || json === null) {
    throw new Error('That file isn’t a MoneyMap backup.');
  }
  const obj = json as Record<string, unknown>;
  if (obj.app !== 'moneymap') {
    throw new Error('That file isn’t a MoneyMap backup.');
  }

  const result: Partial<FinanceBackupData> = {};
  if (Array.isArray(obj.transactions)) result.transactions = obj.transactions as Transaction[];
  if (Array.isArray(obj.categories)) result.categories = obj.categories as Category[];
  if (Array.isArray(obj.paymentMethods)) result.paymentMethods = obj.paymentMethods as PaymentMethod[];
  if (Array.isArray(obj.savingsGoals)) result.savingsGoals = obj.savingsGoals as SavingsGoal[];
  if (Array.isArray(obj.investments)) result.investments = obj.investments as Investment[];
  if (Array.isArray(obj.subscriptions)) result.subscriptions = obj.subscriptions as Subscription[];
  if (Array.isArray(obj.incomeRecords)) result.incomeRecords = obj.incomeRecords as IncomeRecord[];
  if (Array.isArray(obj.purchases)) result.purchases = obj.purchases as Purchase[];
  if (Array.isArray(obj.carExpenses)) result.carExpenses = obj.carExpenses as CarExpense[];
  if (typeof obj.currency === 'string' && obj.currency in CURRENCIES) result.currency = obj.currency as CurrencyCode;

  const hasAnyCollection = [
    result.transactions,
    result.categories,
    result.paymentMethods,
    result.savingsGoals,
    result.investments,
    result.subscriptions,
    result.incomeRecords,
    result.purchases,
    result.carExpenses,
  ].some((c) => c != null);
  if (!hasAnyCollection && result.currency == null) {
    throw new Error('That backup file is empty.');
  }

  return result;
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read that file.'));
    reader.readAsText(file);
  });
}

/** A rough item count, for the confirmation prompt before an import
 *  overwrites everything. */
export function backupItemCount(data: Partial<FinanceBackupData>): number {
  return (
    (data.transactions?.length ?? 0) +
    (data.categories?.length ?? 0) +
    (data.paymentMethods?.length ?? 0) +
    (data.savingsGoals?.length ?? 0) +
    (data.investments?.length ?? 0) +
    (data.subscriptions?.length ?? 0) +
    (data.incomeRecords?.length ?? 0) +
    (data.purchases?.length ?? 0) +
    (data.carExpenses?.length ?? 0)
  );
}
