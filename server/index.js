// MoneyMap's sync backend — deliberately as simple as the thing it
// replaces: the frontend used to read/write one JSON blob to
// localStorage per collection; this does the same thing to one JSON
// file on disk, over HTTP, so every device hits the same data instead
// of its own local copy. No database, no auth beyond "you're on the
// Tailscale network that can reach this container" — appropriate for a
// single person's own data on their own tailnet, not for anything
// exposed to the open internet.

import express from 'express';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || '/data';
const DATA_FILE = path.join(DATA_DIR, 'state.json');
const PORT = process.env.PORT || 3001;

const DEFAULT_STATE = {
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
};

const COLLECTION_KEYS = [
  'transactions',
  'categories',
  'paymentMethods',
  'savingsGoals',
  'investments',
  'subscriptions',
  'incomeRecords',
  'purchases',
  'carExpenses',
];

async function loadState() {
  if (!existsSync(DATA_FILE)) return { ...DEFAULT_STATE, updatedAt: null };
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch (err) {
    console.error(`Couldn't read ${DATA_FILE}, starting from an empty state:`, err);
    return { ...DEFAULT_STATE, updatedAt: null };
  }
}

// Write to a temp file and rename over the real one, so a crash or a
// container restart mid-write can never leave state.json half-written.
async function saveState(state) {
  const tmpFile = `${DATA_FILE}.tmp`;
  await writeFile(tmpFile, JSON.stringify(state, null, 2), 'utf-8');
  await rename(tmpFile, DATA_FILE);
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

mkdirSync(DATA_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/state', async (_req, res) => {
  res.json(await loadState());
});

app.put('/api/state', async (req, res) => {
  const body = req.body;
  if (!isPlainObject(body)) {
    return res.status(400).json({ error: 'Expected a JSON object.' });
  }

  const current = await loadState();
  // Merge over the current state rather than replacing wholesale, so a
  // payload that's missing a key (an older client, a partial import)
  // can't silently wipe collections it never meant to touch. Each
  // collection field, if present, still fully replaces its own array —
  // that's the same "whole collection" persistence model the frontend
  // already used with localStorage, just centralized here now.
  const next = { ...current };
  for (const key of COLLECTION_KEYS) {
    if (Array.isArray(body[key])) next[key] = body[key];
  }
  if (typeof body.currency === 'string') next.currency = body.currency;
  next.updatedAt = new Date().toISOString();

  await saveState(next);
  res.json(next);
});

app.listen(PORT, () => {
  console.log(`moneymap-server listening on :${PORT}, data file: ${DATA_FILE}`);
});
