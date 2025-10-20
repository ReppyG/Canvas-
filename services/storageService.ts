// Fix: Declared 'chrome' as 'any' to resolve type errors when @types/chrome is not available.
declare const chrome: any;

/**
 * A simple abstraction for storage that works in both extension and web contexts.
 * It prioritizes `chrome.storage.local` if available, otherwise falls back to `localStorage`.
 */
const isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

export const storage = {
  /**
   * Retrieves an item from storage.
   * @param key The key of the item to retrieve.
   * @returns The stored item, or null if not found.
   */
  get: async <T>(key: string): Promise<T | null> => {
    try {
      if (isExtension) {
        const data = await chrome.storage.local.get(key);
        // The result from chrome.storage.local.get is an object { [key]: value }
        return (data ? data[key] : null) || null;
      } else {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      }
    } catch (error) {
      console.error(`Error getting item '${key}' from storage:`, error);
      return null;
    }
  },

  /**
   * Saves an item to storage.
   * @param key The key of the item to save.
   * @param value The value to save.
   */
  set: async (key: string, value: any): Promise<void> => {
    try {
      if (isExtension) {
        await chrome.storage.local.set({ [key]: value });
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Error setting item '${key}' in storage:`, error);
    }
  },

  /**
   * Removes an item from storage.
   * @param key The key of the item to remove.
   */
  remove: async (key: string): Promise<void> => {
    try {
      if (isExtension) {
        await chrome.storage.local.remove(key);
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing item '${key}' from storage:`, error);
    }
  }
};
