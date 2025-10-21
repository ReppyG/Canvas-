
/**
 * A simple abstraction for storage that uses localStorage.
 */
export const storage = {
  /**
   * Retrieves an item from storage.
   * @param key The key of the item to retrieve.
   * @returns The stored item, or null if not found.
   */
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
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
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error)
        {
      console.error(`Error setting item '${key}' in storage:`, error);
    }
  },

  /**
   * Removes an item from storage.
   * @param key The key of the item to remove.
   */
  remove: async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item '${key}' from storage:`, error);
    }
  }
};