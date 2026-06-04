import { ref } from 'vue';
import { get } from '@vueuse/core';
import Lockr from 'lockr';

const MAX_RECENT_SEARCHES = 10;
const STORAGE_PREFIX = 'recentSearches_';

/**
 * Composable for managing recent search terms in localStorage.
 * Scoped per user ID.
 * @param {import('vue').Ref<string>} userId - scopes stored searches to the user
 * @returns {{ recentSearches: import('vue').Ref<string[]>, addSearch: (term: string) => void }}
 */
export default function useRecentSearches(userId) {
  const recentSearches = ref([]);

  function _storageKey() {
    return STORAGE_PREFIX + get(userId);
  }

  function _load() {
    const stored = Lockr.get(_storageKey(), []);
    recentSearches.value =
      Array.isArray(stored) && stored.every(t => typeof t === 'string') ? stored : [];
  }

  function _save() {
    Lockr.set(_storageKey(), recentSearches.value);
  }

  /**
   * Add a search term to recent searches.
   * Moves to front if already exists. Trims whitespace. Ignores empty strings.
   * @param {string} term - search term to record
   */
  function addSearch(term) {
    const trimmed = (term || '').trim();
    if (!trimmed) return;

    // Remove existing duplicate
    const filtered = recentSearches.value.filter(t => t !== trimmed);
    // Add to front
    filtered.unshift(trimmed);
    // Limit to max
    recentSearches.value = filtered.slice(0, MAX_RECENT_SEARCHES);
    _save();
  }

  // Keyed to userId at construction; safe because Kolibri reloads the page on
  // account switch. Without that, this would need watch(userId, _load).
  _load();

  return {
    recentSearches,
    addSearch,
  };
}
