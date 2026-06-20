const memoryStore: Record<string, string> = {};

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn("localStorage.getItem blocked; using memory fallback", e);
    }
    return key in memoryStore ? memoryStore[key] : null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn("localStorage.setItem blocked; using memory fallback", e);
    }
    memoryStore[key] = String(value);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn("localStorage.removeItem blocked; using memory fallback", e);
    }
    delete memoryStore[key];
  },
  clear: (): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear();
        return;
      }
    } catch (e) {
      console.warn("localStorage.clear blocked; using memory fallback", e);
    }
    for (const key in memoryStore) {
      delete memoryStore[key];
    }
  }
};
