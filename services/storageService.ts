// Implements a simple key-value storage using localStorage.
// The methods are async to match a more robust storage service interface,
// even though localStorage itself is synchronous.

const storage = {
  /**
   * Retrieves an item from localStorage and parses it as JSON.
   * @param key The key of the item to retrieve.
   * @returns The stored value, or null if not found or if an error occurs.
   */
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting item ${key} from localStorage`, error);
      return null;
    }
  },

  /**
   * Serializes a value to JSON and stores it in localStorage.
   * @param key The key under which to store the value.
   * @param value The value to store.
   */
  set: async (key: string, value: unknown): Promise<void> => {
    try {
      const item = JSON.stringify(value);
      window.localStorage.setItem(key, item);
    } catch (error) {
      console.error(`Error setting item ${key} in localStorage`, error);
    }
  },

  /**
   * Removes an item from localStorage.
   * @param key The key of the item to remove.
   */
  remove: async (key: string): Promise<void> => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item ${key} from localStorage`, error);
    }
  },
};

export { storage };
