import AsyncStorage from '@react-native-async-storage/async-storage';

import { HTTP_LOG_LIMIT, STORAGE_KEYS } from '../config/defaults';
import type { HttpLogEntry, HttpLogKind } from '../types/remote';

type Listener = (entries: HttpLogEntry[]) => void;

let memoryCache: HttpLogEntry[] | null = null;
const listeners = new Set<Listener>();

function notify() {
  if (!memoryCache) return;
  for (const listener of listeners) {
    listener(memoryCache);
  }
}

export function subscribeHttpLogs(listener: Listener): () => void {
  listeners.add(listener);
  if (memoryCache) {
    listener(memoryCache);
  } else {
    void loadHttpLogs().then(listener);
  }
  return () => {
    listeners.delete(listener);
  };
}

export async function loadHttpLogs(): Promise<HttpLogEntry[]> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.httpLogs);
    if (!raw) {
      memoryCache = [];
      return memoryCache;
    }
    const parsed = JSON.parse(raw) as HttpLogEntry[];
    memoryCache = Array.isArray(parsed) ? parsed.slice(0, HTTP_LOG_LIMIT) : [];
    return memoryCache;
  } catch {
    memoryCache = [];
    return memoryCache;
  }
}

async function persist(entries: HttpLogEntry[]): Promise<void> {
  memoryCache = entries;
  notify();
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.httpLogs, JSON.stringify(entries));
  } catch (error) {
    console.warn('[HttpLog] persist failed', error);
  }
}

export function formatLogTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function labelForKind(kind: HttpLogKind): string {
  switch (kind) {
    case 'ping':
      return 'Ping / Status';
    case 'power':
      return 'Power';
    case 'ok':
      return 'OK';
    case 'home':
      return 'Home';
    case 'back':
      return 'Back';
    case 'vol_inc':
      return 'Vol +';
    case 'vol_dec':
      return 'Vol −';
    case 'mute':
      return 'Mute';
    case 'prgm_inc':
      return 'Ch +';
    case 'prgm_dec':
      return 'Ch −';
    default:
      return kind;
  }
}

export async function appendHttpLog(input: {
  kind: HttpLogKind;
  url: string;
  ok: boolean;
  detail: string;
  label?: string;
}): Promise<HttpLogEntry> {
  const entry: HttpLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    kind: input.kind,
    label: input.label ?? labelForKind(input.kind),
    url: input.url,
    ok: input.ok,
    detail: input.detail,
  };

  const current = await loadHttpLogs();
  const next = [entry, ...current].slice(0, HTTP_LOG_LIMIT);
  await persist(next);
  return entry;
}

export async function clearHttpLogs(): Promise<void> {
  await persist([]);
}
