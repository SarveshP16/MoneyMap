// Device-local key/value storage (JSON in localStorage, keys prefixed
// "moneymap.finance.") for caches and per-device settings — offline copies
// of synced data, notification opt-in. Never throws on a storage failure
// (private browsing, quota exceeded) since callers can't usefully react
// to it.

const PREFIX = 'moneymap.finance.';

export function loadValue<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveValue<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // ignore
  }
}
