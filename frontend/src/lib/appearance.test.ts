import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  CLARITY_STORAGE_KEY, 
  CLARITY_CHANGE_EVENT,
  resolveInitialClarity, 
  persistClarityPreference, 
  ClarityMode 
} from './appearance';

class MockStorage {
  private store = new Map<string, string>();
  getItem(key: string) { return this.store.get(key) ?? null; }
  setItem(key: string, value: string) { this.store.set(key, value); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

const storage = new MockStorage();
const eventListeners: { [key: string]: ((event: any) => void)[] } = {};

(globalThis as any).window = { 
  localStorage: storage,
  dispatchEvent: (event: any) => {
    const list = eventListeners[event.type] || [];
    list.forEach(cb => cb(event));
    return true;
  },
  addEventListener: (type: string, cb: any) => {
    if (!eventListeners[type]) eventListeners[type] = [];
    eventListeners[type].push(cb);
  },
  removeEventListener: (type: string, cb: any) => {
    if (eventListeners[type]) {
      eventListeners[type] = eventListeners[type].filter(fn => fn !== cb);
    }
  }
};

(globalThis as any).CustomEvent = class CustomEvent {
  type: string;
  detail: any;
  constructor(type: string, params?: { detail: any }) {
    this.type = type;
    this.detail = params?.detail;
  }
};

test('resolveInitialClarity defaults to clear when storage is empty', () => {
  storage.clear();
  assert.equal(resolveInitialClarity(), 'clear');
});

test('resolveInitialClarity loads valid stored clarity modes', () => {
  storage.setItem(CLARITY_STORAGE_KEY, 'ultra');
  assert.equal(resolveInitialClarity(), 'ultra');

  storage.setItem(CLARITY_STORAGE_KEY, 'soft');
  assert.equal(resolveInitialClarity(), 'soft');

  storage.setItem(CLARITY_STORAGE_KEY, 'clear');
  assert.equal(resolveInitialClarity(), 'clear');
});

test('resolveInitialClarity ignores invalid values and defaults to clear', () => {
  storage.setItem(CLARITY_STORAGE_KEY, 'invalid_mode');
  assert.equal(resolveInitialClarity(), 'clear');
});

test('persistClarityPreference saves mode to storage and dispatches change event', () => {
  let dispatchedDetail: any = null;
  const listener = (event: any) => {
    dispatchedDetail = event.detail;
  };
  (globalThis as any).window.addEventListener(CLARITY_CHANGE_EVENT, listener);

  persistClarityPreference('ultra');
  assert.equal(storage.getItem(CLARITY_STORAGE_KEY), 'ultra');
  assert.equal(dispatchedDetail, 'ultra');

  persistClarityPreference('soft');
  assert.equal(storage.getItem(CLARITY_STORAGE_KEY), 'soft');
  assert.equal(dispatchedDetail, 'soft');

  (globalThis as any).window.removeEventListener(CLARITY_CHANGE_EVENT, listener);
});
