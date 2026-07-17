import { ref } from 'vue';
import Lockr from 'lockr';
import useRecentSearches from '../useRecentSearches';

// Lockr already handles JSON (de)serialization and corrupted-data fallback
// internally, so the mock only needs to model its get/set contract.
const mockStore = {};
jest.mock('lockr', () => ({
  get: jest.fn((key, missing) => (key in mockStore ? mockStore[key] : missing)),
  set: jest.fn((key, value) => {
    mockStore[key] = value;
  }),
}));

describe('useRecentSearches', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(key => delete mockStore[key]);
    jest.clearAllMocks();
  });

  describe('addSearch', () => {
    it('adds a search term to recent searches', () => {
      const userId = ref('user-1');
      const { addSearch, recentSearches } = useRecentSearches(userId);
      addSearch('fractions');
      expect(recentSearches.value).toContain('fractions');
    });

    it('persists to localStorage', () => {
      const userId = ref('user-1');
      const { addSearch } = useRecentSearches(userId);
      addSearch('fractions');
      expect(Lockr.set).toHaveBeenCalled();
    });

    it('does not add duplicate terms', () => {
      const userId = ref('user-1');
      const { addSearch, recentSearches } = useRecentSearches(userId);
      addSearch('fractions');
      addSearch('fractions');
      const count = recentSearches.value.filter(t => t === 'fractions').length;
      expect(count).toBe(1);
    });

    it('moves duplicate to front of list', () => {
      const userId = ref('user-1');
      const { addSearch, recentSearches } = useRecentSearches(userId);
      addSearch('fractions');
      addSearch('algebra');
      addSearch('fractions');
      expect(recentSearches.value[0]).toBe('fractions');
    });

    it('does not add empty strings', () => {
      const userId = ref('user-1');
      const { addSearch, recentSearches } = useRecentSearches(userId);
      addSearch('');
      expect(recentSearches.value.length).toBe(0);
    });

    it('trims whitespace', () => {
      const userId = ref('user-1');
      const { addSearch, recentSearches } = useRecentSearches(userId);
      addSearch('  fractions  ');
      expect(recentSearches.value[0]).toBe('fractions');
    });
  });

  describe('max items', () => {
    it('limits to 10 recent searches', () => {
      const userId = ref('user-1');
      const { addSearch, recentSearches } = useRecentSearches(userId);
      for (let i = 0; i < 15; i++) {
        addSearch(`search-${i}`);
      }
      expect(recentSearches.value.length).toBe(10);
    });

    it('removes oldest when limit exceeded', () => {
      const userId = ref('user-1');
      const { addSearch, recentSearches } = useRecentSearches(userId);
      for (let i = 0; i < 12; i++) {
        addSearch(`search-${i}`);
      }
      // Oldest (search-0, search-1) should be gone
      expect(recentSearches.value).not.toContain('search-0');
      expect(recentSearches.value).not.toContain('search-1');
      // Newest should be first
      expect(recentSearches.value[0]).toBe('search-11');
    });
  });

  describe('user scoping', () => {
    it('isolates persisted searches across separate instances', () => {
      useRecentSearches(ref('user-1')).addSearch('fractions');

      // A fresh instance for a different user must not surface user-1's searches
      const user2 = useRecentSearches(ref('user-2'));
      expect(user2.recentSearches.value).not.toContain('fractions');
      user2.addSearch('algebra');

      // A fresh instance for user-1 reloads exactly their own persisted searches
      const user1Reopened = useRecentSearches(ref('user-1'));
      expect(user1Reopened.recentSearches.value).toContain('fractions');
      expect(user1Reopened.recentSearches.value).not.toContain('algebra');
    });
  });

  describe('loading from localStorage', () => {
    it('loads existing searches on init', () => {
      const userId = ref('user-1');
      mockStore['recentSearches_user-1'] = ['old-search'];
      const { recentSearches } = useRecentSearches(userId);
      expect(recentSearches.value).toContain('old-search');
    });

    it('falls back to an empty list when nothing is stored', () => {
      const userId = ref('user-1');
      const { recentSearches } = useRecentSearches(userId);
      expect(recentSearches.value).toEqual([]);
    });

    it('discards a stored array whose elements are not strings', () => {
      const userId = ref('user-1');
      // A non-string element here would later throw in addSearch's
      // `.trim()` call if a consumer selected it as a search term.
      mockStore['recentSearches_user-1'] = [1, 2, 3];
      const { recentSearches } = useRecentSearches(userId);
      expect(recentSearches.value).toEqual([]);
    });
  });
});
