// Local persistence — the web equivalent of Pulse's LocalXRepository classes
// (SharedPreferences, JSON-encoded). Same key style
// ("moneymap.finance.<name>.v1"), same "never throw on a storage failure"
// posture (private browsing, quota exceeded) since callers can't usefully
// react to it.

const PREFIX = 'moneymap.finance.';

export function loadCollection<T>(name: string): T[] {
  try {
    const raw = localStorage.getItem(`${PREFIX}${name}.v1`);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

export function saveCollection<T>(name: string, items: T[]): void {
  try {
    localStorage.setItem(`${PREFIX}${name}.v1`, JSON.stringify(items));
  } catch {
    // Storage unavailable/full — fail silently, same as the Dart repos do
    // implicitly (an awaited SharedPreferences call that a caller doesn't
    // wrap in try/catch either).
  }
}

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
