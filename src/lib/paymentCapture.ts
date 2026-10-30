// The Android app's PaymentCapture plugin (android/.../PaymentCapturePlugin.java):
// a notification listener that queues wallet and bank payment alerts for
// review. Android only — the web and Windows builds never call into it.

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { RawCapture } from './paymentParsing';

export interface CaptureApp {
  packageName: string;
  label: string;
  watched: boolean;
  /** One of the wallets/banks watched by default. */
  known: boolean;
}

interface PaymentCapturePlugin {
  getStatus(): Promise<{ enabled: boolean; hasAccess: boolean }>;
  setEnabled(options: { enabled: boolean }): Promise<void>;
  openAccessSettings(): Promise<void>;
  openAppInfo(): Promise<void>;
  getPending(): Promise<{ captures: RawCapture[] }>;
  acknowledge(options: { ids: string[] }): Promise<void>;
  listApps(): Promise<{ apps: CaptureApp[] }>;
  setWatchedApps(options: { packages: string[] }): Promise<void>;
  /** Fires when a payment is queued while the app is open, and when the app resumes. */
  addListener(event: 'changed', listener: () => void): Promise<PluginListenerHandle>;
}

export const paymentCaptureSupported = Capacitor.getPlatform() === 'android';

export const PaymentCapture = registerPlugin<PaymentCapturePlugin>('PaymentCapture');
