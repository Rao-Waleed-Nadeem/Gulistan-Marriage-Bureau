import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  LANGUAGE_STORAGE_KEY, 
  LANGUAGE_CHANGE_EVENT,
  ROLE_LANGUAGE_KEYS,
  resolveInitialLanguage, 
  persistLanguagePreference, 
  applyDocumentLanguage 
} from './language';

// Mock localStorage, sessionStorage, and document for NodeJS test runner
class MockStorage {
  private store = new Map<string, string>();
  getItem(key: string) { return this.store.get(key) ?? null; }
  setItem(key: string, value: string) { this.store.set(key, value); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

const mockDocumentElement = { lang: '', dir: '' };
(globalThis as any).document = { documentElement: mockDocumentElement };
const storage = new MockStorage();
const sessionStorage = new MockStorage();
const eventListeners: { [key: string]: ((event: any) => void)[] } = {};

(globalThis as any).window = { 
  localStorage: storage,
  sessionStorage: sessionStorage,
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

test('resolveInitialLanguage prefers persisted localStorage preference over stale user preference', () => {
  storage.setItem(LANGUAGE_STORAGE_KEY, 'en');
  const resolved = resolveInitialLanguage('ur');
  assert.equal(resolved, 'en');
});

test('resolveInitialLanguage falls back to user preference when localStorage is empty', () => {
  storage.clear();
  const resolved = resolveInitialLanguage('en');
  assert.equal(resolved, 'en');
});

test('resolveInitialLanguage defaults to Urdu when neither user preference nor storage is set', () => {
  storage.clear();
  const resolved = resolveInitialLanguage(undefined);
  assert.equal(resolved, 'ur');
});

test('resolveInitialLanguage ignores invalid storage values and falls back safely', () => {
  storage.setItem(LANGUAGE_STORAGE_KEY, 'invalid_lang');
  const resolved = resolveInitialLanguage(undefined);
  assert.equal(resolved, 'ur');
});

test('persistLanguagePreference stores preference across browser storage and all role profiles for Urdu', () => {
  persistLanguagePreference('ur');
  assert.equal(storage.getItem(LANGUAGE_STORAGE_KEY), 'ur');
  assert.equal(storage.getItem(ROLE_LANGUAGE_KEYS.public), 'ur');
  assert.equal(storage.getItem(ROLE_LANGUAGE_KEYS.nadeem), 'ur');
  assert.equal(storage.getItem(ROLE_LANGUAGE_KEYS.customer), 'ur');
  assert.equal(storage.getItem(ROLE_LANGUAGE_KEYS.admin), 'ur');
  assert.equal(mockDocumentElement.lang, 'ur');
  assert.equal(mockDocumentElement.dir, 'rtl');
});

test('persistLanguagePreference stores preference across browser storage and all role profiles for English', () => {
  persistLanguagePreference('en');
  assert.equal(storage.getItem(LANGUAGE_STORAGE_KEY), 'en');
  assert.equal(storage.getItem(ROLE_LANGUAGE_KEYS.public), 'en');
  assert.equal(storage.getItem(ROLE_LANGUAGE_KEYS.nadeem), 'en');
  assert.equal(storage.getItem(ROLE_LANGUAGE_KEYS.customer), 'en');
  assert.equal(storage.getItem(ROLE_LANGUAGE_KEYS.admin), 'en');
  assert.equal(mockDocumentElement.lang, 'en');
  assert.equal(mockDocumentElement.dir, 'ltr');
});

test('persistLanguagePreference never reads or modifies authentication session storage', () => {
  const legacySession = JSON.stringify({
    user: { id: 'legacy-user', role: 'admin', preferredLanguage: 'ur' },
    isAuthenticated: true
  });
  sessionStorage.setItem('gulistan_auth_session', legacySession);

  persistLanguagePreference('en');

  assert.equal(sessionStorage.getItem('gulistan_auth_session'), legacySession);
});

test('persistLanguagePreference dispatches live language change event', () => {
  let dispatchedDetail: any = null;
  const listener = (event: any) => {
    dispatchedDetail = event.detail;
  };
  (globalThis as any).window.addEventListener(LANGUAGE_CHANGE_EVENT, listener);

  persistLanguagePreference('ur');
  assert.equal(dispatchedDetail, 'ur');

  persistLanguagePreference('en');
  assert.equal(dispatchedDetail, 'en');

  (globalThis as any).window.removeEventListener(LANGUAGE_CHANGE_EVENT, listener);
});
