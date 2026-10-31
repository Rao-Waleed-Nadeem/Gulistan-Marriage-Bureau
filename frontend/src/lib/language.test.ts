import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  LANGUAGE_STORAGE_KEY, 
  resolveInitialLanguage, 
  persistLanguagePreference, 
  applyDocumentLanguage 
} from './language';

// Mock localStorage and document for NodeJS test runner
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
(globalThis as any).window = { localStorage: storage };

test('resolveInitialLanguage prefers authenticated user preference over localStorage', () => {
  storage.setItem(LANGUAGE_STORAGE_KEY, 'en');
  const resolved = resolveInitialLanguage('ur');
  assert.equal(resolved, 'ur');
});

test('resolveInitialLanguage falls back to localStorage when user preference is absent', () => {
  storage.setItem(LANGUAGE_STORAGE_KEY, 'en');
  const resolved = resolveInitialLanguage(undefined);
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

test('persistLanguagePreference stores preference and sets RTL document attributes for Urdu', () => {
  persistLanguagePreference('ur');
  assert.equal(storage.getItem(LANGUAGE_STORAGE_KEY), 'ur');
  assert.equal(mockDocumentElement.lang, 'ur');
  assert.equal(mockDocumentElement.dir, 'rtl');
});

test('persistLanguagePreference stores preference and sets LTR document attributes for English', () => {
  persistLanguagePreference('en');
  assert.equal(storage.getItem(LANGUAGE_STORAGE_KEY), 'en');
  assert.equal(mockDocumentElement.lang, 'en');
  assert.equal(mockDocumentElement.dir, 'ltr');
});
