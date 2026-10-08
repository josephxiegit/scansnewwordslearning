export const BOOK_EDITION = Number(import.meta.env?.VITE_BOOK_EDITION || 2026);
export const FULL_PAGE_COUNT = BOOK_EDITION === 2027 ? 458 : 456;
export const FOLLOW_CODE_TYPE = BOOK_EDITION === 2027 ? '跟读-高考-2027' : '跟读-高考';
export const FOLLOW_BIND_KEY = BOOK_EDITION === 2027 ? 'follow_bindCode' : 'bindCode';
export const FOLLOW_CLIENT_KEY = BOOK_EDITION === 2027 ? 'follow_client_id' : 'client_id';
export const FIRST_LEARNING_PARAM = BOOK_EDITION === 2027 ? 1791429056 : 1748931148;
export const API_BASE = import.meta.env?.VITE_SCAN_API_BASE ||
  (import.meta.env?.DEV ? 'http://127.0.0.1:8000/scanwordslearning' : '/scanwordslearning');
export const getScanType = (level) => `扫码书-${level}${BOOK_EDITION === 2027 && level === '高中' ? '-2027' : ''}`;
export const bookUrl = (path) => `${import.meta.env?.BASE_URL || '/'}${path.replace(/^\//, '')}`;

export function createEditionStorage(getStorage, prefix = '') {
  const keys = () => {
    const storage = getStorage();
    return Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key) => key !== null && key.startsWith(prefix));
  };
  return {
    getItem(key) { return getStorage().getItem(prefix + key); },
    setItem(key, value) { getStorage().setItem(prefix + key, value); },
    removeItem(key) { getStorage().removeItem(prefix + key); },
    clear() { keys().forEach((key) => getStorage().removeItem(key)); },
    key(index) { return keys()[index]?.slice(prefix.length) ?? null; },
    get length() { return keys().length; },
  };
}

export const editionStorage = createEditionStorage(() => window.localStorage,
  BOOK_EDITION === 2027 ? 'book2027:' : '');
export const editionSessionStorage = createEditionStorage(() => window.sessionStorage,
  BOOK_EDITION === 2027 ? 'book2027:' : '');
